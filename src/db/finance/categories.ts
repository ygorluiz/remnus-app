import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { workspaces } from '../pg-schema';

export const financeCategories = pgTable('finance_categories', {
  id:          text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name:        text('name').notNull(),
  parentId:    text('parent_id'),
  icon:        text('icon'),
  emoji:       text('emoji'),
  color:       text('color'),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
  updatedAt:   timestamp('updated_at').notNull().defaultNow(),
});
