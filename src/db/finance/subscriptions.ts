import { pgTable, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { workspaces } from '../pg-schema';

export const financeSubscriptions = pgTable('finance_subscriptions', {
  id:               text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId:      text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name:             text('name').notNull(),
  amountCents:      integer('amount_cents').notNull(),
  billingCycle:     text('billing_cycle', { enum: ['weekly', 'monthly', 'yearly', 'quarterly'] }).notNull().default('monthly'),
  nextRenewalDate:  timestamp('next_renewal_date').notNull(),
  categoryId:       text('category_id'),
  accountId:        text('account_id'),
  cardId:           text('card_id'),
  cancelUrl:        text('cancel_url'),
  notifyBeforeDays: integer('notify_before_days').notNull().default(1),
  isActive:         boolean('is_active').notNull().default(true),
  createdAt:        timestamp('created_at').notNull().defaultNow(),
  updatedAt:        timestamp('updated_at').notNull().defaultNow(),
});
