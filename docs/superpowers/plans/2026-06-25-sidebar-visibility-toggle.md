# Sidebar Visibility Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a desktop top control that hides and shows the Remnus workspace sidebar, with the preference persisted locally.

**Architecture:** Keep shell layout state in `AppShell`, where the desktop `<aside>` is rendered. Put localStorage details in a tiny helper so behavior can be tested without rendering the full app shell.

**Tech Stack:** Next.js App Router, React client components, TypeScript, TailwindCSS, lucide-react, next-intl, Node test runner with `tsx`.

## Global Constraints

- Branch is `codex/sidebar-visibility-toggle`, created from `master`.
- Do not run `npm run build`; it runs `db:seed`. Use `npx next build` for production build verification.
- Every user-facing string must use i18n and be added to all 8 `messages/*.json` files.
- Keep mobile navigation unchanged.
- Follow Remnus workspace UI style: flat, borderless, neutral backgrounds, lucide icons.
- Do not add dependencies.

---

### Task 1: Sidebar Visibility Persistence Helper

**Files:**
- Create: `src/lib/sidebarVisibility.ts`
- Create: `src/lib/sidebarVisibility.test.ts`

**Interfaces:**
- Produces: `SIDEBAR_VISIBILITY_KEY: 'remnus_sidebar_visible'`
- Produces: `readSidebarVisible(storage?: Pick<Storage, 'getItem'> | null): boolean`
- Produces: `writeSidebarVisible(visible: boolean, storage?: Pick<Storage, 'setItem'> | null): void`

- [ ] **Step 1: Write the failing test**

Create `src/lib/sidebarVisibility.test.ts`:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  SIDEBAR_VISIBILITY_KEY,
  readSidebarVisible,
  writeSidebarVisible,
} from './sidebarVisibility';

function memoryStorage(initial?: string) {
  const store = new Map<string, string>();
  if (initial !== undefined) store.set(SIDEBAR_VISIBILITY_KEY, initial);

  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    value: () => store.get(SIDEBAR_VISIBILITY_KEY),
  };
}

describe('sidebar visibility persistence', () => {
  it('defaults to visible when no preference exists', () => {
    assert.equal(readSidebarVisible(memoryStorage()), true);
  });

  it('reads a hidden preference', () => {
    assert.equal(readSidebarVisible(memoryStorage('false')), false);
  });

  it('persists visible and hidden preferences', () => {
    const storage = memoryStorage();

    writeSidebarVisible(false, storage);
    assert.equal(storage.value(), 'false');
    assert.equal(readSidebarVisible(storage), false);

    writeSidebarVisible(true, storage);
    assert.equal(storage.value(), 'true');
    assert.equal(readSidebarVisible(storage), true);
  });

  it('falls back to visible when storage is unavailable', () => {
    assert.equal(readSidebarVisible(null), true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/lib/sidebarVisibility.test.ts`

Expected: FAIL because `src/lib/sidebarVisibility.ts` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/sidebarVisibility.ts`:

```ts
type SidebarVisibilityStorage = Pick<Storage, 'getItem' | 'setItem'>;

export const SIDEBAR_VISIBILITY_KEY = 'remnus_sidebar_visible';

function resolveStorage(storage?: Pick<Storage, 'getItem'> | null): Pick<Storage, 'getItem'> | null {
  if (storage !== undefined) return storage;
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

function resolveWritableStorage(storage?: SidebarVisibilityStorage | null): SidebarVisibilityStorage | null {
  if (storage !== undefined) return storage;
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

export function readSidebarVisible(storage?: Pick<Storage, 'getItem'> | null): boolean {
  try {
    return resolveStorage(storage)?.getItem(SIDEBAR_VISIBILITY_KEY) !== 'false';
  } catch {
    return true;
  }
}

export function writeSidebarVisible(visible: boolean, storage?: SidebarVisibilityStorage | null): void {
  try {
    resolveWritableStorage(storage)?.setItem(SIDEBAR_VISIBILITY_KEY, visible ? 'true' : 'false');
  } catch {
    // Ignore storage failures; the caller's React state still updates.
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/lib/sidebarVisibility.test.ts`

Expected: PASS.

---

### Task 2: AppShell Desktop Toggle

**Files:**
- Modify: `src/components/AppShell.tsx`
- Modify: `messages/en.json`
- Modify: `messages/tr.json`
- Modify: `messages/hi.json`
- Modify: `messages/es.json`
- Modify: `messages/fr.json`
- Modify: `messages/de.json`
- Modify: `messages/zh.json`
- Modify: `messages/ru.json`

**Interfaces:**
- Consumes: `readSidebarVisible()` and `writeSidebarVisible(visible)`.
- Produces: desktop-only sidebar toggle button with localized `aria-label` and `title`.

- [ ] **Step 1: Add translation keys**

Add these keys under the existing `Layout` namespace in every `messages/*.json` file:

```json
"showSidebar": "Show sidebar",
"hideSidebar": "Hide sidebar"
```

Use appropriate translations for non-English files.

- [ ] **Step 2: Update AppShell imports and state**

Modify `src/components/AppShell.tsx` imports:

```ts
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import TauriTitlebar from './features/TauriTitlebar';
import ZoomProvider from './providers/ZoomProvider';
import { TabsProvider } from './providers/TabsContext';
import { useIsTauri } from '@/lib/hooks/useIsTauri';
import { readSidebarVisible, writeSidebarVisible } from '@/lib/sidebarVisibility';
import type { WorkspaceItemRow } from '@/lib/actions/workspace';
```

Add inside `AppShell` after `const isTauri = useIsTauri();`:

```ts
  const t = useTranslations('Layout');
  const [sidebarVisible, setSidebarVisible] = useState(true);

  useEffect(() => {
    setSidebarVisible(readSidebarVisible());
  }, []);

  const toggleSidebar = () => {
    setSidebarVisible((current) => {
      const next = !current;
      writeSidebarVisible(next);
      return next;
    });
  };
```

- [ ] **Step 3: Render conditional aside and top control**

Replace the desktop aside/main block with this structure:

```tsx
        <div className="flex h-full overflow-hidden">
          {sidebarVisible && (
            <aside className="hidden lg:flex w-72 bg-neutral-900 border-r border-neutral-800 flex-col">
              {sidebar}
            </aside>
          )}
          {mobileNav}
          <main className="relative flex-1 flex flex-col h-full overflow-hidden bg-neutral-850 pb-14 lg:pb-0">
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label={sidebarVisible ? t('hideSidebar') : t('showSidebar')}
              title={sidebarVisible ? t('hideSidebar') : t('showSidebar')}
              className="hidden lg:flex absolute top-2 left-2 z-30 h-7 w-7 items-center justify-center text-neutral-500 hover:text-neutral-100 hover:bg-neutral-800/80 transition-colors"
            >
              {sidebarVisible ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
            </button>
            {/* TauriTitlebar renders the browser-style TabBar inline in its row (Tauri only). */}
            <TauriTitlebar key="tauri-titlebar" />
            {demoBanner}
            {children}
          </main>
        </div>
```

If the button overlaps first-row content during browser verification, add matching `lg:pl-8` padding only to the relevant top bar container. Do not add global page padding.

- [ ] **Step 4: Run focused test and lint**

Run:

```bash
npx tsx --test src/lib/sidebarVisibility.test.ts
npm run lint
```

Expected: both pass.

---

### Task 3: Documentation And Build Verification

**Files:**
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: implemented sidebar toggle.
- Produces: documented component inventory update for future agents.

- [ ] **Step 1: Update AGENTS.md**

In the `Project Structure` component section, add a note that `AppShell` owns the desktop sidebar visibility toggle and uses `src/lib/sidebarVisibility.ts` for localStorage persistence.

- [ ] **Step 2: Run production build without seeding**

Run:

```bash
npx next build
```

Expected: build completes successfully. Do not run `npm run build`.

- [ ] **Step 3: Verify git status**

Run:

```bash
git status --short --branch
```

Expected: branch `codex/sidebar-visibility-toggle` with only planned files modified.
