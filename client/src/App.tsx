import { useEffect, useMemo, useState } from 'react';
import { authApi, usersApi } from './api';
import { TripContext } from './lib/trip';
import LoginPage from './pages/LoginPage';
import TodosPage from './pages/TodosPage';
import ExpensesPage from './pages/ExpensesPage';
import BalancesPage from './pages/BalancesPage';
import type { User } from './types/models';

const TABS = [
  { id: 'todos', label: 'To-dos', Page: TodosPage },
  { id: 'expenses', label: 'Expenses', Page: ExpensesPage },
  { id: 'balances', label: 'Who owes what', Page: BalancesPage },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function App() {
  const [me, setMe] = useState<User | null | undefined>(undefined); // undefined = still checking
  const [users, setUsers] = useState<User[]>([]);
  const [tab, setTab] = useState<TabId>('todos');

  useEffect(() => {
    authApi.me().then(setMe, () => setMe(null));
  }, []);

  useEffect(() => {
    if (me) usersApi.list().then(setUsers, () => setUsers([]));
  }, [me]);

  const trip = useMemo(() => {
    if (!me) return null;
    const names = new Map(users.map((u) => [u.id, u.displayName]));
    return { me, users, nameOf: (id: number | null) => (id === null ? '—' : (names.get(id) ?? '?')) };
  }, [me, users]);

  if (me === undefined) return null;
  if (me === null) return <LoginPage onLogin={setMe} />;
  if (!trip || users.length === 0) return <p className="container muted">Loading…</p>;

  async function logout() {
    await authApi.logout();
    setMe(null);
    setTab('todos');
  }

  const { Page } = TABS.find((t) => t.id === tab)!;

  return (
    <TripContext.Provider value={trip}>
      <header className="topbar">
        <div className="container row between">
          <strong>Bali Trip 🌴</strong>
          <span className="row">
            <span className="muted">Hi, {me.displayName}</span>
            <button className="link" onClick={logout}>
              Log out
            </button>
          </span>
        </div>
        <nav className="container tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              className={tab === t.id ? 'active' : ''}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="container">
        <Page />
      </main>
    </TripContext.Provider>
  );
}
