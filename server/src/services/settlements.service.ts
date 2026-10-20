import { db } from '../db/index.js';
import type { Settlement } from '../types/models.js';

const SELECT = `
  SELECT id, from_user_id AS fromUserId, to_user_id AS toUserId, amount_cents AS amountCents,
         created_by AS createdBy, created_at AS createdAt
  FROM settlements`;

export function listSettlements(): Settlement[] {
  return db.prepare(`${SELECT} ORDER BY created_at DESC, id DESC`).all() as unknown as Settlement[];
}

export function getSettlement(id: number): Settlement | undefined {
  return db.prepare(`${SELECT} WHERE id = ?`).get(id) as Settlement | undefined;
}

export function createSettlement(
  fromUserId: number,
  toUserId: number,
  amountCents: number,
  createdBy: number,
): Settlement {
  const { lastInsertRowid } = db
    .prepare(
      'INSERT INTO settlements (from_user_id, to_user_id, amount_cents, created_by) VALUES (?, ?, ?, ?)',
    )
    .run(fromUserId, toUserId, amountCents, createdBy);
  return getSettlement(Number(lastInsertRowid))!;
}

export function deleteSettlement(id: number) {
  db.prepare('DELETE FROM settlements WHERE id = ?').run(id);
}
