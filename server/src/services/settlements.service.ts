import { db } from '../db/index.js';
import type { Settlement } from '../types/models.js';

const SELECT = `
  SELECT id, from_user_id AS fromUserId, to_user_id AS toUserId, amount_cents AS amountCents,
         created_by AS createdBy, created_at AS createdAt
  FROM settlements`;

/** One person's net balance in cents (same formula as computeBalances). Takes the user id 4 times. */
const NET_CENTS = `(
  (SELECT COALESCE(SUM(amount_cents), 0) FROM expenses WHERE paid_by = ?)
  - (SELECT COALESCE(SUM(share_cents), 0) FROM expense_shares WHERE user_id = ?)
  + (SELECT COALESCE(SUM(amount_cents), 0) FROM settlements WHERE from_user_id = ?)
  - (SELECT COALESCE(SUM(amount_cents), 0) FROM settlements WHERE to_user_id = ?)
)`;

export function listSettlements(): Promise<Settlement[]> {
  return db().all<Settlement>(`${SELECT} ORDER BY created_at DESC, id DESC`);
}

export function getSettlement(id: number): Promise<Settlement | undefined> {
  return db().get<Settlement>(`${SELECT} WHERE id = ?`, id);
}

/**
 * Records a repayment, but only if the payer still owes at least `amountCents` and the
 * receiver is still owed at least that much. The check and insert are one statement, so a
 * double-click or two people marking the same debt paid can't both get through.
 * Returns undefined when the payment would overshoot.
 */
export async function createSettlement(
  fromUserId: number,
  toUserId: number,
  amountCents: number,
  createdBy: number,
): Promise<Settlement | undefined> {
  const { changes, lastRowId } = await db().run(
    `INSERT INTO settlements (from_user_id, to_user_id, amount_cents, created_by)
     SELECT ?, ?, ?, ?
     WHERE ${NET_CENTS} <= -? AND ${NET_CENTS} >= ?`,
    fromUserId,
    toUserId,
    amountCents,
    createdBy,
    ...Array(4).fill(fromUserId),
    amountCents,
    ...Array(4).fill(toUserId),
    amountCents,
  );
  if (changes === 0) return undefined;
  return (await getSettlement(lastRowId))!;
}

export async function deleteSettlement(id: number) {
  await db().run('DELETE FROM settlements WHERE id = ?', id);
}
