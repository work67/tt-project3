import { db, transaction } from '../db/index.js';
import type { Expense } from '../types/models.js';

type ExpenseRow = Omit<Expense, 'shares'>;
type ShareRow = { expenseId: number; userId: number; shareCents: number };

export function listExpenses(): Expense[] {
  const rows = db
    .prepare(
      `SELECT id, description, amount_cents AS amountCents, paid_by AS paidBy,
              created_by AS createdBy, created_at AS createdAt
       FROM expenses ORDER BY created_at DESC, id DESC`,
    )
    .all() as unknown as ExpenseRow[];
  const shares = db
    .prepare(
      `SELECT expense_id AS expenseId, user_id AS userId, share_cents AS shareCents
       FROM expense_shares ORDER BY user_id`,
    )
    .all() as unknown as ShareRow[];

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

export function createExpense(input: ExpenseInput, createdBy: number): Expense {
  const id = transaction(() => {
    const { lastInsertRowid } = db
      .prepare(
        'INSERT INTO expenses (description, amount_cents, paid_by, created_by) VALUES (?, ?, ?, ?)',
      )
      .run(input.description, input.amountCents, input.paidBy, createdBy);
    const insertShare = db.prepare(
      'INSERT INTO expense_shares (expense_id, user_id, share_cents) VALUES (?, ?, ?)',
    );
    for (const share of splitEvenly(input.amountCents, input.participantIds)) {
      insertShare.run(lastInsertRowid, share.userId, share.shareCents);
    }
    return Number(lastInsertRowid);
  });
  return listExpenses().find((e) => e.id === id)!;
}

export function getExpenseOwners(id: number): { paidBy: number; createdBy: number } | undefined {
  return db
    .prepare('SELECT paid_by AS paidBy, created_by AS createdBy FROM expenses WHERE id = ?')
    .get(id) as { paidBy: number; createdBy: number } | undefined;
}

export function deleteExpense(id: number) {
  db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
}
