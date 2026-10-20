import { db } from '../db/index.js';
import type { Settlement } from '../types/models.js';

const SELECT = `
  SELECT id, from_user_id AS fromUserId, to_user_id AS toUserId, amount_cents AS amountCents,
         created_by AS createdBy, created_at AS createdAt
  FROM settlements`;

export function listSettlements(): Promise<Settlement[]> {
  return db().all<Settlement>(`${SELECT} ORDER BY created_at DESC, id DESC`);
}

export function getSettlement(id: number): Promise<Settlement | undefined> {
  return db().get<Settlement>(`${SELECT} WHERE id = ?`, id);
}

export async function createSettlement(
  fromUserId: number,
  toUserId: number,
  amountCents: number,
  createdBy: number,
): Promise<Settlement> {
  const { lastRowId } = await db().run(
    'INSERT INTO settlements (from_user_id, to_user_id, amount_cents, created_by) VALUES (?, ?, ?, ?)',
    fromUserId,
    toUserId,
    amountCents,
    createdBy,
  );
  return (await getSettlement(lastRowId))!;
}

export async function deleteSettlement(id: number) {
  await db().run('DELETE FROM settlements WHERE id = ?', id);
}
