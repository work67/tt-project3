import { useState, type FormEvent } from 'react';
import { todosApi } from '../api';
import { useAction } from '../hooks/useAction';
import { useLoader } from '../hooks/useLoader';
import { useTrip } from '../lib/trip';
import PersonSelect from '../components/PersonSelect';
import type { Todo } from '../types/models';

type Filter = 'all' | 'mine' | 'open';

export default function TodosPage() {
  const { me, nameOf } = useTrip();
  const { data: todos, error, reload } = useLoader(todosApi.list);
  const [filter, setFilter] = useState<Filter>('open');
  const [title, setTitle] = useState('');
  const [assigneeId, setAssigneeId] = useState<number | null>(null);
  const [dueDate, setDueDate] = useState('');
  const { run, busy, error: actionError } = useAction(reload);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (await run(() => todosApi.create({ title, assigneeId, dueDate: dueDate || null }))) {
      setTitle('');
      setDueDate('');
    }
  }

  const visible = (todos ?? []).filter((t: Todo) => {
    if (filter === 'mine') return t.assigneeId === me.id;
    if (filter === 'open') return !t.done;
    return true;
  });
  const openCount = (todos ?? []).filter((t) => !t.done).length;

  return (
    <section className="stack">
      <form className="card row wrap" onSubmit={handleAdd}>
        <input
          className="grow"
          placeholder="Add a to-do…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <PersonSelect
          value={assigneeId}
          onChange={setAssigneeId}
          emptyLabel="Anyone"
          ariaLabel="Assign to"
        />
        <input
          type="date"
          aria-label="Due date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
        <button type="submit" className="primary" disabled={busy}>
          Add
        </button>
      </form>

      <div className="row between">
        <div className="segmented" role="tablist">
          {(['open', 'mine', 'all'] as const).map((f) => (
            <button
              key={f}
              role="tab"
              aria-selected={filter === f}
              className={filter === f ? 'active' : ''}
              onClick={() => setFilter(f)}
            >
              {f === 'open' ? 'Open' : f === 'mine' ? 'Mine' : 'All'}
            </button>
          ))}
        </div>
        <span className="muted">{openCount} open</span>
      </div>

      {(error || actionError) && <p className="error">{error ?? actionError}</p>}
      {!todos && !error && <p className="muted">Loading…</p>}

      <ul className="list">
        {visible.map((todo) => (
          <li key={todo.id} className={`card todo ${todo.done ? 'done' : ''}`}>
            <input
              type="checkbox"
              aria-label={`Mark "${todo.title}" done`}
              checked={todo.done}
              onChange={() => run(() => todosApi.update(todo.id, { done: !todo.done }))}
            />
            <div className="grow">
              <div className="todo-title">{todo.title}</div>
              <div className="muted small">
                {todo.dueDate && <>Due {todo.dueDate} · </>}
                Added by {nameOf(todo.createdBy)}
              </div>
            </div>
            <PersonSelect
              value={todo.assigneeId}
              onChange={(id) => run(() => todosApi.update(todo.id, { assigneeId: id }))}
              emptyLabel="Unassigned"
              ariaLabel="Assignee"
            />
            <button
              className="icon"
              aria-label="Delete"
              title="Delete"
              onClick={() => {
                if (confirm(`Delete "${todo.title}"?`)) void run(() => todosApi.remove(todo.id));
              }}
            >
              ✕
            </button>
          </li>
        ))}
        {todos && visible.length === 0 && <li className="muted empty">Nothing here.</li>}
      </ul>
    </section>
  );
}
