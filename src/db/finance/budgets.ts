import { pgTable, text, integer, numeric, timestamp } from 'drizzle-orm/pg-core';
import { workspaces } from '../pg-schema';

export const financeBudgets = pgTable('finance_budgets', {
  id:             text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId:    text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  categoryId:     text('category_id').notNull(),
  amountCents:    integer('amount_cents').notNull(),
  month:          text('month').notNull(),
  alertThreshold: numeric('alert_threshold').notNull().default('0.8'),
  createdAt:      timestamp('created_at').notNull().defaultNow(),
  updatedAt:      timestamp('updated_at').notNull().defaultNow(),
});
