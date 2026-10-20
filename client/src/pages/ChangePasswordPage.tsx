import { useState, type FormEvent } from 'react';
import { authApi } from '../api';
import type { Me } from '../types/models';

interface Props {
  /** First login: the account is still on the shared password, so there's no way out but logging out. */
  forced: boolean;
  onChanged: (me: Me) => void;
  onCancel: () => void;
}

export default function ChangePasswordPage({ forced, onChanged, onCancel }: Props) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (next !== confirm) {
      setError("The new passwords don't match");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      onChanged(await authApi.changePassword(current, next));
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form className="card stack password-form" onSubmit={handleSubmit}>
      <h2>{forced ? 'Choose your own password' : 'Change password'}</h2>
      <p className="muted small">
        {forced
          ? 'Everyone starts with the same password, so pick one only you know before you continue.'
          : 'This logs you out on your other devices.'}
      </p>
      <label>
        Current password
        <input
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          autoComplete="current-password"
          autoFocus
          required
        />
      </label>
      <label>
        New password
        <input
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
      </label>
      <label>
        Repeat new password
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
      </label>
      {error && <p className="error">{error}</p>}
      <div className="row">
        <button type="submit" className="primary" disabled={busy}>
          {busy ? 'Saving…' : 'Save password'}
        </button>
        <button type="button" className="link" onClick={onCancel}>
          {forced ? 'Log out' : 'Cancel'}
        </button>
      </div>
    </form>
  );
}
