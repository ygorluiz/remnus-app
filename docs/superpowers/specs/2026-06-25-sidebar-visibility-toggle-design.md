# Sidebar Visibility Toggle Design

## Goal

Add a desktop app-shell control that lets users hide and show the workspace sidebar from the top of the app, while preserving the existing mobile bottom-sheet navigation.

## Context

Remnus renders the authenticated shell through `src/components/AppShell.tsx`. The desktop sidebar is passed into `AppShell` as a `sidebar` React node and displayed in a fixed-width `<aside>`. Mobile navigation is separate in `MobileNavWrapper`, so this feature should not change mobile behavior.

The project contribution rules require user-facing strings to be localized in all 8 `messages/*.json` files. UI should match Remnus' flat, borderless workspace aesthetic.

## Design

The toggle lives in `AppShell`, because `AppShell` owns the layout width and can remove or restore the desktop `<aside>` without coupling `WorkspaceSidebar` to shell state. The control is a small icon-only button at the top-left edge of the content area on desktop screens:

- When the sidebar is visible, show a `PanelLeftClose` icon and a localized "Hide sidebar" accessible label.
- When the sidebar is hidden, show a `PanelLeftOpen` icon and a localized "Show sidebar" accessible label.
- Persist the preference in `localStorage` using `remnus_sidebar_visible`.
- Default to visible.
- Keep the control hidden on mobile because mobile already uses the bottom nav and workspace sheet.

## Components And Data Flow

- `src/lib/sidebarVisibility.ts` owns the storage key and read/write helpers. It handles missing `window`/`localStorage` safely for SSR and tests.
- `src/components/AppShell.tsx` owns `sidebarVisible` state, initializes from the helper after mount, writes preference on toggle, conditionally renders the desktop `<aside>`, and renders the top-left icon button.
- `messages/{locale}.json` receives two `Layout` keys: `showSidebar` and `hideSidebar`.
- `AGENTS.md` is updated to document the AppShell sidebar visibility helper and control.

## Error Handling

If localStorage is unavailable or throws, the app keeps the sidebar visible and ignores persistence errors. The toggle still works for the current session if state can update.

## Testing

Use a test-first cycle around the storage helper with Node's built-in test runner via `tsx`. Then verify:

- The helper defaults to visible and persists false/true values.
- `npm run lint` passes.
- `npx next build` passes without running `npm run build`, because `npm run build` also seeds docs/blog data.
