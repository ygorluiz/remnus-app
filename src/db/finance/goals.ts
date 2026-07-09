import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { workspaces } from '../pg-schema';

export const financeGoals = pgTable('finance_goals', {
  id:                 text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId:        text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name:               text('name').notNull(),
  targetAmountCents:  integer('target_amount_cents').notNull(),
  currentAmountCents: integer('current_amount_cents').notNull().default(0),
  targetDate:         timestamp('target_date'),
  priority:           text('priority', { enum: ['low', 'medium', 'high'] }).notNull().default('medium'),
  categoryId:         text('category_id'),
  imageUrl:           text('image_url'),
  status:             text('status', { enum: ['active', 'completed', 'paused'] }).notNull().default('active'),
  createdAt:          timestamp('created_at').notNull().defaultNow(),
  updatedAt:          timestamp('updated_at').notNull().defaultNow(),
});
