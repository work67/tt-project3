import { db, type Statement } from './index.js';
import { env } from '../config/env.js';
import { hashPassword } from '../services/auth.service.js';
import { splitEvenly } from '../services/expenses.service.js';

// The ten people on the trip (see PLAN.md). Their ids are 1–10 in this order.
const PEOPLE = [
  ['alex', 'Alex'],
  ['priya', 'Priya'],
  ['ben', 'Ben'],
  ['mei', 'Mei'],
  ['diego', 'Diego'],
  ['sara', 'Sara'],
  ['kofi', 'Kofi'],
  ['hana', 'Hana'],
  ['liam', 'Liam'],
  ['zoe', 'Zoe'],
] as const;

type Username = (typeof PEOPLE)[number][0];
const EVERYONE = PEOPLE.map(([username]) => username);
const everyoneBut = (...skip: Username[]) => EVERYONE.filter((u) => !skip.includes(u));
const idOf = (username: Username) => EVERYONE.indexOf(username) + 1;

const STARTER_TODOS: [title: string, assignee: Username][] = [
  ['Pay villa deposit', 'alex'],
  ['Book surf lesson', 'priya'],
  ['Book Nusa Penida snorkeling boat', 'priya'],
  ['Arrange airport pickups', 'ben'],
  ['Reserve scooters', 'ben'],
  ['Book Mount Batur sunrise hike guide', 'kofi'],
  ['Everyone: buy travel insurance', 'sara'],
  ['Share packing list', 'hana'],
];

// Liam only joins for the last 3 days, so he skips the early activities.
const STARTER_EXPENSES: {
  description: string;
  amountCents: number;
  paidBy: Username;
  splitWith: readonly Username[];
}[] = [
  { description: 'Villa (5 nights)', amountCents: 240000, paidBy: 'alex', splitWith: EVERYONE },
  { description: 'Airport pickups', amountCents: 18000, paidBy: 'ben', splitWith: everyoneBut('liam') },
  { description: 'Groceries for the villa', amountCents: 13640, paidBy: 'mei', splitWith: EVERYONE },
  { description: 'Welcome dinner', amountCents: 31275, paidBy: 'mei', splitWith: everyoneBut('liam') },
  { description: 'Surf lesson', amountCents: 40500, paidBy: 'priya', splitWith: everyoneBut('liam') },
  { description: 'Nusa Penida snorkeling boat', amountCents: 45000, paidBy: 'priya', splitWith: everyoneBut('liam') },
  {
    description: 'Mount Batur sunrise hike',
    amountCents: 35000,
    paidBy: 'kofi',
    splitWith: ['alex', 'priya', 'diego', 'sara', 'kofi', 'zoe', 'liam'],
  },
  { description: 'Scooter rental', amountCents: 12000, paidBy: 'ben', splitWith: ['ben', 'diego', 'hana', 'liam'] },
];

async function userCount() {
  const row = await db().get<{ count: number }>('SELECT COUNT(*) AS count FROM users');
  return row?.count ?? 0;
}

/**
 * Create the ten accounts, starter to-dos and expenses if the database has no users.
 * Returns true if it seeded.
 */
export async function seedIfEmpty(): Promise<boolean> {
  if ((await userCount()) > 0) return false;
  if (!env.seedPassword) {
    throw new Error('SEED_PASSWORD is not set; refusing to create accounts without it');
  }

  // Everyone starts with the same password, so hash it once (scrypt is CPU-heavy on Workers).
  const passwordHash = hashPassword(env.seedPassword);
  const statements: Statement[] = [];

  PEOPLE.forEach(([username, name], i) => {
    statements.push({
      sql:
        'INSERT INTO users (id, username, display_name, password_hash, must_change_password) ' +
        'VALUES (?, ?, ?, ?, 1)',
      params: [i + 1, username, name, passwordHash],
    });
  });

  for (const [title, assignee] of STARTER_TODOS) {
    statements.push({
      sql: 'INSERT INTO todos (title, assignee_id, created_by) VALUES (?, ?, ?)',
      params: [title, idOf(assignee), idOf('alex')],
    });
  }

  STARTER_EXPENSES.forEach(({ description, amountCents, paidBy, splitWith }, i) => {
    const expenseId = i + 1;
    statements.push({
      sql: 'INSERT INTO expenses (id, description, amount_cents, paid_by, created_by) VALUES (?, ?, ?, ?, ?)',
      params: [expenseId, description, amountCents, idOf(paidBy), idOf(paidBy)],
    });
    for (const { userId, shareCents } of splitEvenly(amountCents, splitWith.map(idOf))) {
      statements.push({
        sql: 'INSERT INTO expense_shares (expense_id, user_id, share_cents) VALUES (?, ?, ?)',
        params: [expenseId, userId, shareCents],
      });
    }
  });

  try {
    await db().batch(statements);
  } catch (err) {
    // Two Workers can race to seed a fresh D1 database; the loser's batch rolls back.
    if ((await userCount()) > 0) return false;
    throw err;
  }

  console.log(
    `Seeded ${PEOPLE.length} users, ${STARTER_TODOS.length} to-dos and ` +
      `${STARTER_EXPENSES.length} expenses`,
  );
  return true;
}
