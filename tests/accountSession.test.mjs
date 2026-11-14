import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renewAccountCookies, sessionCookies, clearedAccountCookies, ACCOUNT_COOKIE, ACCOUNT_REFRESH_COOKIE, REMEMBER_SECONDS } from '../src/lib/accountCookies.ts';
const user = { email_confirmed_at: '2026-01-01', is_anonymous: false };
const session = { access_token: 'new-access', refresh_token: 'rotated-refresh', expires_in: 3600 };
const never = async () => { throw Error('Unexpected auth call'); };

test('remembered login survives expired access and rotates both credentials', async () => {
  const result = await renewAccountCookies(undefined, 'saved-refresh', {
    getUser: never,
    refreshSession: async ({ refresh_token }) => {
      assert.equal(refresh_token, 'saved-refresh');
      return { data: { user, session }, error: null };
    },
  });
  assert.equal(result.find(c => c.name === ACCOUNT_COOKIE).value, 'new-access');
  assert.equal(result.find(c => c.name === ACCOUNT_REFRESH_COOKIE).value, 'rotated-refresh');
  assert.equal(result[1].maxAge, 90 * 24 * 60 * 60);
  assert.ok(result.every(c => c.httpOnly && c.sameSite === 'lax' && c.path === '/'));
});
test('expired access still present is refreshed; valid access is reused', async () => {
  const result = await renewAccountCookies('expired', 'saved', {
    getUser: async () => ({ data: { user: null }, error: { status: 401 } }),
    refreshSession: async () => ({ data: { user, session }, error: null }),
  });
  assert.equal(result.length, 2);
  assert.deepEqual(await renewAccountCookies('valid', 'saved', {
    getUser: async () => ({ data: { user }, error: null }), refreshSession: never,
  }), []);
});
test('guests do not refresh; revoked sessions clear both cookies', async () => {
  assert.deepEqual(await renewAccountCookies(undefined, undefined, { getUser: never, refreshSession: never }), []);
  const result = await renewAccountCookies(undefined, 'revoked', {
    getUser: never,
    refreshSession: async () => ({ data: { user: null, session: null }, error: { status: 400 } }),
  });
  assert.deepEqual(result, clearedAccountCookies());
  assert.ok(result.every(c => c.maxAge === 0 && c.value === ''));
});
test('provider outages and rate limiting preserve remembered login', async () => {
  for (const status of [500, 429]) {
    assert.deepEqual(await renewAccountCookies(undefined, 'saved', {
      getUser: never,
      refreshSession: async () => ({ data: { session: null, user: null }, error: { status } }),
    }), []);
  }
});
test('unverified or anonymous users never receive renewed credentials', async () => {
  for (const invalid of [{ ...user, email_confirmed_at: null }, { ...user, is_anonymous: true }]) {
    assert.deepEqual(await renewAccountCookies(undefined, 'saved', {
      getUser: never,
      refreshSession: async () => ({ data: { user: invalid, session }, error: null }),
    }), clearedAccountCookies());
  }
  assert.equal(sessionCookies(session)[1].maxAge, REMEMBER_SECONDS);
});
