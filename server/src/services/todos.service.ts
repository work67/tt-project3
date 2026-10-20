import { db } from '../db/index.js';
import type { Todo } from '../types/models.js';

const SELECT = `
  SELECT id, title, notes, assignee_id AS assigneeId, due_date AS dueDate,
         done, created_by AS createdBy, created_at AS createdAt
  FROM todos`;

type TodoRow = Omit<Todo, 'done'> & { done: number };

const toTodo = (row: TodoRow): Todo => ({ ...row, done: row.done === 1 });

export function listTodos(): Todo[] {
  const rows = db.prepare(`${SELECT} ORDER BY done, due_date IS NULL, due_date, id`).all();
  return (rows as unknown as TodoRow[]).map(toTodo);
}

export function getTodo(id: number): Todo | undefined {
  const row = db.prepare(`${SELECT} WHERE id = ?`).get(id) as TodoRow | undefined;
  return row && toTodo(row);
}

export interface TodoInput {
  title: string;
  notes: string;
  assigneeId: number | null;
  dueDate: string | null;
  done: boolean;
}

export function createTodo(input: Omit<TodoInput, 'done'>, createdBy: number): Todo {
  const { lastInsertRowid } = db
    .prepare(
      'INSERT INTO todos (title, notes, assignee_id, due_date, created_by) VALUES (?, ?, ?, ?, ?)',
    )
    .run(input.title, input.notes, input.assigneeId, input.dueDate, createdBy);
  return getTodo(Number(lastInsertRowid))!;
}

const COLUMNS: Record<keyof TodoInput, string> = {
  title: 'title',
  notes: 'notes',
  assigneeId: 'assignee_id',
  dueDate: 'due_date',
  done: 'done',
};

export function updateTodo(id: number, changes: Partial<TodoInput>): Todo | undefined {
  const keys = Object.keys(changes) as (keyof TodoInput)[];
  if (keys.length > 0) {
    const sets = keys.map((k) => `${COLUMNS[k]} = ?`).join(', ');
    const values = keys.map((k) => {
      const v = changes[k];
      return typeof v === 'boolean' ? Number(v) : (v ?? null);
    });
    db.prepare(`UPDATE todos SET ${sets} WHERE id = ?`).run(...values, id);
  }
  return getTodo(id);
}

export function deleteTodo(id: number): boolean {
  return db.prepare('DELETE FROM todos WHERE id = ?').run(id).changes > 0;
}
