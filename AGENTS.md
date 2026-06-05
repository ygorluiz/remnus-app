<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# Keeping This File Up to Date

**Every agent that makes structural changes to the project MUST update this file before finishing.**
Structural changes include: adding/removing tables, adding routes, adding/removing components, adding server actions, or changing architectural patterns.
If you skip this step, future agents will work from a stale map and make mistakes.

## Serena Memory Sync

Serena is an MCP code-intelligence assistant with its own persistent memory. Its memories must be kept in sync with this file.

**After updating AGENTS.md, also sync Serena:**

1. Activate the project: call `mcp__plugin_serena_serena__activate_project` with `"remnus-app"`.
2. List existing memories: call `mcp__plugin_serena_serena__list_memories` to see what needs updating.
3. Edit stale entries: call `mcp__plugin_serena_serena__edit_memory` for any memory whose content no longer matches AGENTS.md.

**Key memories to check:**

- `conventions` — i18n namespace list and count, coding rules
- `core` — source map, DB tables, component inventory

Do NOT create new Serena memories for every change — prefer editing existing ones. Only create a new memory if it covers a clearly standalone domain not already tracked.

---

# Project Details: Remnus

**Remnus** is a Notion-like application built around a **workspace** model. Users can create standalone pages (title + markdown) and customizable databases (dynamic columns, table/kanban/calendar views) — both living side by side in a unified sidebar. Each database row is also a page with markdown content.

## i18n & Localization

Remnus is fully internationalized using **next-intl v4** (App Router native). All user-facing text is loaded from translation files — **no hardcoded strings in components**.

### Supported Languages

| Code | Language          |
| ---- | ----------------- |
| `en` | English (default) |
| `tr` | Türkçe            |
| `hi` | हिन्दी            |
| `es` | Español           |
| `fr` | Français          |
| `de` | Deutsch           |

### Locale Resolution (priority order)

1. `NEXT_LOCALE` cookie (user picks via `LanguageSwitcher`, 1-year expiry)
2. `Accept-Language` header (auto OS language detection via `negotiator` + `@formatjs/intl-localematcher`)
3. `en` fallback

**Clean URLs:** `localePrefix: 'never'` — URLs stay as `/db/123`, never `/en/db/123`. All pages live under `src/app/[locale]/`.

**Translation files:** `messages/{locale}.json` — `en.json` is the source of truth. **19 namespaces:** `Layout`, `Home`, `Auth`, `Workspace`, `WorkspaceSettings`, `Templates`, `Database`, `Editor`, `Page`, `IconPicker`, `Admin`, `Errors`, `LanguageSwitcher`, `MobileNav`, `Landing`, `Pricing`, `Contact`, `Download`, `Sharing`.

### Rules for All Future Development

**Every new component or server action that surfaces user-facing text MUST follow these rules:**

1. **Client components** — `import { useTranslations } from 'next-intl'` and call `useTranslations('Namespace')` inside the component body.
2. **Server components / layouts** — `import { getTranslations } from 'next-intl/server'` and `await getTranslations('Namespace')`.
3. **Server actions** — same as above; use `getTranslations('Errors')` for error messages returned to the client.
4. **Add all new keys to ALL 6 files** before committing. Missing keys fall back to the key name.
5. **No hardcoded display strings** — not even English fallbacks like `|| 'Untitled'`. Always use `t('key')`.
6. **Date formatting** — use `useLocale()` (client) or locale from `getRequestConfig` (server) instead of `'en-US'`.
7. **Namespace selection** — pick the closest existing namespace. Create a new one only for a clearly standalone domain (add to all 6 files and document here).

### Agent Task Management & Work Plan

When working on project tasks, agents MUST use the **remnus-mcp** server to interact with the **Work Plan** database:
1. **Querying Tasks:** Retrieve pending tasks (e.g. Sprint-specific) from the "Work Plan" database using the `query_database` tool (optionally listing all rows and filtering in memory if database query filters fail).
2. **Updating Status:** When starting a task, update its status to `In Progress` (if applicable), and when completed, update its status to `Done` in the database via the `update_page` tool.
3. **Writing Task Outputs:** Upon task completion, write a detailed markdown summary of the changes made, files modified, and test outcomes directly into the task's page content in the database using the `update_page` tool.

## Color Theme

| Role                | Hex       | Tailwind token |
| ------------------- | --------- | -------------- |
| Main canvas bg      | `#1d1f23` | `neutral-950`  |
| Sidebar / card bg   | `#21252b` | `neutral-900`  |
| Content canvas bg   | `#282c34` | `neutral-850`  |
| Borders / dividers  | `#383b41` | `neutral-800`  |
| Silver text         | `#cccccc` | `neutral-100`  |
| Muted text          | `#d7dae0` | `neutral-50`   |
| Primary / accent    | `#445c95` | `blue-500`     |
| Destructive         | `#cd4d55` | `red-400`      |
| Success             | `#7fc36d` | `green-400`    |
| Warning             | `#cc7d45` | `amber-500`    |

Tokens defined via `@theme` overrides in `src/app/globals.css`.

## UI & Design Aesthetics

- **Flat and borderless:** Settings panels, drawers, sidebars — always `rounded-none`, no shadows.
- **Three-tier background:** `neutral-950` body frame → `neutral-900` sidebars/floating panels → `neutral-850` content/canvas. Separate with a single `border-neutral-800` line.
- **Flat-Line Separators:** Use `border-b border-neutral-850` + `hover:bg-neutral-800/10` rows instead of cards.
- **Auth Pages Exception:** `/login` and `/register` use `rounded-xl` cards and `rounded-lg` inputs. Do not apply this style inside the workspace.

## Technology Stack

- **Framework:** Next.js 15 (App Router)
- **Styling:** TailwindCSS, Lucide React icons
- **Database:** SQLite (`file:local.db`), Turso/Serverless compatible target.
- **ORM & Driver:** Drizzle ORM + `@libsql/client`.
- **Image Uploads:** Cloudinary (`cloudinary` npm). Upload API at `POST /api/upload`. Env vars: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. Images stored in `remnus/icons/` folder, auto-resized to 256×256.
- **Auth:** Auth.js v5 (`next-auth@beta`) + `@auth/drizzle-adapter` + `bcryptjs`.
- **Desktop:** Tauri v2 (Rust shell, loads `remnus.com` in system WebView).
- **Mobile:** Capacitor v8 (iOS + Android, loads `remnus.com` via `server.url`).
- **PWA:** `@ducanh2912/next-pwa` (Workbox service worker, `public/manifest.json`).

## Architecture & Conventions

### Database Tables

We use the **JSON Column Pattern** (not EAV) for dynamic user-defined properties:

| Table | Purpose |
| ----- | ------- |
| `workspaces` | Workspace list — `icon` (emoji/lucide/https URL), `icon_color` |
| `workspace_items` | Sidebar items (pages + databases), recursive `parent_id` nesting |
| `standalone_pages` | Markdown content for page-type items (1:1 with `workspace_items`) |
| `databases` | `schema` JSON (columns) + `views` JSON (named view configs) |
| `pages` | Database rows — `properties` JSON + `title`, `content`, `icon`, `icon_color`, `agent_edited_at` + `agent_token_id` (nullable; stamped on MCP writes) |
| `user` | Auth.js accounts — `role` ('user'\|'admin'\|'demo'), `password_hash` |
| `account` | OAuth provider links (Google) |
| `session` | Auth.js sessions |
| `verificationToken` | Email verification |
| `workspace_members` | User↔Workspace join — `role` ('owner'\|'member'\|'viewer') |
| `agent_tokens` | MCP bearer tokens — `token_prefix`, `token_hash`, `scope` ('read'\|'write'), `expires_at` (nullable, null = no expiry), `revoked_at` |
| `uploaded_assets` | One row per Cloudinary upload — `public_id`, `resource_type`, `kind` ('icon'\|'image'\|'file'), `bytes`, `url`, `user_id`, `workspace_id` (nullable). Powers reliable Cloudinary cleanup on delete + storage-usage accounting per user/workspace (future plan limits). |
| `agent_activity` | Audit log for every MCP tool call |
| `shared_pages` | Public page sharing — `slug` (unique; UUID for regular users, custom path for admins e.g. `docs/mcp`), `page_id`, `workspace_id`, `permission` ('read'\|'write'), `width` ('narrow'\|'wide'\|'full', default 'narrow'), `in_sitemap` (boolean, default false — admin-only, cascades to children), `created_by`. Powers `/share/[...slug]` public route. Migrations: `0020` (initial), `0021` (width), `0022` (in_sitemap). |
| `client_auth_tokens` | Short-lived desktop OAuth tokens — `device_id` (PK), `token` (JWT), `expires_at` (5 min TTL). DB-backed; safe for multi-instance deployments. |
| `user_sessions` | Engagement / time-in-app tracking — `user_id`, `started_at`, `last_seen_at`, `duration_seconds`. Extended by the `/api/activity/ping` heartbeat (`ActivityTracker`); a new row opens after a 2-min inactivity gap. Powers admin engagement stats. |

### Auth System

- **Auth System:** Supports Google and GitHub OAuth providers. Email/password login and register pages have been removed.
- **Config split:** `src/auth.config.ts` (edge-safe, no DB, middleware only) + `src/auth.ts` (full, server components/actions).
- **Session access:** Always use `getCurrentUser()` from `src/lib/auth/session.ts` in server actions — **never** `auth()` directly. It is `React.cache`-wrapped to run at most once per request.
- **createdAt gotcha:** DrizzleAdapter stores `CURRENT_TIMESTAMP` as text (breaks Drizzle timestamp parsing). All `workspaces` and `workspace_members` inserts pass explicit `createdAt: new Date()`. The `createUser` event also force-updates OAuth users immediately after row creation.
- **First-user bootstrap:** The very first non-demo user (any provider) is auto-promoted to `admin` and added as owner to all memberless workspaces.
- **Demo mode:** `demo@remnus.com` (role `demo`) — `loginAsDemo()` resets + reseeds then signs in. Requires at least one real user to exist first.
- **Access control:** All actions call `assertWorkspaceAccess(workspaceId)` or `assertDatabaseAccess(databaseId)` before executing. Unauthorized → throws; unauthenticated → `redirect('/login')`.
- **Env vars:** `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`.

### Performance Rules

- **No query waterfalls:** Fetch independent sources with `Promise.all`.
- **Revalidation:** Call `revalidatePath('/')` only for sidebar-structural mutations (create/delete items, workspace rename/delete). Content saves (`updatePageContent`, `updatePageProperties`) must NOT call revalidatePath.
- **Optimistic UI:** `WorkspaceSidebar` applies mutations to local state immediately; server revalidation is background.
- **SQLite PRAGMAs:** WAL mode, `synchronous=NORMAL`, `foreign_keys=ON`, `cache_size=-20000`, `temp_store=MEMORY` applied at startup in `src/db/index.ts`.
- **Idle Polling Convention:** Automatic background content refreshing via `useWorkspaceEvents()` is configured to only run when the user is inactive (idle) for at least 10 seconds. Active user interactions (keyboard, mouse, touches, scrolling) pause automatic polling to avoid jarring layout/focus resets during data entry.
- **Manual Refresh:** Pages (Databases and Standalone Pages) have a dedicated, localized refresh/sync button in the upper header bar next to the width settings to allow on-demand synchronization when the user is actively working.

### Migration Notes

- New migration `when` values must be **greater than** all existing values. Last journaled: `0016` → `1780700000000`. Reserve `0018_user_sessions` → `1780800000000`, `0019_uploaded_assets` → `1780900000000`, `0020_shared_pages` → `1781000000000`. **Next migration: `when` > `1781200000000`.**
- `0018_user_sessions`, `0019_uploaded_assets` (and `0017`) are NOT in `_journal.json` — applied manually via direct DDL due to the libsql `batch()` caveat below. Apply `user_sessions` with `npx tsx src/db/apply-0018-user-sessions.ts`, `uploaded_assets` with `npx tsx src/db/apply-0019-uploaded-assets.ts` (both idempotent).
- `0020_shared_pages`, `0021_shared_pages_width`, `0022_shared_pages_sitemap` — also manually applied. Scripts: `src/db/apply-002{0,1,2}-*.ts`. Apply to both local and Turso.
- **Two databases / env precedence gotcha:** `.env` has the **Turso** `DATABASE_URL`; `.env.local` overrides it with `file:local.db`. Next.js (dev) uses `.env.local` → **local.db**, but the apply scripts call `dotenv.config()` which reads only `.env` → **Turso**. So a plain `npx tsx src/db/apply-00xx-*.ts` migrates Turso only; for local dev also run it with an explicit override: `DATABASE_URL="file:local.db" npx tsx src/db/apply-00xx-*.ts`. Apply every manual migration to **both**.
- **libsql DDL caveat:** Drizzle's `migrate()` runs SQL in a `batch()` call. libsql's `batch()` silently fails DDL statements (ALTER TABLE, CREATE TABLE, etc.) — the call returns "complete" but changes are not applied. Use `client.execute()` directly for DDL, or manually apply + insert into `__drizzle_migrations` via a helper script. Migration 0016 was applied this way.
- Apply with: `npx tsx src/db/migrate.ts`

### Project Structure

**Auth & middleware**
- `src/auth.config.ts` — Edge-compatible config (middleware only, no DB import). `/client-login` is handled specially: logged-in users with a `device_id` param are redirected straight to `/api/auth/client-bridge?device_id=…`; without a `device_id` they go to `/app`.
- `src/auth.ts` — Full config: DrizzleAdapter, `client-token` credentials provider (desktop OAuth), JWT callbacks, first-user bootstrap event.
- `src/proxy.ts` — Protects all routes (Next.js 16 proxy, replaces `middleware.ts`); whitelists `/login`, `/client-login`, `/tauri-app`, `/api/auth/*`, `/api/auth/client-activate`, `/api/mcp`, static assets, `/`, `/pricing`, `/contact`, `/download`, `/share/`. Matcher explicitly excludes `sitemap.xml` and `robots.txt` so Next.js metadata routes bypass the intl middleware entirely.
- `src/lib/auth/session.ts` — `getCurrentUser()` — `React.cache`-wrapped `auth()`. Use this everywhere in server actions.

**Root app files (`src/app/`)**
- `layout.tsx` — True root layout. Renders `<html lang={locale}>` + `<body>` with Geist/GeistMono/InstrumentSerif font CSS variables. Reads locale from `NEXT_LOCALE` cookie (falls back to `'en'`). Defines `export const viewport`. **All other layouts must NOT render `<html>`/`<body>`.**
- `sitemap.ts` — **Async.** Generates `/sitemap.xml`. Lists 5 static public URLs + all `shared_pages` where `in_sitemap = true` (admin-opted, priority 0.7). Child pages of sitemap-included parents are automatically included via `updateShare` cascade — no manual per-child toggle needed.
- `robots.ts` — Generates `/robots.txt`. Allows public marketing paths + `/share/`; disallows `/app`, `/db/`, `/page/`, `/admin/`, `/api/`, `/login`.

**Routes (`src/app/[locale]/`)**
- `layout.tsx` — Locale validation, `NextIntlClientProvider`, session check, sidebar + mobile nav render. Does NOT render `<html>`/`<body>` (those live in root layout); returns a React Fragment with providers. Exports `metadata` (global title template + OG/Twitter tags).
- `page.tsx` — Landing page; redirects authed users to `/app`, otherwise renders `LandingBridgeSwitcher`. Exports `metadata` with `title.absolute`, landing-specific description, `alternates.canonical: 'https://remnus.com'`, and hreflang for all 6 supported locales (all point to same URL — `localePrefix: 'never'` constraint).
- `app/page.tsx` — Authenticated redirect gateway → first workspace item or `/login`.
- `login/page.tsx` — Google + GitHub OAuth login. In Tauri mode, renders a minimal UI (logo + "Sign in" button); on click generates a UUID `device_id`, opens `client-login?device_id=<uuid>` in the system browser, then polls `/api/auth/client-poll` every 2 s until a token arrives.
- `client-login/page.tsx` — Public. Full login page (Google + GitHub) opened in the system browser by Tauri. Reads `device_id` from URL search params and threads it through both auth paths so `/api/auth/client-bridge` can store the resulting token keyed by that id.
- `tauri-app/page.tsx` — Public entry for Tauri (`tauri.conf.json` devUrl/url). Sets `localStorage.platform=tauri`, auto-detects OS locale, redirects to `/app`.
- `db/[id]/page.tsx` — Database view (Table / Kanban / Calendar).
- `db/[id]/[pageId]/page.tsx` — Database row page editor.
- `page/[itemId]/page.tsx` — Standalone page editor.
- `pricing/page.tsx` — Public pricing (MarketingShell-wrapped). Exports page-specific `metadata` with canonical URL.
- `contact/page.tsx` — Public contact (MarketingShell-wrapped). Exports page-specific `metadata` with canonical URL.
- `download/page.tsx` — Public desktop download page (MarketingShell-wrapped). Renders `DownloadView` with static `releases/latest/download/<stable-name>` links. Exports page-specific `metadata` with canonical URL.
- `privacy/page.tsx` — Public privacy page (MarketingShell-wrapped). Exports page-specific `metadata` with canonical URL.
- `share/[...slug]/page.tsx` — **Public** (no auth). Resolves `slug` (joined `/`-separated path parts) via `getShareBySlug`. **Workspace members are redirected** to the real `/page/[id]` or `/db/[id]` route instead of seeing the shared view. Fetches `shareMap` (pageId→slug for all workspace shares) and builds `navTree` (shared pages tree for sidebar). Passes `parentSlug` (parent's share slug if parent is also shared). Renders `SharedPageView`.
- `src/lib/server/sharing-internals.ts` — **Server-only** (no `'use server'` — NOT a server action endpoint). `import 'server-only'`. Contains `getShareMapForWorkspace(workspaceId)` and `checkUserHasWorkspaceAccess(userId, workspaceId)`. Imported directly by server components only. NEVER import from a `'use server'` file (IDOR risk).
- `admin/page.tsx` — Admin dashboard: engagement + acquisition stat cards (total users, new this week/month, active users, avg session, total time), a 30-day signup-trend mini bar chart, and the users table. Fetches `getAllUsers()` + `getEngagementOverview()`. The standalone workspaces table was removed — workspaces now live in `AdminUserDetailModal`.
- `admin/workspaces/page.tsx` — Legacy stub; redirects to `/admin`.
- `api/auth/[...nextauth]/route.ts` — Auth.js handler.
- `api/auth/client-bridge/route.ts` — GET. Called after browser-side login (as callbackUrl). Requires `device_id` query param. Creates a 5-min JWT signed with AUTH_SECRET, stores it in the in-memory `client-auth-store` keyed by `device_id`, and returns a "Close this tab" HTML page.
- `api/auth/client-poll/route.ts` — GET. Polled by the Tauri WebView every 2 s. Accepts `device_id`; returns `{ ready: false }` while waiting, `{ ready: true, token }` once the browser completes login (one-time consume).
- `api/auth/client-activate/route.ts` — GET. Tauri WebView navigates here with the token from the poll response. Signs in via `client-token` provider, redirects to `/app`.
- `api/activity/ping/route.ts` — `POST`. Auth-gated heartbeat for engagement tracking. Extends the user's most recent `user_sessions` row (or opens a new one after a 2-min gap) and recomputes `duration_seconds`. **Admins are skipped** (no rows created) so their reviewing doesn't pollute the stats. Best-effort; returns `{ ok: true }`. Called by `ActivityTracker`.
- `api/upload/route.ts` — `POST`. Cloudinary upload. Auth-gated (session required). `multipart/form-data` with `file` + optional `kind` (`icon` default — 256×256 crop, `remnus/icons/`, 5 MB; `image` — content image, no crop, width≤1600px, `remnus/images/`, 10 MB; `file` — any attachment, `resource_type: auto`, `remnus/files/`, 25 MB) + optional `workspaceId`. Image kinds validate magic bytes; file kind skips that. **Every successful upload is recorded in `uploaded_assets`** (via `recordAsset`) for cleanup + storage accounting. Returns `{ url }` (image kinds) or `{ url, name, size }` (file kind).
- `api/upload/delete/route.ts` — `POST { url }`. Auth-gated. Removes a previously-uploaded asset from Cloudinary **and** the `uploaded_assets` ledger (via `deleteAssetByUrl`; authorized when the caller uploaded it or is a member of its workspace). Best-effort `{ ok }`. Called by editor image/file blocks when their delete button is pressed.
- `api/og/route.ts` — `GET ?url=` (Node runtime). Auth-gated. Fetches a page's Open Graph / Twitter / `<title>` metadata for the BookmarkBlock card. **SSRF-hardened:** http(s) only, credentials stripped, host resolved via `dns.lookup({all:true})` and **every** address classified — rejects loopback/private/link-local/CGNAT/ULA/IPv4-mapped/multicast (IPv4 + IPv6); redirects followed manually (max 3 hops) with per-hop revalidation. 6 s timeout, reads only up to `</head>`. (Residual: a small DNS-rebinding TOCTOU window remains — full closure needs IP pinning via a custom undici dispatcher.) Returns `{ url, title, description, image, favicon }` (favicon via Google s2). Best-effort — falls back to `{ url, title: hostname }` on any failure.
- `api/import/notion/route.ts` — `POST`. Auth-gated. Accepts `multipart/form-data` with `file` (Notion export ZIP, max 100 MB) + `workspaceId`. Parses the double-zipped Notion export (outer ZIP → `Part-N.zip` → files), builds a space/page/database hierarchy, and bulk-inserts everything into the target workspace. Returns `{ ok: true, imported: { pages, databases, rows } }`. Images are skipped (not uploaded to Cloudinary). Uses `src/lib/import/notion-parser.ts` for ZIP parsing.
- `api/mcp/route.ts` — MCP transport shell (~130 lines): bearer auth, rate limit (60 req/min), SSE connection store, Streamable HTTP (stateless) + SSE (stateful) dual transport.
- `api/mcp/context.ts` — `TokenContext` type + `logActivity()` helper (audit log insert, best-effort). Imported by all tool/resource/prompt files.
- `api/mcp/resources.ts` — Registers 4 resource templates: `remnus://workspace/{id}/schema`, `remnus://page/{id}` (lists recent 20 on `resources/list`), `remnus://database/{id}/schema`, `remnus://audit-log/recent`.
- `api/mcp/prompts.ts` — Registers 5 prompt templates: `summarize-page` (page_id, style?), `weekly-status-report` (database_id, period?), `kanban-triage` (database_id), `extract-tasks` (page_id), `search-and-create` (title, query). Fetches DB content and returns filled prompt string; LLM call is done by the client.
- `api/mcp/tools/read.ts` — 8 read tools: `search`, `list_workspace` (cursor-based pagination), `get_page` (auto-detects type), `get_database_schema` (schema only, no rows), `query_database` (supports `filters: Record<string,any>`, cursor-based pagination), `list_members` (workspace_members JOIN user; role/email/joinedAt), `query_audit_log` (agentActivity; tool/status/date filters).
- `api/mcp/tools/write.ts` — 7 write tools: `create_page`, `update_page` (merges properties, never overwrites), `bulk_update`, `delete_page` (requires `confirm: true`), `move_item` (`newParentId: null` → root), `create_database` (title column auto-prepended), `update_database_schema` (removing requires `confirm: true`; title column protected).

**Server Actions (`src/lib/actions/`)**
- `workspace.ts` — Workspace + sidebar item CRUD (all auth-gated via `assertWorkspaceAccess`). Includes `updateWorkspaceIcon(id, icon, iconColor)`.
- `database.ts` — Database schema + view mutations (`assertDatabaseAccess`). `updateDatabaseSchema` automatically propagates renamed select/multi-select options to all workspace pages to prevent data loss.
- `page.ts` — Database row CRUD (`assertDatabaseAccess`).
- `auth.ts` — User auth, registration, role management, workspace membership, admin user ops.
- `demo.ts` — `loginAsDemo()` — reset + reseed demo workspace and sign in.
- `locale.ts` — `setLocale(locale)` — writes `NEXT_LOCALE` cookie.
- `agentToken.ts` — MCP token mint / list / revoke.
- `analytics.ts` — Admin-gated engagement analytics. `getEngagementOverview()` (total/avg session time, DAU/WAU/MAU, new-this-week/month signups, 30-day signup trend, per-user activity map) and `getUserDetail(userId)` (account + authType, activity summary, **storage usage** (`storageBytes` + per-workspace `storageBytes`), workspaces with items) for the admin panel. Exports type-only `PerUserActivity`/`EngagementOverview`/`UserDetail`.
- `workspace.ts` also exports `getWorkspaceStorageUsage(workspaceId)` (auth-gated; sums `uploaded_assets.bytes`) — surfaced read-only in `WorkspaceSettings` → `GeneralTab`.
- `sharing.ts` — Public page sharing server actions. `ShareRecord` type: `{ id, slug, pageId, workspaceId, permission: 'read'|'write', width: 'narrow'|'wide'|'full', inSitemap: boolean, createdBy, createdAt }`. Key exports:
  - `createShare(workspaceId, pageId, permission, customSlug?, width?)` — customSlug admin-only; regular users get UUID slug
  - `createShareWithChildren(...)` — same as createShare but also auto-shares all descendant workspace items
  - `updateShare(shareId, workspaceId, { permission?, width?, inSitemap? })` — inSitemap admin-only; **cascades `inSitemap` to all child shared pages automatically**
  - `revokeShare`, `revokeAllSharesInWorkspace`
  - `getSharesByWorkspace`, `getShareBySlug` (no auth), `getShareByPageId`, `countSharedPagesInWorkspace`
  - `updateSharedPageContent(shareId, content)` — requires login + write permission
- `workspace.ts` `createStandalonePage` and `createWorkspaceDatabase` call `autoShareIfParentShared` after creation — if `parentId` has a `shared_pages` record, the new child is **automatically shared** with the same `permission`, `width`, and `inSitemap` values. This is best-effort (never blocks creation).

**Types (`src/lib/types/`)**
- `views.ts` — `DatabaseView` (added `icon` and `iconColor`), `TableViewConfig`, `KanbanViewConfig` (added `hiddenGroups`), `CalendarViewConfig`, `ViewFilter`, `ViewSort`, `OpenBehavior`.
- `properties.ts` — `SelectOption`, `SELECT_COLORS` (9-color palette), helpers: `getOptionColorByValue`, `getCardBorderDots`, `formatDateValue`.

**Core feature components (`src/components/features/`)**
- `WorkspaceSidebar` — Collapsible workspace tree, drag-and-drop reorder, optimistic mutations, mobile bottom-sheet context menu. Bottom bar includes an "AI Agents" button that opens `AgentsModal`.
- `AgentsModal` — Global MCP token overview modal. Lists all active tokens across all user workspaces (grouped by workspace) with scope/expiry/last-used and per-token revoke. Collapsible recent-activity log (last 60 calls). Fetches via `getUserAgentTokens()` + `getUserAgentActivity()`.
- `WorkspaceSettingsModal` — 5-tab modal shell. Tabs live in `workspace-settings/`: `GeneralTab` (rename, icon, danger zone — delete warns if shared pages exist), `MembersTab` (invite, member list), `TokensTab` (token CRUD + integration guide + one-click Cursor/VS Code install deeplinks after token creation), `SharingTab` (list + revoke shared pages per workspace), `ImportTab` (Notion ZIP import). Shared types in `workspace-settings/types.ts`.
- `share/ShareModal.tsx` — Modal for creating/managing a share from sidebar context menu or page ⋯ menu. Features: permission (read/write), width (narrow/wide/full), "include child pages" toggle (cascade), custom slug (admin only), edit existing share (permission + width + `inSitemap` toggle — admin only), revoke. Shows `SEO ✓` badge when `inSitemap = true`.
- `share/SharedPageView.tsx` — Public page renderer. Shows sticky navbar (Remnus logo, breadcrumb, permission badge, save status, Sign in / Get started CTAs for guests, Go to app for logged-in non-members). Uses `share.width` for content container. Accepts `navTree` (shared nav sidebar), `parentSlug` (back button when no navTree), `shareMap` (passed to BlockEditor for child block link resolution), `editable` (Tiptap editable mode — `false` blocks typing but allows click navigation on child blocks).
- `share/SharedPageNav.tsx` — Navigation sidebar for shared page trees. Desktop: sticky 224px left sidebar. Mobile: collapsible "Contents" bar. Auto-expands branch containing current page. Renders `SharedNavItem` tree with `PageIcon`, chevron toggles, active highlight. Props: `navTree`, `currentPageId`, `mobileOnly`/`desktopOnly` (rendered twice for layout separation).
- `TemplatePickerModal` — 2-step item creation from templates (defined in `src/lib/templates.ts`).
- `DatabaseView` — View orchestrator: tabs, filters, sorts, peek modals, URL deep-link (`?v=view_id`).
- `DatabasePropertiesSidebar` — Shell (~250 lines). Sub-panels in `database-sidebar/`: `PropertiesPanel` (column schema editor), `KanbanLayoutSection` (group-by, card props, colors), `CalendarLayoutSection` (date col, view mode, card props), `FiltersSection`, `SortsSection`. Shared utilities (`Checkbox`, `getPropertyIcon`, `selectCls`) in `database-sidebar/shared.tsx`.
- `TableLayout` — Notion-style grid, draggable columns, inline cell editing, row color tinting.
- `KanbanBoard` — Grouped by select column, draggable groups, card color, group bg tint.
- `CalendarView` — Monthly/weekly grid, card drag-to-reschedule, card color.
- `InlineCellEditor` — Shared inline editor for all property types (text, number, date, datetime, select, multi_select).
- `StandalonePageEditor` — Title + block editor, auto-save, back button when `parentId` set. Props include `isAdmin` (passed from route). Header: `[SaveStatus] [Refresh] [⋯]` — the ⋯ dropdown contains width selector (Narrow/Wide/Full) and Share button (opens `ShareModal`).
- `PageEditor` — DB row editor: properties panel + block editor, peek-compact layout. Props include `isAdmin`. Header: `[SaveStatus] [⋯]` — the ⋯ dropdown contains width selector + Share button + Duplicate + Delete.
- `BlockEditor` — Props: `initialContent`, `onChange`, `onImmediateSave?`, `placeholder?`, `workspaceId?`, `parentId?`, `initialSubItems?`, `shareMap?`, `editable?` (default `true`). The `editable` prop maps to Tiptap's `editable` option — `false` prevents typing but allows click events (child block navigation works). A `useEffect` on `[editor, initialSubItems]` syncs child block node attrs (title/icon/iconColor) from `initialSubItems` after mount, keeping display current even if sub-pages were renamed after last save.
- `MobileNavWrapper` — Mobile-only bottom bar: workspace sheet, context-aware + button, user sheet.
- `ViewsBar` — View tabs with inline rename/delete/add; collapses to dropdown on mobile.
- `PageIcon` — Renders icons: emoji string, `lucide:Name`, or `https://…` image URL (as `<img>`). Supports 9 theme colors.
- `IconPicker` — Popover with 3 tabs: emoji, Lucide icon + color, Upload (Cloudinary via `POST /api/upload`). Used for workspace items, DB rows, and workspaces.
- `SaveStatus` — Auto-fading save indicator (idle → saving → saved → error).
- `LanguageSwitcher` — Language dropdown; calls `setLocale()` + `router.refresh()`.
- `AdminUsersTable` — Paginated user table (10/page) with client-side column sorting (name/email/sign-in/role/last-active/time-spent/**storage**/joined), search + role + sign-in filters, last-active, time-spent & storage columns (from `getEngagementOverview().perUser` — each `PerUserActivity` now carries `storageBytes`), and clickable rows that open `AdminUserDetailModal`. Delete is inline (stops row-click propagation).
- `admin/AdminUserDetailModal` — Per-user detail modal opened from `AdminUsersTable`. Fetches `getUserDetail(userId)` on open. Three sections: account details (incl. inline role promote/demote via `setUserRole`), activity summary (total time, session count, last active, **storage used**), and the user's workspaces with their items (each showing its own storage total). Replaces the old standalone workspaces table.
- `admin/format.ts` — Shared admin formatters: `formatDate`, `formatDuration`, `formatRelative`, `safeDate`.

**Editor (`src/components/features/editor/`)**
- `BlockEditor` — Tiptap editor: StarterKit (with `link` configured: `openOnClick:false`, autolink, linkOnPaste), `@tiptap/markdown` v3, TaskList, Table, ChildBlock, YoutubeEmbed, ImageBlock, CalloutBlock, BookmarkBlock, FileBlock, SlashCommand, PageMention. `editorProps.handleClick` intercepts `<a>` clicks: internal `/…` hrefs navigate via the SPA router (after `onImmediateSave`), external hrefs open in a new tab. `editorProps.handlePaste`/`handleDrop` upload pasted/dropped image files (`kind=image`) and insert an `imageBlock` at the drop position. Use `key={page.id}` to remount on page switch.
- `YoutubeEmbedExtension` / `YoutubeEmbedView` — Tiptap node (`youtubeEmbed`, atom, draggable) embedding a YouTube video as a responsive 16:9 iframe. Inserted via the `/` "YouTube Video" slash command; the node view shows a URL input until a video id is set (`extractYouTubeId` parses watch / youtu.be / embed / shorts / live URLs or a bare id). Serializes as `<div data-yt-id="…">` for markdown round-trip (same HTML-block approach as ChildBlock).
- **Media blocks** (`ImageBlock`, `CalloutBlock`, `BookmarkBlock`, `FileBlock` — each an `…Extension.ts` atom node + `…View.tsx` node view). All inserted via `/` slash commands and serialize as a **single-line `<div data-*>` HTML block** (round-trip-safe like ChildBlock; text/newlines encoded as `&quot;`/`&#10;`):
  - `ImageBlock` (`div[data-img-src]`) — upload (`POST /api/upload` `kind=image`) or paste image URL; renders `<img>`. Has an `align` attr (left/center/right) with hover toolbar controls. Delete calls `/api/upload/delete` to remove the Cloudinary asset. `workspaceId` option (set in BlockEditor) is sent with uploads for storage accounting.
  - `CalloutBlock` (`div[data-callout-color]`) — emoji icon + theme color (default/blue/green/amber/red, see `CALLOUT_COLORS`) + autosizing **plain-text** body. (Rich-text body intentionally out of scope — see Work Plan task.)
  - `BookmarkBlock` (`div[data-bm-url]`) — link-preview card; Open Graph metadata fetched once via `GET /api/og` and frozen into attributes.
  - `FileBlock` (`div[data-file-url]`) — downloadable attachment (`POST /api/upload` `kind=file`); name + size + download button. Delete calls `/api/upload/delete`; `workspaceId` option sent with uploads.
  - Interactive controls inside these atom node views (URL inputs, the callout textarea, toolbar buttons) only work because each `ReactNodeViewRenderer` is given `{ stopEvent: mediaStopEvent }` (`mediaStopEvent.ts`): it returns true for events whose target is an `input/textarea/select/button/a` (but not `[data-drag-handle]`), so ProseMirror ignores them entirely — including right after insertion when a NodeSelection sits on the fresh node. A React `onMouseDown` is **not** enough (it fires at the React root, after PM's `view.dom` handler already grabbed the NodeSelection). `assetClient.ts` holds the `deleteUploadedAsset(url)` fire-and-forget helper.
- `ChildBlockExtension` — Tiptap node for embedded sub-pages/databases. Serializes as `<div data-cb-id>` — standard HTML block element required because `marked` does not tokenize custom elements. `linkOnly` attr (`data-cb-link="1"`) marks a **reference to an existing page** (block "Link to page") vs an owned embed; link-only blocks delete the block only, never the target page. Options: `workspaceId`, `parentId`, `onImmediateSave`, `shareMap: Record<string,string>|null` — when provided (shared view), child blocks link to `/share/[slug]` if the target page is in the map, otherwise show a lock icon and disable navigation.
- `ChildBlockView` — Node view: drag handle (hidden in shared view), icon, title link (calls `onImmediateSave` before nav; disabled in shared view when not shared), delete button (hidden in shared view), lock icon for unshared children. Reads `shareMap` from extension options via `editor.extensionManager`.
- `PageMentionExtension` / `PageMentionList` — Inline page links: typing `@` opens a searchable picker of existing pages/databases; selecting one inserts a `pageLink` atomic node (not an editable mark).
- `PageLinkNode` — Atomic inline node (`pageLink`, `atom:true`) for `@` page links: label is non-editable and a single Backspace removes the whole link. Renders `<a data-page-link href=…>` and serializes to inline HTML so it round-trips via @tiptap/markdown's inline-HTML token handling (re-parses back into the node, not a link mark). Plain typed/pasted URLs remain ordinary editable link marks.
- `PagePickerPanel` / `pagePicker.ts` — Block "Link to page" picker (own search box, tippy-anchored at cursor); `openPagePicker(editor)` inserts a link-only `childBlock`. Arrow/Enter/Escape are handled via a **document capture-phase keydown listener** so navigation works even while ProseMirror still holds focus (the editor keeps focus when the picker is opened from a slash command); the search input is focus-grabbed across a few `requestAnimationFrame`s to win that race.
- `pageLinkData.ts` — Client-side cached index (30 s TTL) of all linkable workspace items via `getAllWorkspaceItems`; `searchPageItems(query)` + `pageLinkHref(item)`. Shared by the `@` mention and the block picker.
- `BubbleMenuBar` — Selection toolbar (Bold/Italic/Strike/Code/H1–H3 + "Turn into"). Uses anchor probe to self-position inside transformed ancestors (peek modals).
- `SlashCommandMenu` — `/` trigger; reads `workspaceId`/`parentId` from extension manager dynamically, not from closure.
- `SlashCommandList` — Keyboard-navigable command list rendered as three divider-separated groups: basic blocks · media (`MEDIA_IDS`: video/image/callout/bookmark/file) · pages (child blocks). Exports `SLASH_KEYWORDS` (id → synonyms like `h1`/`img`/`todo`); `SlashCommandMenu`'s suggestion filter matches the English label, the id, **and** these keywords so typed shortcuts (`/h1`, `/img`) resolve. Child group: "Link to page" (`child-link`, opens `openPagePicker`), "Page", "Database".

**Marketing (`src/components/marketing/`)**
- `LandingBridgeSwitcher` — Full landing page composition (pure server component, no auth check). Used by `page.tsx`.
- `LandingNav` — Sticky header; "Go to app" → `/app` for authed, Sign in / Get started for guests. Includes `<LanguageSwitcher variant="header" />`.
- `LandingHero` / `LandingWhy` / `LandingWhatsInside` / `LandingIntegrations` / `LandingSetup` / `LandingTools` / `LandingPricing` / `LandingClosing` / `LandingFooter` — Landing sections 01–08 + footer.
- `WhatsInsideViewer` — Client component. Auto-cycling Kanban/Table/Calendar viewer (4 s). All strings passed as props.
- `SetupGuideModal` — Client component. MCP connection steps modal with endpoint + auth header snippets. All strings passed as props.
- `DownloadView` — Client component for `/download`. Detects OS (`navigator`), shows a smart primary "Download for {os}" button + full platform grid (Windows .exe, macOS Apple Silicon/Intel .dmg, Linux .AppImage/.deb). Links target `github.com/Ranork/remnus-app/releases/latest/download/<stable-name>` — never needs per-release updates, but only resolves once the draft release is published. Stable-named assets are produced by the "Upload stable-named installers" step in `tauri-release.yml`.
- `MarketingShell` — Layout wrapper wrapping `/pricing`, `/contact`, `/download`, and `/privacy` with the unified LandingNav and LandingFooter.
- `HeroSection` / `FeaturesSection` / `PricingSection` / `ContactSection` — Legacy marketing shell components.
- `LandingChip` / `AIMark` — Utility: status pill, AI client SVG marks.
- `mini/` — Static mini previews: `KanbanMini`, `TableMini`, `CalendarMini`, `MarkdownPageMini`, `ViewTab`.

**Other**
- `src/lib/client-auth-store.ts` — In-memory store for pending desktop OAuth tokens. `setPendingClientToken(deviceId, token)` writes; `consumeClientToken(deviceId)` reads + deletes (one-time use, 5-min TTL). Single-process only — swap for a DB table in multi-instance deployments.
- `src/lib/templates.ts` — 7 item templates for `TemplatePickerModal`.
- `src/lib/seed.ts` — `createSeedWorkspace()` and `createDemoSeedData()` via shared `createRichWorkspaceData`.
- `src/lib/services/assets.ts` — Cookie-free asset accounting + Cloudinary cleanup. `recordAsset()` (insert into `uploaded_assets`, dedup on `public_id`), `deleteAssetByUrl(url, userId)` (destroy on Cloudinary by stored `public_id`+`resource_type`, delete ledger row; authorized for uploader or workspace member), `getUserStorageBytes`/`getWorkspaceStorageBytes`/`getStorageBytesForUsers`.
- `src/lib/services/workspace.ts` — Cookie-free service layer for MCP tool handlers. Exports: `searchWorkspace`, `listWorkspaceItems` (returns `{ items, hasMore, nextCursor }` — cursor-based pagination via `sort_order + id` keyset), `getPageById`, `getAnyPageById` (auto-detects workspace item vs DB row), `getDatabasePageById`, `getDatabaseSchema` (schema only, no rows), `queryDatabaseRows` (returns `{ schema, rows, hasMore, nextCursor }` — cursor-based pagination; accepts optional `filters`), `listWorkspaceMembers` (workspace_members JOIN user; role/email/joinedAt), `queryAuditLog` (agentActivity; tool/status/from/to filters; agentTokens LEFT JOIN for agentName), `createPageInWorkspace`, `updatePageById` (merges properties, never overwrites), `bulkUpdatePages`, `deleteItemFromWorkspace` (recursive cascade for workspace items), `moveItemInWorkspace` (reparent; subtree cycle-check), `createDatabaseInWorkspace` (custom schema; title auto-prepended), `updateDatabaseSchemaById` (add/remove columns; title protected).
- `src/components/providers/QueryProvider.tsx` — TanStack Query provider (staleTime 60s, gcTime 5min).
- `src/components/providers/PostHogProvider.tsx` — Client-side PostHog initializing wrapper.
- `src/components/providers/PostHogPageView.tsx` — Client-side pageview capturer for App Router path transitions.
- `src/components/providers/PostHogIdentify.tsx` — Identity binding provider connecting auth user info & role metadata.
- `src/components/providers/ActivityTracker.tsx` — Engagement heartbeat. Mounted for authenticated users in `[locale]/layout.tsx`; POSTs `/api/activity/ping` every 30s while the tab is visible (pauses when hidden), feeding `user_sessions`.
- `src/lib/import/notion-parser.ts` — Pure ZIP parser for Notion exports. `parseNotionExport(buffer)` handles the double-ZIP structure, builds a typed tree (`NotionSpace[]`), parses CSV databases with `_all.csv` files, infers column types (text/number/date/select/multi_select), matches database row MD pages to their CSV rows, and strips dead `.md` relative links from markdown. Returns `{ spaces, stats }`.
- `src/db/` — Drizzle `schema.ts`, `index.ts` (WAL + PRAGMAs on startup), migrations.
- `messages/` — Translation files (`en.json` source of truth, 17 namespaces, 6 locales).

### Common Commands

- **Start Dev Server:** `npm run dev`
- **Generate Migrations:** `npx drizzle-kit generate`
- **Apply Migrations:** `npx tsx src/db/migrate.ts`
- **Desktop dev (Tauri):** `npm run tauri:dev` — requires Rust + Visual C++ Build Tools
- **Desktop build:** `npm run tauri:build`
- **Generate Tauri icons:** `npm run tauri:icon` — run once after Rust is installed
- **Android open:** `npm run cap:open:android` — opens Android Studio
- **Android run:** `npm run cap:android`
- **iOS open (macOS only):** `npm run cap:open:ios`
- **Sync Capacitor:** `npm run cap:sync` — call after changing `capacitor.config.ts`

### Cross-Platform Architecture

**Strategy:** Cloud-first. All three platforms (web, desktop, mobile) load `remnus.com`. No separate API or local server required.

```
 remnus.com (Vercel)
       │
 ┌─────┼───────┐
 │     │       │
Web  Tauri  Capacitor
     Shell   Shell
    (Rust)  (iOS/Android)
```

**PWA** — `public/manifest.json` + Workbox service worker. Enables "Install App" in browsers and is the foundation for offline support. Disabled in `development` mode (`NODE_ENV`).

**Tauri** (`src-tauri/`) — Rust shell wrapping a system WebView.
- Dev: `build.devUrl = "http://localhost:3000"` signals CLI to wait; `setup()` hook navigates to `localhost:3000/tauri-app` via `window.eval` (`#[cfg(debug_assertions)]`).
- Prod: loads `https://remnus.com/tauri-app` (set via `app.windows[0].url`).
- Entry point `/tauri-app` sets `localStorage.platform=tauri` and detects OS locale before redirecting to `/app`.
- Features: system tray (single icon, built programmatically — **no** `trayIcon` config in `tauri.conf.json`), global shortcuts, notifications, deep-link (`remnus://` scheme).
- **Close to tray:** `CloseRequested` event is intercepted in `lib.rs`; window hides instead of quitting. Tray left-click or "Show Window" menu item restores it; "Quit Remnus" exits.
- **Desktop OAuth flow (polling / device-authorization):** Tauri login view generates a UUID `device_id` → opens `remnus.com/client-login?device_id=<uuid>` in the system browser via `@tauri-apps/plugin-opener` → user logs in (Google or GitHub) → browser POSTs to `/api/auth/client-bridge?device_id=<uuid>` which stores a 5-min JWT → browser shows "Close this tab" page → Tauri WebView polls `/api/auth/client-poll?device_id=<uuid>` every 2 s → on `{ ready: true, token }`, WebView navigates to `/api/auth/client-activate?token=…` → session cookie set → redirect to `/app`.
- Release CI: `.github/workflows/tauri-release.yml` — triggers on `v*` tags, builds Windows (`.msi`), macOS (`.dmg`, both Intel + Apple Silicon), Linux (`.deb`, `.AppImage`)
- **Requires:** Rust stable + Visual C++ Build Tools (Windows) / Xcode CLT (macOS)
- Icons: generated from `public/logo-square-dark.png` via `npm run tauri:icon` (after Rust install)

**Capacitor** (`capacitor.config.ts`, `android/`) — native WebView wrapper for iOS and Android.
- Loads `https://remnus.com` via `server.url` — no static export needed
- Plugins active: `SplashScreen`, `StatusBar`, `PushNotifications`, `Haptics`, `App`, `Keyboard`
- Dark theme colors (`#1d1f23`) set in `android/app/src/main/res/values/colors.xml`
- `android/` is committed to git (native project); `ios/` added on macOS via `npx cap add ios`
- **Requires:** Android Studio (Android) / Xcode on macOS (iOS)
