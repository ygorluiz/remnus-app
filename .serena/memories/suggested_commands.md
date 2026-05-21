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
- New migration `when` value MUST be > `1780100000000` (see existing journal)
- Never use `drizzle-kit push` interactively — use the custom migrate script

## Windows-specific
- Shell is PowerShell; use `;` not `&&` for chaining (pipeline `&&` is PS7+ only)
- Paths use `\\` in PowerShell strings but `/` works in most Node.js contexts
- `$env:VAR` for env vars, not `$VAR`
