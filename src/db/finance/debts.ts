import { pgTable, text, integer, numeric, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { workspaces } from '../pg-schema';

export const financeDebts = pgTable('finance_debts', {
  id:                    text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId:           text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name:                  text('name').notNull(),
  creditor:              text('creditor'),
  totalAmountCents:      integer('total_amount_cents').notNull(),
  remainingAmountCents:  integer('remaining_amount_cents').notNull(),
  interestRate:          numeric('interest_rate'),
  amortizationType:      text('amortization_type', { enum: ['sac', 'price', 'bullet', 'other'] }),
  dueDate:               timestamp('due_date'),
  paymentSchedule:       jsonb('payment_schedule').$type<any[]>(),
  createdAt:             timestamp('created_at').notNull().defaultNow(),
  updatedAt:             timestamp('updated_at').notNull().defaultNow(),
});
