import { db, type SqlValue } from '../db/index.js';
import type { Todo } from '../types/models.js';

const SELECT = `
  SELECT id, title, notes, assignee_id AS assigneeId, due_date AS dueDate,
         done, created_by AS createdBy, created_at AS createdAt
  FROM todos`;

type TodoRow = Omit<Todo, 'done'> & { done: number };

const toTodo = (row: TodoRow): Todo => ({ ...row, done: row.done === 1 });

export async function listTodos(): Promise<Todo[]> {
  const rows = await db().all<TodoRow>(`${SELECT} ORDER BY done, due_date IS NULL, due_date, id`);
  return rows.map(toTodo);
}

export async function getTodo(id: number): Promise<Todo | undefined> {
  const row = await db().get<TodoRow>(`${SELECT} WHERE id = ?`, id);
  return row && toTodo(row);
}

export interface TodoInput {
  title: string;
  notes: string;
  assigneeId: number | null;
  dueDate: string | null;
  done: boolean;
}

export async function createTodo(input: Omit<TodoInput, 'done'>, createdBy: number) {
  const { lastRowId } = await db().run(
    'INSERT INTO todos (title, notes, assignee_id, due_date, created_by) VALUES (?, ?, ?, ?, ?)',
    input.title,
    input.notes,
    input.assigneeId,
    input.dueDate,
    createdBy,
  );
  return (await getTodo(lastRowId))!;
}

const COLUMNS: Record<keyof TodoInput, string> = {
  title: 'title',
  notes: 'notes',
  assigneeId: 'assignee_id',
  dueDate: 'due_date',
  done: 'done',
};

export async function updateTodo(id: number, changes: Partial<TodoInput>) {
  const keys = Object.keys(changes) as (keyof TodoInput)[];
  if (keys.length > 0) {
    const sets = keys.map((k) => `${COLUMNS[k]} = ?`).join(', ');
    const values: SqlValue[] = keys.map((k) => {
      const v = changes[k];
      return typeof v === 'boolean' ? Number(v) : (v ?? null);
    });
    await db().run(`UPDATE todos SET ${sets} WHERE id = ?`, ...values, id);
  }
  return getTodo(id);
}

export async function deleteTodo(id: number): Promise<boolean> {
  return (await db().run('DELETE FROM todos WHERE id = ?', id)).changes > 0;
}
