import { db } from '../db/index.js';
import type { Balances } from '../types/models.js';
import { listUsers } from './users.service.js';

/**
 * Net balance per person = paid for others - owed to others + repaid - received.
 * Positive means the group owes them money.
 */
export function computeBalances(): Balances {
  const net = new Map(listUsers().map((u) => [u.id, 0]));
  const add = (userId: number, cents: number) => net.set(userId, (net.get(userId) ?? 0) + cents);

  const paid = db
    .prepare('SELECT paid_by AS userId, SUM(amount_cents) AS cents FROM expenses GROUP BY paid_by')
    .all() as { userId: number; cents: number }[];
  for (const { userId, cents } of paid) add(userId, cents);

  const owed = db
    .prepare(
      'SELECT user_id AS userId, SUM(share_cents) AS cents FROM expense_shares GROUP BY user_id',
    )
    .all() as { userId: number; cents: number }[];
  for (const { userId, cents } of owed) add(userId, -cents);

  const settlements = db
    .prepare('SELECT from_user_id AS fromId, to_user_id AS toId, amount_cents AS cents FROM settlements')
    .all() as { fromId: number; toId: number; cents: number }[];
  for (const { fromId, toId, cents } of settlements) {
    add(fromId, cents);
    add(toId, -cents);
  }

  const netList = [...net].map(([userId, netCents]) => ({ userId, netCents }));
  return { net: netList, transfers: simplifyDebts(netList) };
}

/** Greedy settle-up: repeatedly match the biggest debtor with the biggest creditor. */
export function simplifyDebts(net: { userId: number; netCents: number }[]) {
  const creditors = net.filter((n) => n.netCents > 0).map((n) => ({ ...n }));
  const debtors = net.filter((n) => n.netCents < 0).map((n) => ({ ...n, netCents: -n.netCents }));
  const transfers: Balances['transfers'] = [];

  while (creditors.length && debtors.length) {
    creditors.sort((a, b) => b.netCents - a.netCents);
    debtors.sort((a, b) => b.netCents - a.netCents);
    const creditor = creditors[0];
    const debtor = debtors[0];
    const amountCents = Math.min(creditor.netCents, debtor.netCents);

    transfers.push({ fromUserId: debtor.userId, toUserId: creditor.userId, amountCents });
    creditor.netCents -= amountCents;
    debtor.netCents -= amountCents;
    if (creditor.netCents === 0) creditors.shift();
    if (debtor.netCents === 0) debtors.shift();
  }
  return transfers;
}
