'use client';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { WorkspaceItemRow } from '@/lib/actions/workspace';

export type TabMeta = {
  title: string;
  icon: string | null;
  iconColor: string | null;
};

export type Tab = TabMeta & {
  id: string;
  href: string;
};

type TabsContextValue = {
  tabs: Tab[];
  activeId: string | null;
  /** Resolve live meta from the workspace item list. Returns null for DB row pages. */
  resolveMeta: (href: string) => TabMeta | null;
  openInNewTab: (href: string, metaHint?: Partial<TabMeta>) => void;
  activateTab: (id: string) => void;
  closeTab: (id: string) => void;
  closeOthers: (id: string) => void;
  closeAll: () => void;
  reorderTabs: (fromId: string, toId: string) => void;
};

const TabsContext = createContext<TabsContextValue | null>(null);

/** Safe to call outside the provider (web build): returns null. */
export function useTabs(): TabsContextValue | null {
  return useContext(TabsContext);
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `tab_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

/** Strip query/hash; usePathname already omits them, but be defensive. */
function normalizePath(p: string): string {
  let s = p.split('?')[0].split('#')[0];
  if (s.length > 1 && s.endsWith('/')) s = s.slice(0, -1);
  return s;
}

/** A path that should live in a tab (content routes only). */
function isTabbable(norm: string): boolean {
  return /^\/(page|db)\//.test(norm);
}

function isRowPath(norm: string): boolean {
  return /^\/db\/[^/]+\/[^/]+$/.test(norm);
}

function cleanDocTitle(): string {
  const raw = typeof document !== 'undefined' ? document.title : '';
  return raw.replace(/\s*\|\s*Remnus\s*$/, '').trim();
}

export function TabsProvider({
  items,
  workspaceId,
  children,
}: {
  items: WorkspaceItemRow[];
  workspaceId: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const storageKey = `remnus_tabs_${workspaceId || 'default'}`;

  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Refs to read latest state inside the pathname effect without re-subscribing.
  const tabsRef = useRef(tabs);
  const activeIdRef = useRef(activeId);
  // Holds the id of a freshly-opened "new tab" placeholder whose final href is
  // resolved by the next navigation (so `+` → /app collapses into the redirect target).
  const pendingNewTabRef = useRef<string | null>(null);

  // Keep refs in sync (declared before the pathname effect so they update first).
  useEffect(() => { tabsRef.current = tabs; }, [tabs]);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  const resolveMeta = useCallback(
    (href: string): TabMeta | null => {
      const norm = normalizePath(href);
      const parts = norm.split('/').filter(Boolean); // e.g. ['db','id','pageId']
      if (parts[0] === 'page' && parts[1]) {
        const item = items.find((i) => i.id === parts[1]);
        if (item) return { title: item.title, icon: item.icon, iconColor: item.iconColor };
      } else if (parts[0] === 'db' && parts[1] && !parts[2]) {
        const item = items.find((i) => i.databaseId === parts[1]);
        if (item) return { title: item.title, icon: item.icon, iconColor: item.iconColor };
      }
      // DB row pages (/db/x/y) have no workspace item — caller falls back to the tab snapshot.
      return null;
    },
    [items],
  );

  // ── Hydrate from localStorage on mount (keyed per workspace) ──────────────
  useEffect(() => {
    let loaded: { tabs: Tab[]; activeId: string | null } | null = null;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) loaded = JSON.parse(raw);
    } catch {
      /* ignore corrupt storage */
    }

    let nextTabs: Tab[] = [];
    if (loaded?.tabs?.length) {
      // Drop tabs whose backing item was deleted (page/db only; rows can't be checked).
      nextTabs = loaded.tabs.filter((t) => {
        const norm = normalizePath(t.href);
        if (isRowPath(norm)) return true;
        return resolveMeta(t.href) !== null;
      });
    }

    const norm = normalizePath(pathname);
    if (isTabbable(norm)) {
      const existing = nextTabs.find((t) => normalizePath(t.href) === norm);
      if (existing) {
        setActiveId(existing.id);
      } else {
        const meta = resolveMeta(norm);
        const tab: Tab = {
          id: newId(),
          href: norm,
          title: meta?.title ?? cleanDocTitle() ?? '',
          icon: meta?.icon ?? null,
          iconColor: meta?.iconColor ?? null,
        };
        nextTabs = [...nextTabs, tab];
        setActiveId(tab.id);
      }
    } else if (nextTabs.length) {
      setActiveId(loaded?.activeId && nextTabs.some((t) => t.id === loaded!.activeId) ? loaded.activeId : nextTabs[0].id);
    }

    setTabs(nextTabs);
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Persist to localStorage on change ────────────────────────────────────
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ tabs, activeId }));
    } catch {
      /* ignore quota errors */
    }
  }, [tabs, activeId, hydrated, storageKey]);

  // ── Sync active tab from the current pathname ─────────────────────────────
  useEffect(() => {
    if (!hydrated) return;
    const norm = normalizePath(pathname);
    if (!isTabbable(norm)) return; // ignore /app, /login etc — don't disturb tabs

    const current = tabsRef.current;
    const pendingId = pendingNewTabRef.current;
    const meta = resolveMeta(norm);

    // A real (non-placeholder) tab already pointing at this path → activate it.
    const existing = current.find((t) => t.id !== pendingId && normalizePath(t.href) === norm);
    if (existing) {
      if (pendingId) setTabs(current.filter((t) => t.id !== pendingId)); // drop the unused placeholder
      if (existing.id !== activeIdRef.current) setActiveId(existing.id);
      pendingNewTabRef.current = null;
      return;
    }

    // A placeholder we just opened ("+" / new tab) resolves into this path.
    if (pendingId && current.some((t) => t.id === pendingId)) {
      setTabs(
        current.map((t) =>
          t.id === pendingId
            ? { ...t, href: norm, title: meta?.title ?? cleanDocTitle() ?? t.title, icon: meta?.icon ?? null, iconColor: meta?.iconColor ?? null }
            : t,
        ),
      );
      setActiveId(pendingId);
      pendingNewTabRef.current = null;
      return;
    }

    const activeTab = current.find((t) => t.id === activeIdRef.current);
    if (!activeTab) {
      const tab: Tab = {
        id: newId(),
        href: norm,
        title: meta?.title ?? cleanDocTitle() ?? '',
        icon: meta?.icon ?? null,
        iconColor: meta?.iconColor ?? null,
      };
      setTabs([...current, tab]);
      setActiveId(tab.id);
    } else {
      // Navigate-in-place: the active tab follows the new location (browser model).
      setTabs(
        current.map((t) =>
          t.id === activeTab.id
            ? { ...t, href: norm, title: meta?.title ?? cleanDocTitle() ?? t.title, icon: meta?.icon ?? null, iconColor: meta?.iconColor ?? null }
            : t,
        ),
      );
    }

  }, [pathname, hydrated, resolveMeta]);

  // ── Keep the active DB-row tab's title in sync with document.title ─────────
  useEffect(() => {
    if (!hydrated) return;
    const titleEl = document.querySelector('title');
    if (!titleEl) return;

    const sync = () => {
      const id = activeIdRef.current;
      if (!id) return;
      const tab = tabsRef.current.find((t) => t.id === id);
      if (!tab) return;
      if (!isRowPath(normalizePath(tab.href))) return; // only rows rely on document.title
      const fresh = cleanDocTitle();
      if (fresh && fresh !== tab.title) {
        setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, title: fresh } : t)));
      }
    };

    sync();
    const obs = new MutationObserver(sync);
    obs.observe(titleEl, { childList: true });
    return () => obs.disconnect();
  }, [hydrated, pathname]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const openInNewTab = useCallback(
    (href: string, metaHint?: Partial<TabMeta>) => {
      const norm = normalizePath(href);
      const existing = tabsRef.current.find((t) => normalizePath(t.href) === norm);
      if (existing) {
        setActiveId(existing.id);
        router.push(href);
        return;
      }
      const meta = isTabbable(norm) ? resolveMeta(norm) : null;
      const tab: Tab = {
        id: newId(),
        href: norm,
        title: meta?.title ?? metaHint?.title ?? '',
        icon: meta?.icon ?? metaHint?.icon ?? null,
        iconColor: meta?.iconColor ?? metaHint?.iconColor ?? null,
      };
      pendingNewTabRef.current = tab.id;
      setTabs((prev) => [...prev, tab]);
      setActiveId(tab.id);
      router.push(href);
    },
    [resolveMeta, router],
  );

  const activateTab = useCallback(
    (id: string) => {
      const tab = tabsRef.current.find((t) => t.id === id);
      if (!tab) return;
      setActiveId(id);
      router.push(tab.href);
    },
    [router],
  );

  const closeTab = useCallback(
    (id: string) => {
      const current = tabsRef.current;
      const idx = current.findIndex((t) => t.id === id);
      if (idx === -1) return;
      const next = current.filter((t) => t.id !== id);
      setTabs(next);
      if (activeIdRef.current === id) {
        const neighbor = next[idx] ?? next[idx - 1] ?? null;
        if (neighbor) {
          setActiveId(neighbor.id);
          router.push(neighbor.href);
        } else {
          setActiveId(null);
          router.push('/app');
        }
      }
    },
    [router],
  );

  const closeOthers = useCallback(
    (id: string) => {
      const keep = tabsRef.current.find((t) => t.id === id);
      if (!keep) return;
      setTabs([keep]);
      if (activeIdRef.current !== id) {
        setActiveId(id);
        router.push(keep.href);
      }
    },
    [router],
  );

  const closeAll = useCallback(() => {
    setTabs([]);
    setActiveId(null);
    router.push('/app');
  }, [router]);

  const reorderTabs = useCallback((fromId: string, toId: string) => {
    if (fromId === toId) return;
    setTabs((prev) => {
      const from = prev.findIndex((t) => t.id === fromId);
      const to = prev.findIndex((t) => t.id === toId);
      if (from === -1 || to === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  const value = useMemo<TabsContextValue>(
    () => ({
      tabs,
      activeId,
      resolveMeta,
      openInNewTab,
      activateTab,
      closeTab,
      closeOthers,
      closeAll,
      reorderTabs,
    }),
    [tabs, activeId, resolveMeta, openInNewTab, activateTab, closeTab, closeOthers, closeAll, reorderTabs],
  );

  return <TabsContext.Provider value={value}>{children}</TabsContext.Provider>;
}
