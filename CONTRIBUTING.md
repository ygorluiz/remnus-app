# Contributing to Remnus

Thank you for your interest in contributing! Here's how to get started.

## Development Setup

```bash
git clone https://github.com/Ranork/remnus-app.git
cd remnus-app
npm install
cp .env.example .env   # fill in BETTER_AUTH_SECRET + OAuth credentials + DATABASE_URL (PostgreSQL)
npm run db:setup       # push schema to PostgreSQL
npm run dev
```

## How to Contribute

1. **Fork** the repository and create a branch from `master`.
2. **Make your changes.** Keep commits focused and descriptive.
3. **Test** your changes locally — run the dev server and verify the affected flow.
4. **Open a pull request** using the PR template.

## What We Welcome

- Bug fixes
- New MCP tools or resources
- UI improvements
- Translation fixes or new locales
- Documentation improvements
- Self-host / deployment improvements

## Guidelines

- **i18n:** Every user-facing string must use `useTranslations` (client) or `getTranslations` (server). Add keys to all 7 locale files (`en`, `tr`, `de`, `es`, `fr`, `hi`, `pt-BR`).
- **No hardcoded strings** — not even English fallbacks.
- **Database migrations:** New `when` values must be greater than the last migration. See `AGENTS.md` for the current last value.
- **No breaking changes** to the MCP API without discussion first.
- **Style:** Follow the existing color theme and flat/borderless UI conventions described in `AGENTS.md`.

## Reporting Bugs

Use the [Bug Report](.github/ISSUE_TEMPLATE/bug_report.yml) issue template.

## Security Issues

See [SECURITY.md](SECURITY.md) — please do **not** open a public issue for security vulnerabilities.

## Code of Conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). Be kind and respectful.
