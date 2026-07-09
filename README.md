# Remnus

**Open-source MCP-native workspace for humans and AI agents.**

Kanban boards, databases, personal finance, and pages that Claude, Cursor, and any AI agent can read and write via MCP — alongside you.

[![GitHub Stars](https://img.shields.io/github/stars/Ranork/remnus-app?style=flat-square)](https://github.com/Ranork/remnus-app/stargazers)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue?style=flat-square)](LICENSE)
[![Deploy with Vercel](https://img.shields.io/badge/Deploy%20to-Vercel-black?style=flat-square&logo=vercel)](https://vercel.com/new/clone?repository-url=https://github.com/Ranork/remnus-app)

---

## What is Remnus?

Remnus is a Notion-like workspace built around the [Model Context Protocol (MCP)](https://modelcontextprotocol.io). Every page, database, and kanban board in your workspace is accessible to AI agents via a first-class MCP server — with PAT or OAuth 2.1 + PKCE, no API key management needed.

**Unlike Notion's MCP integration**, Remnus is designed for headless, CI/CD, and coding agent workflows from day one.

---

## Features

- **Pages** — Markdown editor with slash commands, nested sub-pages, icons, and media blocks (image, file, bookmark, callout, YouTube)
- **Databases** — Customizable columns (text, number, select, multi-select, status, user, date, checkbox, URL, email), Table / Kanban / Calendar views, filters, sorts
- **Personal Finance** — Full finance module: accounts, transactions, categories, cards, budgets, goals, subscriptions, debts, and investments with auto-reconciling ledger
- **MCP Server** — 15 tools + 4 resources + 5 prompts, Streamable HTTP + SSE dual transport
- **Multi-workspace** — Invite members, role-based access (owner / member / viewer), seat-based billing
- **Public sharing** — Share pages with read/write links, custom slugs, sitemap inclusion
- **Desktop app** — Tauri v2 shell for Windows, macOS, Linux (system tray, deep links, close-to-tray)
- **Mobile** — PWA + Capacitor v8 for iOS and Android
- **i18n** — English, Türkçe, Español, Français, Deutsch, हिन्दी, Português (Brasil)
- **Custom themes** — 6 themes: Remnus (dark), Carbon (dark), Dracula (dark), Tokyo Night (dark), Nord (dark), Catppuccin (light)

---

## Quick Start — Self-host

### Local Development

```bash
git clone https://github.com/Ranork/remnus-app.git
cd remnus-app
cp .env.example .env          # fill in BETTER_AUTH_SECRET + OAuth credentials + DATABASE_URL
npm install
npm run db:setup              # push schema to PostgreSQL
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The first user to sign up is auto-promoted to admin.

### Docker Compose

If you prefer to run Remnus using Docker:

```bash
git clone https://github.com/Ranork/remnus-app.git
cd remnus-app
cp .env.example .env
docker compose up -d
```

Access Remnus at `http://localhost:3000`. Set `DATABASE_URL` to your PostgreSQL instance (Neon, Supabase, Railway, or local).

### Deploy

[![Deploy to Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Ranork/remnus-app)

### Add MCP to your editor

After signing in, go to **AI Agents** in the sidebar to create a token or connect via OAuth. Then:

[![Add to Claude](https://img.shields.io/badge/Claude-Add%20MCP-9b59b6?style=flat-square)](https://modelcontextprotocol.io)
[![Add to Cursor](https://img.shields.io/badge/Add%20to-Cursor-black?style=flat-square)](https://docs.cursor.com/context/model-context-protocol)
[![Add to VS Code](https://img.shields.io/badge/Add%20to-VS%20Code-blue?style=flat-square&logo=visualstudiocode)](https://code.visualstudio.com/docs/copilot/chat/mcp-servers)

Or add manually to your MCP client config:

```json
{
  "mcpServers": {
    "remnus": {
      "type": "http",
      "url": "https://your-instance.com/api/mcp",
      "headers": {
        "Authorization": "Bearer <your-token>"
      }
    }
  }
}
```

---

## MCP Tools

| Tool | Scope | Description |
|------|-------|-------------|
| `search` | read | Full-text search across pages and databases |
| `list_workspace` | read | List sidebar items with pagination |
| `get_page` | read | Get a page or database row by ID |
| `get_database_schema` | read | Get column schema of a database |
| `query_database` | read | Query rows with filters and pagination |
| `list_members` | read | List workspace members with roles |
| `query_audit_log` | read | Filtered agent activity log |
| `create_page` | write | Create a standalone page or database row |
| `update_page` | write | Update title, content, or properties |
| `bulk_update` | write | Update multiple rows in one call |
| `delete_page` | write | Delete a page (requires `confirm: true`) |
| `move_item` | write | Move item to a new parent |
| `create_database` | write | Create a database with custom schema |
| `update_database_schema` | write | Add or remove columns |

---

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Database:** PostgreSQL via Neon, Drizzle ORM
- **Auth:** Better Auth v1.6 — Google & GitHub OAuth
- **Styling:** Tailwind CSS + Lucide icons
- **Desktop:** Tauri v2 (Rust)
- **Mobile:** Capacitor v8 (iOS/Android) + PWA
- **i18n:** next-intl v4 — 7 locales
- **Finance:** 9 modules (accounts, transactions, categories, cards, budgets, goals, subscriptions, debts, investments)

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). All contributions are welcome — bug fixes, new MCP tools, translations, docs, and finance modules.

## License

[AGPL-3.0](LICENSE) — free to self-host and modify. SaaS forks must open-source their changes.
