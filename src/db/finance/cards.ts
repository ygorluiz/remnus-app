import { pgTable, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { workspaces } from '../pg-schema';

export const financeCards = pgTable('finance_cards', {
  id:               text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId:      text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name:             text('name').notNull(),
  brand:            text('brand', { enum: ['visa', 'mastercard', 'elo', 'amex', 'hipercard', 'other'] }).notNull().default('other'),
  bank:             text('bank'),
  creditLimitCents: integer('credit_limit_cents').notNull().default(0),
  closingDay:       integer('closing_day'),
  dueDay:           integer('due_day'),
  color:            text('color'),
  icon:             text('icon'),
  isVirtual:        boolean('is_virtual').notNull().default(false),
  linkedAccountId:  text('linked_account_id'),
  createdAt:        timestamp('created_at').notNull().defaultNow(),
  updatedAt:        timestamp('updated_at').notNull().defaultNow(),
});
