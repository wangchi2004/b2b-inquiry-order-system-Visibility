'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

type Status = 'loading' | 'ready' | 'guest' | 'error';
type FavoritesContextValue = {
  ids: string[]; status: Status; pending: Set<string>;
  reload: () => Promise<void>;
  toggle: (id: string, locale: string) => Promise<string | null>;
};
const FavoritesContext = createContext<FavoritesContextValue | null>(null);
const SYNC_KEY = 'favorites-changed';
export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ids, setIds] = useState<string[]>([]);
  const idsRef = useRef<string[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [pending, setPending] = useState<Set<string>>(new Set());
  const fetching = useRef(false);
  const locks = useRef(new Set<string>());
  const generation = useRef(0);
  const accountEpoch = useRef(0);
  const reload = useCallback(async () => {
    if (locks.current.size || fetching.current) return;
    fetching.current=true;
    const version = ++generation.current;
    try {
      const res = await fetch('/api/favorites', { cache: 'no-store', signal: AbortSignal.timeout(10000) });
      if (version !== generation.current) return;
      if (res.status === 401) { idsRef.current = []; setIds([]); setStatus('guest'); return; }
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (version !== generation.current) return;
      idsRef.current = data.ids; setIds(data.ids); setStatus('ready');
    } catch { if (version === generation.current) setStatus('error'); } finally { fetching.current=false; }
  }, []);
  useEffect(() => {
    const sequence = generation;
    let active = true;
    queueMicrotask(() => { if (active) void reload(); });
    const changed = () => { void reload(); };
    const storage = (event: StorageEvent) => { if (event.key === 'account-session-sync') sessionChanged(); else if (event.key === SYNC_KEY) changed(); };
    const timer=window.setInterval(()=>{if(document.visibilityState!=='hidden')changed();},5000);
    const visibility=()=>{if(document.visibilityState==='visible')changed();};
    document.addEventListener('visibilitychange',visibility);
    window.addEventListener('focus', changed);
    window.addEventListener('storage', storage);
    const sessionChanged = () => {
      ++accountEpoch.current; ++generation.current;
      idsRef.current = []; setIds([]); setStatus('loading');
      void reload();
    };
    window.addEventListener('account-session-changed', sessionChanged);
    return () => {
      window.clearInterval(timer);
      active = false;
      ++sequence.current;
      document.removeEventListener('visibilitychange',visibility);
      window.removeEventListener('focus', changed);
      window.removeEventListener('storage', storage);
      window.removeEventListener('account-session-changed', sessionChanged);
    };
  }, [pathname, reload]);
  async function toggle(id: string, locale: string) {
    if (status === 'guest') { router.push(`/${locale}/account`); return null; }
    if (status !== 'ready') { await reload(); return 'Please retry / 请重试'; }
    if (locks.current.has(id)) return null;
    locks.current.add(id); setPending(new Set(locks.current));
    ++generation.current;
    const epoch = accountEpoch.current;
    const saved = idsRef.current.includes(id);
    try {
      const res = await fetch('/api/favorites', { method: saved ? 'DELETE' : 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: id }) });
      if (epoch !== accountEpoch.current) return null;
      if (res.status === 401) {
        idsRef.current = []; setIds([]); setStatus('guest');
        router.push(`/${locale}/account`); return null;
      }
      if (!res.ok) return res.status === 404 ? 'Product no longer available / 商品已下架' : 'Could not save favorites. Please retry. / 收藏保存失败，请重试。';
      idsRef.current = saved ? idsRef.current.filter(item => item !== id) : [id, ...idsRef.current.filter(item => item !== id)];
      setIds(idsRef.current);
      try { localStorage.setItem(SYNC_KEY, String(Date.now())); } catch { /* Sync does not require browser storage. */ }
      return null;
    } catch { return 'Could not save favorites. Please retry. / 收藏保存失败，请重试。'; }
    finally {
      locks.current.delete(id); setPending(new Set(locks.current));
      if (epoch !== accountEpoch.current && !locks.current.size) void reload();
    }
  }
  return <FavoritesContext.Provider value={{ ids, status, pending, reload, toggle }}>{children}</FavoritesContext.Provider>;
}
export function useFavorites() {
  const value = useContext(FavoritesContext);
  if (!value) throw new Error('FavoritesProvider required');
  return value;
}
