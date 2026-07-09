import { pgTable, text, integer, timestamp, boolean } from 'drizzle-orm/pg-core';
import { workspaces } from '../pg-schema';

export const financeAccounts = pgTable('finance_accounts', {
  id:                  text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId:         text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name:                text('name').notNull(),
  bank:                text('bank'),
  type:                text('type', { enum: ['checking', 'savings', 'wallet', 'cash', 'digital', 'international'] }).notNull().default('checking'),
  color:               text('color'),
  icon:                text('icon'),
  initialBalanceCents: integer('initial_balance_cents').notNull().default(0),
  currentBalanceCents: integer('current_balance_cents').notNull().default(0),
  currency:            text('currency').notNull().default('BRL'),
  includeInTotal:      boolean('include_in_total').notNull().default(true),
  isArchived:          boolean('is_archived').notNull().default(false),
  sortOrder:           integer('sort_order').notNull().default(0),
  createdAt:           timestamp('created_at').notNull().defaultNow(),
  updatedAt:           timestamp('updated_at').notNull().defaultNow(),
});
