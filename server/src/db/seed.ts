import { db, transaction } from './index.js';
import { env } from '../config/env.js';
import { hashPassword } from '../services/auth.service.js';
import { splitEvenly } from '../services/expenses.service.js';

// The ten people on the trip (see PLAN.md).
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

const STARTER_TODOS: [title: string, assignee: string][] = [
  ['Pay villa deposit', 'alex'],
  ['Book surf lesson', 'priya'],
  ['Book Nusa Penida snorkeling boat', 'priya'],
  ['Arrange airport pickups', 'ben'],
  ['Reserve scooters', 'ben'],
  ['Book Mount Batur sunrise hike guide', 'kofi'],
  ['Everyone: buy travel insurance', 'sara'],
  ['Share packing list', 'hana'],
];

type Username = (typeof PEOPLE)[number][0];
const EVERYONE = PEOPLE.map(([username]) => username);
const everyoneBut = (...skip: Username[]) => EVERYONE.filter((u) => !skip.includes(u));

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

/** Create the ten accounts, starter to-dos and expenses the first time the server runs. */
export function seedIfEmpty() {
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM users').get() as { count: number };
  if (count > 0) return;

  transaction(() => {
    const insertUser = db.prepare(
      'INSERT INTO users (username, display_name, password_hash) VALUES (?, ?, ?)',
    );
    const ids = new Map<string, number>();
    for (const [username, name] of PEOPLE) {
      const { lastInsertRowid } = insertUser.run(username, name, hashPassword(env.seedPassword));
      ids.set(username, Number(lastInsertRowid));
    }

    const insertTodo = db.prepare(
      'INSERT INTO todos (title, assignee_id, created_by) VALUES (?, ?, ?)',
    );
    for (const [title, assignee] of STARTER_TODOS) {
      insertTodo.run(title, ids.get(assignee)!, ids.get('alex')!);
    }

    const insertExpense = db.prepare(
      'INSERT INTO expenses (description, amount_cents, paid_by, created_by) VALUES (?, ?, ?, ?)',
    );
    const insertShare = db.prepare(
      'INSERT INTO expense_shares (expense_id, user_id, share_cents) VALUES (?, ?, ?)',
    );
    for (const { description, amountCents, paidBy, splitWith } of STARTER_EXPENSES) {
      const payerId = ids.get(paidBy)!;
      const { lastInsertRowid } = insertExpense.run(description, amountCents, payerId, payerId);
      const participantIds = splitWith.map((u) => ids.get(u)!);
      for (const { userId, shareCents } of splitEvenly(amountCents, participantIds)) {
        insertShare.run(lastInsertRowid, userId, shareCents);
      }
    }
  });

  console.log(
    `Seeded ${PEOPLE.length} users, ${STARTER_TODOS.length} to-dos and ` +
      `${STARTER_EXPENSES.length} expenses (password: "${env.seedPassword}")`,
  );
}
