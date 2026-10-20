import { db, type Statement } from '../db/index.js';
import type { Expense } from '../types/models.js';

type ExpenseRow = Omit<Expense, 'shares'>;
type ShareRow = { expenseId: number; userId: number; shareCents: number };

export async function listExpenses(): Promise<Expense[]> {
  const [rows, shares] = await Promise.all([
    db().all<ExpenseRow>(
      `SELECT id, description, amount_cents AS amountCents, paid_by AS paidBy,
              created_by AS createdBy, created_at AS createdAt
       FROM expenses ORDER BY created_at DESC, id DESC`,
    ),
    db().all<ShareRow>(
      `SELECT expense_id AS expenseId, user_id AS userId, share_cents AS shareCents
       FROM expense_shares ORDER BY user_id`,
    ),
  ]);

  return rows.map((row) => ({
    ...row,
    shares: shares
      .filter((s) => s.expenseId === row.id)
      .map(({ userId, shareCents }) => ({ userId, shareCents })),
  }));
}

/**
 * Split `amountCents` equally. Leftover cents go one each to the first participants,
 * so the shares always add up exactly to the total.
 */
export function splitEvenly(amountCents: number, participantIds: number[]) {
  const ids = [...participantIds].sort((a, b) => a - b);
  const base = Math.floor(amountCents / ids.length);
  const remainder = amountCents % ids.length;
  return ids.map((userId, i) => ({ userId, shareCents: base + (i < remainder ? 1 : 0) }));
}

export interface ExpenseInput {
  description: string;
  amountCents: number;
  paidBy: number;
  participantIds: number[];
}

export async function createExpense(input: ExpenseInput, createdBy: number): Promise<Expense> {
  // D1 has no interactive transactions, so insert the expense and its shares in one
  // atomic batch. A batch runs serially, so MAX(id) is the expense just inserted.
  const statements: Statement[] = [
    {
      sql: 'INSERT INTO expenses (description, amount_cents, paid_by, created_by) VALUES (?, ?, ?, ?)',
      params: [input.description, input.amountCents, input.paidBy, createdBy],
    },
    ...splitEvenly(input.amountCents, input.participantIds).map((share) => ({
      sql: `INSERT INTO expense_shares (expense_id, user_id, share_cents)
            VALUES ((SELECT MAX(id) FROM expenses), ?, ?)`,
      params: [share.userId, share.shareCents],
    })),
  ];
  await db().batch(statements);

  const created = await db().get<{ id: number }>(
    'SELECT MAX(id) AS id FROM expenses WHERE created_by = ?',
    createdBy,
  );
  return (await listExpenses()).find((e) => e.id === created!.id)!;
}

export function getExpenseOwners(id: number) {
  return db().get<{ paidBy: number; createdBy: number }>(
    'SELECT paid_by AS paidBy, created_by AS createdBy FROM expenses WHERE id = ?',
    id,
  );
}

export async function deleteExpense(id: number) {
  await db().run('DELETE FROM expenses WHERE id = ?', id);
}
