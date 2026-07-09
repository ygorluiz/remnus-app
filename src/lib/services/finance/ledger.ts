import { db } from '@/db';
import { financeTransactions, financeAccounts } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export async function reconcileAccountBalance(accountId: string): Promise<number> {
  const [account] = await db
    .select({ initialBalanceCents: financeAccounts.initialBalanceCents })
    .from(financeAccounts)
    .where(eq(financeAccounts.id, accountId))
    .limit(1);

  if (!account) throw new Error('Account not found');

  const [result] = await db
    .select({
      totalIncome: sql<number>`COALESCE(SUM(CASE WHEN type = 'income' THEN amount_cents ELSE 0 END), 0)`,
      totalExpense: sql<number>`COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_cents ELSE 0 END), 0)`,
      totalRefund: sql<number>`COALESCE(SUM(CASE WHEN type = 'refund' THEN amount_cents ELSE 0 END), 0)`,
      totalTransferOut: sql<number>`COALESCE(SUM(CASE WHEN type = 'transfer' AND account_id = ${accountId} THEN amount_cents ELSE 0 END), 0)`,
      totalTransferIn: sql<number>`COALESCE(SUM(CASE WHEN type = 'transfer' AND destination_account_id = ${accountId} THEN amount_cents ELSE 0 END), 0)`,
    })
    .from(financeTransactions)
    .where(
      and(
        eq(financeTransactions.accountId, accountId),
        sql`status != 'reconciled'`,
      ),
    );

  const income = Number(result?.totalIncome ?? 0);
  const expense = Number(result?.totalExpense ?? 0);
  const refund = Number(result?.totalRefund ?? 0);
  const transferOut = Number(result?.totalTransferOut ?? 0);
  const transferIn = Number(result?.totalTransferIn ?? 0);

  const balance = account.initialBalanceCents + income + refund + transferIn - expense - transferOut;

  await db
    .update(financeAccounts)
    .set({ currentBalanceCents: balance, updatedAt: new Date() })
    .where(eq(financeAccounts.id, accountId));

  return balance;
}
