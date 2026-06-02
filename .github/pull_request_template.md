## Summary

<!-- What does this PR do? One or two sentences. -->

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] MCP tool / resource / prompt
- [ ] Refactor
- [ ] Documentation
- [ ] i18n / Translation

## Checklist

- [ ] Tested locally (ran `npm run dev` and verified the affected flow)
- [ ] No hardcoded strings — all user-facing text uses `useTranslations` / `getTranslations`
- [ ] New translation keys added to all 6 locale files (`en`, `tr`, `de`, `es`, `fr`, `hi`)
- [ ] New database migration `when` value is greater than the last migration
- [ ] No `revalidatePath` added to content-save actions (only sidebar-structural mutations)

## Related issues

<!-- Closes #123 -->
