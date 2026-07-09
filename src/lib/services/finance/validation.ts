import { z } from 'zod';

const workspaceId = z.string().min(1, 'workspaceId required');
const cents = z.number().int('Must be whole cents').safe('Must be finite');

export const accountSchema = z.object({
  workspaceId,
  name: z.string().min(1, 'Account name required').max(100),
  bank: z.string().max(100).optional(),
  type: z.enum(['checking', 'savings', 'wallet', 'cash', 'digital', 'international']).default('checking'),
  color: z.string().max(20).optional(),
  icon: z.string().max(50).optional(),
  initialBalanceCents: cents.default(0),
  currency: z.string().length(3).default('BRL'),
  includeInTotal: z.boolean().default(true),
  isArchived: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

export const accountUpdateSchema = accountSchema.partial().omit({ workspaceId: true });

export const transactionSchema = z.object({
  workspaceId,
  title: z.string().min(1, 'Title required').max(200),
  description: z.string().max(500).optional(),
  amountCents: cents.refine(v => v > 0, 'Amount must be positive'),
  type: z.enum(['income', 'expense', 'transfer', 'refund']),
  categoryId: z.string().optional(),
  accountId: z.string().min(1, 'Account required'),
  destinationAccountId: z.string().optional(),
  cardId: z.string().optional(),
  transactionDate: z.string().or(z.date()).transform(v => new Date(v)),
  status: z.enum(['pending', 'cleared', 'reconciled']).default('pending'),
  currency: z.string().length(3).default('BRL'),
  isInstallment: z.boolean().default(false),
  installmentGroupId: z.string().optional(),
  currentInstallment: z.number().int().optional(),
  totalInstallments: z.number().int().optional(),
  tags: z.array(z.string()).default([]),
  notes: z.string().max(2000).optional(),
  location: z.string().max(200).optional(),
});

export const transactionUpdateSchema = transactionSchema.partial().omit({ workspaceId: true });

export const categorySchema = z.object({
  workspaceId,
  name: z.string().min(1, 'Category name required').max(100),
  parentId: z.string().optional(),
  icon: z.string().max(50).optional(),
  emoji: z.string().max(10).optional(),
  color: z.string().max(20).optional(),
});

export const categoryUpdateSchema = categorySchema.partial().omit({ workspaceId: true });
