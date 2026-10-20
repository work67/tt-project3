import { useState, type FormEvent } from 'react';
import { useItems } from '../hooks/useItems';

export default function HomePage() {
  const { items, loading, error, addItem } = useItems();
  const [name, setName] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await addItem(name);
    setName('');
  }

  if (loading) return <p>Loading…</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <section>
      <form onSubmit={handleSubmit}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New item" />
        <button type="submit">Add</button>
      </form>
      <ul>
        {items.map((item) => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </section>
  );
}
