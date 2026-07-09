import { pgTable, text, numeric, timestamp } from 'drizzle-orm/pg-core';
import { workspaces } from '../pg-schema';

export const financeInvestmentTransactions = pgTable('finance_investment_transactions', {
  id:              text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId:     text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  investmentId:    text('investment_id').notNull(),
  type:            text('type', { enum: ['buy', 'sell', 'dividend', 'tax', 'fee'] }).notNull(),
  quantity:        numeric('quantity').notNull(),
  price:           numeric('price').notNull(),
  totalAmount:     numeric('total_amount').notNull(),
  transactionDate: timestamp('transaction_date').notNull(),
  createdAt:       timestamp('created_at').notNull().defaultNow(),
  updatedAt:       timestamp('updated_at').notNull().defaultNow(),
});
