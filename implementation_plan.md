# Integration Plan: Remnus Finance Module

## Guiding Principle — Modular by Design

Each financial concept is an **independent module** with its own:
- **Schema** — `src/db/finance/{module}.ts` (one per table, no monolithic schema file)
- **Service** — `src/lib/services/finance/{module}.ts` (pure TS, zero React/Next.js dependency)
- **Actions** — `src/lib/actions/finance/{module}.ts` (server actions with auth + DB)
- **Hooks** — `src/hooks/finance/use{Module}.ts` (TanStack Query wrappers)
- **Components** — `src/components/features/finance/{module}/` (UI isolated per context)
- **Routes** — `src/app/[locale]/finance/{module}/page.tsx`

Modules share nothing unless explicitly imported. No cross-module coupling, no global state.

The sidebar gets a **`FinanceGroup` component slot** — a self-contained collapsible nav item — not inline logic in the monolithic sidebar.

---

## Phase 1 — Foundation (Scaffolding)

### Database: PostgreSQL with Drizzle

All tables follow existing conventions:
- `id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID())`
- `workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' })`
- Timestamps with `defaultNow()`

**Migration:** Add files to `src/db/finance/`, re-export from `src/db/finance/index.ts`, import in `src/db/pg-schema.ts`. Run `npx drizzle-kit generate` + `npm run db:setup`.

### Schema Modules (`src/db/finance/`)

| File | Table | Purpose |
|------|-------|---------|
| `accounts.ts` | `finance_accounts` | Bank accounts (checking, savings, wallet, cash) |
| `cards.ts` | `finance_cards` | Credit cards with limits + billing cycle |
| `categories.ts` | `finance_categories` | Hierarchical categories (parent-child) |
| `transactions.ts` | `finance_transactions` | Core ledger — all financial movements |
| `budgets.ts` | `finance_budgets` | Monthly budgets by category |
| `goals.ts` | `finance_goals` | Savings goals with progress |
| `subscriptions.ts` | `finance_subscriptions` | Recurring subscription tracking |
| `debts.ts` | `finance_debts` | Loans, financing, amortization schedules |
| `investments.ts` | `finance_investments` | Portfolio holdings |
| `investment-transactions.ts` | `finance_investment_transactions` | Buy/sell/dividend events |
| `recurring-rules.ts` | `finance_recurring_rules` | Recurring transaction templates |

### Monetary Precision Strategy

**Per-module decision, no global rule:**

| Module | Type | Rationale |
|--------|------|-----------|
| `transactions`, `budgets`, `goals`, `subscriptions`, `debts` | `integer` (cents) | 2 decimal places sufficient for everyday finance |
| `investments`, `investment_transactions` | `numeric` | Fractional shares and crypto require >2 decimal places |

---

## Phase 2 — MVP: Accounts + Transactions

### Schema

#### `finance_accounts`
- `id`, `workspaceId`, `name`, `bank` (text), `type` (enum: checking/savings/wallet/cash/digital/international)
- `color`, `icon` (text, nullable — Lucide/emoji)
- `initialBalanceCents` (integer, default 0), `currentBalanceCents` (integer, default 0)
- `currency` (text, default 'BRL'), `includeInTotal` (boolean, default true)
- `isArchived` (boolean, default false)
- `sortOrder` (integer, default 0)
- `createdAt`, `updatedAt`

#### `finance_transactions`
- `id`, `workspaceId`, `title`, `description` (text, nullable)
- `amountCents` (integer), `type` (enum: income/expense/transfer/refund)
- `categoryId` (FK → finance_categories, nullable), `accountId` (FK → finance_accounts, cascade)
- `destinationAccountId` (FK → finance_accounts, nullable — transfers)
- `cardId` (FK → finance_cards, nullable)
- `transactionDate` (timestamp), `status` (enum: pending/cleared/reconciled)
- `currency` (text, default 'BRL')
- `isRecurring` (boolean, default false), `recurringRuleId` (FK, nullable)
- `isInstallment` (boolean, default false), `installmentGroupId` (text, nullable)
- `currentInstallment` (integer, nullable), `totalInstallments` (integer, nullable)
- `tags` (jsonb, default `[]`), `notes` (text, nullable)
- `location` (text, nullable), `attachmentUrl` (text, nullable)
- `createdAt`, `updatedAt`

#### `finance_categories`
- `id`, `workspaceId`, `name`, `parentId` (self-FK, nullable)
- `icon` (text, nullable), `emoji` (text, nullable), `color` (text, nullable)
- `createdAt`, `updatedAt`

### Services (`src/lib/services/finance/`)

Pure TS, zero React. Exported functions:
- `ledger.ts` — `reconcileAccountBalance(accountId)` recalculates `currentBalanceCents` from transaction history
- `validation.ts` — Zod schemas: `accountSchema`, `transactionSchema`, `categorySchema`

### Server Actions (`src/lib/actions/finance/`)

- `accounts.ts` — `createAccount`, `updateAccount`, `archiveAccount`, `listAccounts`, `getAccount`
- `transactions.ts` — `createTransaction`, `updateTransaction`, `deleteTransaction`, `listTransactions(filters)`, `getTransaction`
- `categories.ts` — `createCategory`, `updateCategory`, `deleteCategory`, `listCategories`

All use `getCurrentUser()` + `assertWorkspaceAccess()` pattern.
`createTransaction` auto-reconciles `currentBalanceCents` on the affected account(s).

### Hooks (`src/hooks/finance/`)

- `useAccounts(workspaceId)` — fetches + caches account list
- `useTransactions(workspaceId, filters?)` — fetches with cursor pagination
- `useCategories(workspaceId)` — fetches + builds tree

### UI Components (`src/components/features/finance/`)

- `accounts/AccountList` — card grid showing balance, bank, type
- `accounts/AccountForm` — create/edit form modal
- `transactions/TransactionList` — paginated table with status badges
- `transactions/TransactionForm` — create/edit inline form
- `transactions/TransactionRow` — single row with amount color (green/red)
- `categories/CategoryTree` — hierarchical category browser
- `dashboard/DashboardOverview` — net worth bar, cash flow sparkline (CSS/SVG)

### Routes

```
finance/
  layout.tsx           ← shared layout (subnav + breadcrumb)
  dashboard/page.tsx   ← /finance/dashboard
  accounts/page.tsx    ← /finance/accounts
  transactions/page.tsx ← /finance/transactions
  categories/page.tsx  ← /finance/categories
```

### Sidebar Integration

`FinanceGroup` — self-contained component inserted inside the scrollable workspace list area, after the add-workspace button. Renders a collapsible section with:
- Dashboard, Accounts, Transactions, Categories
- Uses `ChevronDown`/`ChevronRight` expand pattern matching existing sidebar style
- Active route highlighting via `usePathname()`
- Stored in `src/components/features/finance/FinanceGroup.tsx`

### i18n

New namespace: **`Finance`** — added to all 7 translation files.
Keys: `dashboardTitle`, `accountsTitle`, `transactionsTitle`, `categoriesTitle`, `addAccount`, `editAccount`, `addTransaction`, `editTransaction`, `accountType`, `balance`, `income`, `expense`, `transfer`, `pending`, `cleared`, `reconciled`, etc.

---

## Phase 3 — Expansion (Future)

### Cards (`finance_cards`)
- Credit card management with invoice tracking
- `closingDay`, `dueDay`, `creditLimitCents`, `brand`
- Invoice view: transactions grouped by billing period
- Auto-link transactions via `cardId`

### Budgets (`finance_budgets`)
- Monthly spending limits per category
- Progress bars (CSS/SVG ring gauges)
- Alert when exceeding threshold

### Goals (`finance_goals`)
- Savings targets with progress visualization
- Timeline projection (target date vs current pace)

### Subscriptions (`finance_subscriptions`)
- Recurring payment tracker
- Next renewal countdown
- Cancel URL shortcut

### Debts (`finance_debts`)
- Amortization schedules (SAC / Price)
- Interest rate tracking
- Payment schedule visualization

### Investments (`finance_investments`, `finance_investment_transactions`)
- Portfolio overview with position tracking
- Buy/sell event log
- `numeric` precision for fractional shares

### Recurring Rules (`finance_recurring_rules`)
- Auto-generate transactions on schedule
- Cron-like frequency config

### Calendar View (`/finance/calendar`)
- Transaction calendar (separate from DB CalendarView)
- Monthly income/expense heatmap

### Reports (`/finance/reports`)
- Cash flow charts (CSS/SVG line charts — no Recharts dependency)
- Category breakdown pie/ring
- Net worth trend line

---

## Verification Plan

- **Unit tests** for `ledger.ts` reconciliation logic
- **Unit tests** for Zod validation schemas
- **Integration tests** for server action auth guards
- **Manual:** swipe through all routes in Tauri + mobile viewport
- **Manual:** switch workspaces — verify dashboard reloads per-workspace data

---

## Non-Goals (Explicitly Out of Scope)

- Open Banking / Plaid integration
- Automatic bank feed sync
- Invoice/Receipt OCR
- Tax reporting
- Multi-currency auto-conversion (manual exchange rate only initially)
