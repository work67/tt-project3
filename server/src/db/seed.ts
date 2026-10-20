import { db, transaction } from './index.js';
import { env } from '../config/env.js';
import { hashPassword } from '../services/auth.service.js';

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

/** Create the ten accounts and starter to-dos the first time the server runs. */
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
  });

  console.log(`Seeded ${PEOPLE.length} users (password: "${env.seedPassword}")`);
}
