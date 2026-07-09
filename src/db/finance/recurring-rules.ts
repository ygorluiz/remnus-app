import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { workspaces } from '../pg-schema';

export const financeRecurringRules = pgTable('finance_recurring_rules', {
  id:             text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId:    text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  title:          text('title').notNull(),
  amountCents:    integer('amount_cents'),
  type:           text('type', { enum: ['income', 'expense', 'transfer'] }),
  frequency:      text('frequency', { enum: ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'annually'] }).notNull(),
  interval:       integer('interval').notNull().default(1),
  startDate:      timestamp('start_date').notNull(),
  endDate:        timestamp('end_date'),
  nextOccurrence: timestamp('next_occurrence'),
  categoryId:     text('category_id'),
  accountId:      text('account_id'),
  cardId:         text('card_id'),
  createdAt:      timestamp('created_at').notNull().defaultNow(),
  updatedAt:      timestamp('updated_at').notNull().defaultNow(),
});
