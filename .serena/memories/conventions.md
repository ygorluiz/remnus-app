# Conventions

## i18n (CRITICAL)
- All user-facing strings via next-intl — NO hardcoded strings, not even `|| 'Untitled'`
- Client components: `useTranslations('Namespace')`
- Server components/layouts: `await getTranslations('Namespace')`
- Server actions: `getTranslations('Errors')` for error messages
- Add keys to ALL 6 files (en/tr/hi/es/fr/de) — missing keys cause runtime warnings
- 17 namespaces: Layout, Home, Auth, Workspace, WorkspaceSettings, Templates, Database, Editor, Page, IconPicker, Admin, Errors, LanguageSwitcher, MobileNav, Landing, Pricing, Contact
- `Workspace` namespace includes `deleteConfirm` (interpolated with `{title}`) and `deleteCancel` keys for item-deletion confirmation modal
- `MobileNav` namespace keys: `menu`, `home`, `new`, `close`, `workspace`, `user`, `signOut` — used by `MobileNavWrapper`
- `Landing` namespace: drives `MarketingHeader`, `MarketingFooter`, `HeroSection`, `FeaturesSection` (navHome/navPricing/navContact/navSignIn/navGetStarted/hero*/feature*Title/Desc/footer* keys)
- `Pricing` namespace: drives `PricingSection` (free/pro tier content)
- `Contact` namespace: drives `ContactSection` (github/email/community channel cards)

## Auth
- NEVER call `auth()` directly in server actions/components — use `getCurrentUser()` from `src/lib/auth/session.ts` (React.cache wrapped)
- All workspace actions → `assertWorkspaceAccess(workspaceId)`
- All database/page actions → `assertDatabaseAccess(databaseId)`
- Unauthenticated → `redirect('/login')`; unauthorized → throws

## Server Actions
- `useActionState`-compatible signature: `(_prevState, formData)` for form actions
- Revalidate with `revalidatePath('/')` ONLY for structural sidebar mutations (create/delete items); NOT for content edits

## UI / Design
- Flat, shadowless, `rounded-none` everywhere in workspace (no cards, no shadows)
- 3-tier bg: `bg-neutral-950` (outermost body), `bg-neutral-900` (sidebars/panels), `bg-neutral-850` (content/canvas)
- Borders: `border-neutral-800` single lines; no chunky cards
- Auth pages exception: `rounded-xl` card, `rounded-lg` inputs (deliberate contrast)
- All colors via `@theme` tokens in `globals.css` — use Tailwind tokens, not hex

## Data Patterns
- JSON column pattern for dynamic properties (no EAV, no extra tables)
- `SelectOption`: `{ value: string; color?: SelectOptionColor }` — `normalizeOption` for backward compat with plain strings
- Date formatting: `formatDateValue()` from `properties.ts`; never hardcode `'en-US'`

## Component Patterns
- Optimistic mutations: apply locally first, revalidate in background
- Editor: `key={page.id}` to remount `BlockEditor` on page switch
- `ChildBlock` markdown serialization: `<div data-cb-id="...">` (NOT custom elements — `marked` only parses standard HTML block elements)
- TanStack Query: installed via `QueryProvider` — use for client mutation hooks

## Performance
- `Promise.all` for independent fetches (no waterfalls in layouts)
- Loading skeletons in `loading.tsx` files for each route
