# Suggested Commands

## Dev & Build
```powershell
npm run dev              # Start dev server (Next.js)
npm run build            # Production build
npm run start            # Production server
npm run lint             # ESLint
```

## Database
```powershell
npx drizzle-kit generate          # Generate migration SQL from schema changes
npx tsx src/db/migrate.ts         # Apply pending migrations (custom runner)
npm run db:migrate                # Alias for above
```

## Migration Notes
- New migration `when` value MUST be greater than all existing — next: > `1781500000000` (check AGENTS.md "Migration Notes" for the current ceiling)
- Recent migrations (0017–0029) are applied MANUALLY via `src/db/apply-00xx-*.ts` (libsql `batch()` no-ops DDL). Run each against BOTH local + Turso (see mem:conventions)
- Never use `drizzle-kit push` interactively — use the custom migrate script / apply scripts

## Windows-specific
- Shell is PowerShell; use `;` not `&&` for chaining (pipeline `&&` is PS7+ only)
- Paths use `\\` in PowerShell strings but `/` works in most Node.js contexts
- `$env:VAR` for env vars, not `$VAR`
