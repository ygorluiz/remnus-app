# Task Completion Checklist

Run these after any coding task:

1. **Type check** — TypeScript strict mode; check for `@ts-ignore` added (only acceptable for Tiptap's `renderMarkdown` field)
   ```powershell
   npx tsc --noEmit
   ```

2. **Lint**
   ```powershell
   npm run lint
   ```

3. **i18n keys** — if any new user-facing string was added:
   - Verify key exists in all 6 `messages/*.json` files
   - No hardcoded strings remain in components

4. **Migration** — if `src/db/schema.ts` was changed:
   ```powershell
   npx drizzle-kit generate
   npx tsx src/db/migrate.ts
   ```
   Ensure new migration `when` value > `1780100000000`

5. **AGENTS.md update** — if structural changes were made (new routes, tables, components, server actions, architectural patterns): update `AGENTS.md` before finishing
