import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("mobile order transaction, permissions, prices, retry and quote lifecycle", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
      grant usage on schema auth,public to service_role;`);
    const schema = (
      await readFile(new URL("../supabase/schema.sql", import.meta.url), "utf8")
    ).replace('create extension if not exists "pgcrypto";', "");
    await db.exec(schema);
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/20260909232335_customer_mobile_orders.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    const user = "10000000-0000-4000-8000-000000000001",
      other = "10000000-0000-4000-8000-000000000002",
      product = "20000000-0000-4000-8000-000000000001",
      variant = "30000000-0000-4000-8000-000000000001";
    await db.query(
      `insert into auth.users values ($1,'buyer@example.com',now()),($2,'other@example.com',now())`,
      [user, other],
    );
    await db.query(
      `insert into products(id,name,slug) values($1,'Rubber','rubber')`,
      [product],
    );
    await db.query(
      `insert into product_variants(id,product_id,sku,unit,price) values($1,$2,'R-1','sheet',8.50)`,
      [variant, product],
    );
    await db.exec(`grant select on products, product_variants to service_role`);
    const items = [{ variantId: variant, quantity: 3, unitPrice: 8.5 }];
    const submit = (
      key = "request-00000001",
      list = items,
      uid = user,
      email = "buyer@example.com",
    ) =>
      db.query(`select submit_mobile_order($1,$2,$3,$4,'en') as id`, [
        uid,
        email,
        key,
        JSON.stringify(list),
      ]);
    await db.exec("set role service_role");
    await assert.rejects(submit(), /PROFILE_REQUIRED/);
    await db.query(
      `insert into mobile_customer_profiles(user_id,name,country,address) values($1,'Buyer','JP','Tokyo')`,
      [user],
    );
    const result = await submit();
    const id = result.rows[0].id;
    assert.equal(
      (await submit()).rows[0].id,
      id,
      "retry returns original order",
    );
    await assert.rejects(
      submit("request-00000001", [{ ...items[0], quantity: 4 }]),
      /KEY_REUSED/,
    );
    await assert.rejects(
      submit("request-00000002", [{ ...items[0], unitPrice: 1 }]),
      /PRICE_CHANGED/,
    );
    assert.equal(
      (await db.query("select count(*)::int as n from orders")).rows[0].n,
      1,
      "invalid price leaves no order",
    );
    assert.equal(
      Number(
        (await db.query("select unit_price from order_items")).rows[0]
          .unit_price,
      ),
      8.5,
    );
    await assert.rejects(
      submit("request-00000003", items, null, "buyer@example.com"),
      /LOGIN_REQUIRED/,
    );
    await db.query(`select manage_mobile_order($1,'quote',12)`, [id]);
    const quote = (await db.query("select * from orders where id=$1", [id]))
      .rows[0];
    assert.equal(Number(quote.grand_total), 37.5);
    assert.equal(quote.status, "quoted");
    const forbidden = await db.query(
      `update orders set status='confirmed' where id=$1 and mobile_user_id=$2 and status='quoted' returning id`,
      [id, other],
    );
    assert.equal(forbidden.rows.length, 0, "other account cannot confirm");
    await db.query(
      `update orders set status='confirmed' where id=$1 and mobile_user_id=$2 and status='quoted'`,
      [id, user],
    );
    await assert.rejects(
      db.query(`select manage_mobile_order($1,'quote',99)`, [id]),
      /unconfirmed/,
    );
    await assert.rejects(
      db.query(`select manage_mobile_order($1,'shipped',null,'','')`, [id]),
      /Invalid order transition/,
    );
    await db.query(`select manage_mobile_order($1,'processing')`, [id]);
    await db.query(
      `select manage_mobile_order($1,'shipped',null,'DHL','TRACK-123')`,
      [id],
    );
    await db.query(`select manage_mobile_order($1,'completed')`, [id]);
    assert.equal(
      (await db.query("select count(*)::int as n from mobile_order_events"))
        .rows[0].n,
      6,
    );
    await db.exec("reset role");
    await db.query("update product_variants set price=10 where id=$1", [
      variant,
    ]);
    assert.equal(
      Number(
        (await db.query("select unit_price from order_items")).rows[0]
          .unit_price,
      ),
      8.5,
      "catalog changes preserve snapshots",
    );
    await db.exec("set role anon");
    await assert.rejects(db.query("select * from orders"), /permission denied/);
    await assert.rejects(submit(), /permission denied/);
    await db.exec("reset role; set role authenticated");
    await assert.rejects(
      db.query("select * from mobile_customer_profiles"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("select * from order_items"),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
