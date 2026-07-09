import { pgTable, text, numeric, timestamp } from 'drizzle-orm/pg-core';
import { workspaces } from '../pg-schema';

export const financeInvestments = pgTable('finance_investments', {
  id:           text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId:  text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  symbol:       text('symbol').notNull(),
  name:         text('name').notNull(),
  type:         text('type', { enum: ['stock', 'fii', 'treasury', 'cdb', 'etf', 'crypto', 'funds'] }).notNull(),
  brokerage:    text('brokerage'),
  quantity:     numeric('quantity').notNull().default('0'),
  averagePrice: numeric('average_price').notNull().default('0'),
  currentPrice: numeric('current_price'),
  currency:     text('currency').notNull().default('BRL'),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
  updatedAt:    timestamp('updated_at').notNull().defaultNow(),
});
