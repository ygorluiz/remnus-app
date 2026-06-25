# Remnus Handoff

Last updated: 2026-06-25 America/Phoenix

## Workspace

- Local path: `/Users/Alex/Stuff/AI Projects/Remnus`
- Repo: `https://github.com/Ranork/remnus-app.git`
- Branch: `codex/sidebar-visibility-toggle`
- Base: `master`

## Current Work

Refined the desktop workspace sidebar visibility behavior.

- Latest commit subject: `fix(sidebar): refine visibility toggle behavior`
- PR target: `master`

Behavior now covered by the branch:

- Desktop sidebar hide control lives inside the sidebar header next to the language/flag switcher.
- The sidebar header no longer uses `data-tauri-drag-region`, so header buttons remain clickable in the Tauri shell.
- When hidden, the restore icon appears in the main canvas.
- If the demo mode banner is present, the restore icon is offset below it; otherwise it stays at the top.
- Sidebar hide/show animates on desktop by keeping the sidebar mounted and transitioning width/opacity/translate.
- The collapsed sidebar is `pointer-events-none`, so it does not block canvas clicks.
- Mobile navigation is unchanged.
- Visibility preference persists in `localStorage['remnus_sidebar_visible']`.
- Local-network Next dev usage can opt into LAN dev origins through `NEXT_ALLOWED_DEV_ORIGINS`.

Files changed by the current commit:

- `next.config.ts`
- `src/components/AppShell.tsx`
- `src/components/features/WorkspaceSidebar.tsx`
- `src/lib/sidebarVisibility.ts`
- `src/lib/sidebarVisibility.test.ts`
- `src/lib/nextDevOrigins.ts`
- `src/lib/nextDevOrigins.test.ts`
- `HANDOFF.md`

No i18n files were changed for this refinement. Existing `Layout.showSidebar` and `Layout.hideSidebar` strings are reused.

## Running Locally

The dev server is currently intended to run on port `3000`, bound to the local network.

- Local URL: `http://localhost:3000`
- LAN URL: `http://172.16.3.4:3000`
- Command:

```bash
NEXT_ALLOWED_DEV_ORIGINS=172.16.3.4 npm run dev -- --hostname 0.0.0.0 --port 3000
```

`NEXT_ALLOWED_DEV_ORIGINS` is needed when using the LAN URL with the Next.js dev server; otherwise Next blocks dev-only resources such as HMR from `172.16.3.4`.

## Verification

Passed:

```bash
npx tsx --test src/lib/sidebarVisibility.test.ts
npx tsx --test src/lib/sidebarVisibility.test.ts src/lib/nextDevOrigins.test.ts
npx tsc --noEmit --pretty false
curl -I -sS http://172.16.3.4:3000/app
```

Observed:

- `sidebarVisibility.test.ts` passed 9/9.
- Combined sidebar/dev-origin tests passed 10/10 after `HANDOFF.md` was updated.
- TypeScript no-emit exited cleanly.
- LAN `/app` responds with the expected unauthenticated redirect to `/login`.
- After restarting with `NEXT_ALLOWED_DEV_ORIGINS=172.16.3.4`, the server log no longer showed the previous Next cross-origin dev-resource block for the LAN request.

Not rerun for this final docs-only amend:

- Full `npm run lint`, because the repository has pre-existing lint failures unrelated to this branch.
- Full `npm run build`, because this repo's `build` script runs database migrations and seed scripts.

## Local Working Tree Notes

Unrelated local changes remain intentionally unstaged and out of the PR:

- `src/db/migrations/0016_agent_edit_stamp.sql`

Local-only untracked handoff state was added to the amended sidebar commit as requested.

## Rules Checked

- Read `AGENTS.md` project instructions.
- Read `.github/pull_request_template.md`.
- Read Next.js `allowedDevOrigins` docs from `node_modules/next/dist/docs/`.
- No new user-facing text keys were introduced.
- No database tables/routes/server actions/architectural patterns were added, so `AGENTS.md` did not require a source-map update for this change.
