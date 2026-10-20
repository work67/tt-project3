import { useState, type FormEvent } from 'react';
import { expensesApi } from '../api';
import { useAction } from '../hooks/useAction';
import { useLoader } from '../hooks/useLoader';
import { useTrip } from '../lib/trip';
import { formatCents, parseDollars } from '../lib/money';
import PersonSelect from '../components/PersonSelect';

export default function ExpensesPage() {
  const { me, users, nameOf } = useTrip();
  const { data: expenses, error, reload } = useLoader(expensesApi.list);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState<number>(me.id);
  const [participants, setParticipants] = useState<Set<number>>(
    () => new Set(users.map((u) => u.id)),
  );
  const { run, busy, error: actionError, setError: setActionError } = useAction(reload);

  function toggle(id: number) {
    setParticipants((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    const amountCents = parseDollars(amount);
    if (amountCents === null) return setActionError('Enter an amount like 45 or 45.50');
    if (participants.size === 0) return setActionError('Pick at least one person to split with');
    const ok = await run(() =>
      expensesApi.create({ description, amountCents, paidBy, participantIds: [...participants] }),
    );
    if (ok) {
      setDescription('');
      setAmount('');
    }
  }

  function handleDelete(id: number, label: string) {
    if (confirm(`Delete "${label}"?`)) void run(() => expensesApi.remove(id));
  }

  const preview = parseDollars(amount);
  const total = (expenses ?? []).reduce((sum, e) => sum + e.amountCents, 0);

  return (
    <section className="stack">
      <form className="card stack" onSubmit={handleAdd}>
        <h2>Add an expense</h2>
        <div className="row wrap">
          <input
            className="grow"
            placeholder="What was it? (e.g. Surf lesson)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
          <input
            className="amount"
            inputMode="decimal"
            placeholder="$0.00"
            aria-label="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
        <label className="row">
          Paid by
          <PersonSelect value={paidBy} onChange={(id) => setPaidBy(id ?? me.id)} />
        </label>
        <fieldset>
          <legend>
            Split between ({participants.size}){' '}
            <button
              type="button"
              className="link"
              onClick={() => setParticipants(new Set(users.map((u) => u.id)))}
            >
              everyone
            </button>{' '}
            <button type="button" className="link" onClick={() => setParticipants(new Set())}>
              nobody
            </button>
          </legend>
          <div className="chips">
            {users.map((u) => (
              <label key={u.id} className={`chip ${participants.has(u.id) ? 'on' : ''}`}>
                <input type="checkbox" checked={participants.has(u.id)} onChange={() => toggle(u.id)} />
                {u.displayName}
              </label>
            ))}
          </div>
        </fieldset>
        {preview !== null && participants.size > 0 && (
          <p className="muted small">
            About {formatCents(Math.floor(preview / participants.size))} each
          </p>
        )}
        {actionError && <p className="error">{actionError}</p>}
        <button type="submit" className="primary" disabled={busy}>
          Add expense
        </button>
      </form>

      <div className="row between">
        <h2>All expenses</h2>
        <span className="muted">Trip total {formatCents(total)}</span>
      </div>
      {error && <p className="error">{error}</p>}
      {!expenses && !error && <p className="muted">Loading…</p>}

      <ul className="list">
        {expenses?.map((exp) => {
          const myShare = exp.shares.find((s) => s.userId === me.id)?.shareCents;
          const canDelete = exp.paidBy === me.id || exp.createdBy === me.id;
          return (
            <li key={exp.id} className="card expense">
              <div className="grow">
                <div className="row between">
                  <strong>{exp.description}</strong>
                  <strong>{formatCents(exp.amountCents)}</strong>
                </div>
                <div className="muted small">
                  {nameOf(exp.paidBy)} paid · split{' '}
                  {exp.shares.length === users.length
                    ? 'between everyone'
                    : `with ${exp.shares.map((s) => nameOf(s.userId)).join(', ')}`}
                  {myShare !== undefined && <> · your share {formatCents(myShare)}</>}
                </div>
              </div>
              {canDelete && (
                <button
                  className="icon"
                  aria-label="Delete"
                  title="Delete"
                  disabled={busy}
                  onClick={() => handleDelete(exp.id, exp.description)}
                >
                  ✕
                </button>
              )}
            </li>
          );
        })}
        {expenses?.length === 0 && <li className="muted empty">No expenses yet.</li>}
      </ul>
    </section>
  );
}
