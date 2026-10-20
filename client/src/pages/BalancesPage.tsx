import { useCallback, useState, type FormEvent } from 'react';
import { balancesApi, settlementsApi } from '../api';
import { useLoader } from '../hooks/useLoader';
import { useTrip } from '../lib/trip';
import { formatCents, parseDollars } from '../lib/money';
import PersonSelect from '../components/PersonSelect';

export default function BalancesPage() {
  const { me, nameOf } = useTrip();
  const load = useCallback(
    () => Promise.all([balancesApi.get(), settlementsApi.list()]),
    [],
  );
  const { data, error, reload } = useLoader(load);
  const [toUserId, setToUserId] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  async function recordPayment(fromUserId: number, to: number, amountCents: number) {
    try {
      await settlementsApi.create(fromUserId, to, amountCents);
      setFormError(null);
      await reload();
    } catch (err) {
      setFormError((err as Error).message);
    }
  }

  async function undoPayment(id: number) {
    if (!confirm('Undo this payment?')) return;
    try {
      await settlementsApi.remove(id);
      setFormError(null);
      await reload();
    } catch (err) {
      setFormError((err as Error).message);
    }
  }

  async function handleManual(e: FormEvent) {
    e.preventDefault();
    const cents = parseDollars(amount);
    if (toUserId === null) return setFormError('Who did you pay?');
    if (cents === null) return setFormError('Enter an amount like 20 or 20.50');
    await recordPayment(me.id, toUserId, cents);
    setAmount('');
  }

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p className="muted">Loading…</p>;
  const [balances, settlements] = data;

  const myNet = balances.net.find((n) => n.userId === me.id)?.netCents ?? 0;
  const sorted = [...balances.net].sort((a, b) => b.netCents - a.netCents);

  return (
    <section className="stack">
      <div className={`card summary ${myNet > 0 ? 'pos' : myNet < 0 ? 'neg' : ''}`}>
        {myNet > 0 && <>You're owed {formatCents(myNet)}</>}
        {myNet < 0 && <>You owe {formatCents(-myNet)}</>}
        {myNet === 0 && <>You're all square 🎉</>}
      </div>

      <h2>Settle up</h2>
      <ul className="list">
        {balances.transfers.map((t) => {
          const involved = t.fromUserId === me.id || t.toUserId === me.id;
          return (
            <li key={`${t.fromUserId}-${t.toUserId}`} className={`card row ${involved ? 'mine' : ''}`}>
              <span className="grow">
                <strong>{nameOf(t.fromUserId)}</strong> pays <strong>{nameOf(t.toUserId)}</strong>
              </span>
              <strong>{formatCents(t.amountCents)}</strong>
              {involved && (
                <button onClick={() => void recordPayment(t.fromUserId, t.toUserId, t.amountCents)}>
                  Mark paid
                </button>
              )}
            </li>
          );
        })}
        {balances.transfers.length === 0 && <li className="muted empty">Everyone is square.</li>}
      </ul>

      <h2>Everyone</h2>
      <ul className="list balances">
        {sorted.map((n) => (
          <li key={n.userId} className="row between">
            <span>{nameOf(n.userId)}</span>
            <span className={n.netCents > 0 ? 'pos' : n.netCents < 0 ? 'neg' : 'muted'}>
              {n.netCents > 0 ? '+' : ''}
              {formatCents(n.netCents)}
            </span>
          </li>
        ))}
      </ul>

      <form className="card stack" onSubmit={(e) => void handleManual(e)}>
        <h2>Record a payment you made</h2>
        <div className="row wrap">
          <PersonSelect value={toUserId} onChange={setToUserId} emptyLabel="Paid to…" ariaLabel="Paid to" />
          <input
            className="amount"
            inputMode="decimal"
            placeholder="$0.00"
            aria-label="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <button type="submit" className="primary">
            Record
          </button>
        </div>
        {formError && <p className="error">{formError}</p>}
      </form>

      <h2>Payment history</h2>
      <ul className="list">
        {settlements.map((s) => {
          const canDelete = [s.createdBy, s.fromUserId, s.toUserId].includes(me.id);
          return (
            <li key={s.id} className="card row">
              <span className="grow">
                {nameOf(s.fromUserId)} paid {nameOf(s.toUserId)} {formatCents(s.amountCents)}
                <span className="muted small"> · {s.createdAt.slice(0, 10)}</span>
              </span>
              {canDelete && (
                <button
                  className="icon"
                  aria-label="Undo payment"
                  title="Undo"
                  onClick={() => void undoPayment(s.id)}
                >
                  ✕
                </button>
              )}
            </li>
          );
        })}
        {settlements.length === 0 && <li className="muted empty">No payments recorded yet.</li>}
      </ul>
    </section>
  );
}
