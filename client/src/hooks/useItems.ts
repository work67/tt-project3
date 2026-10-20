import { useCallback, useEffect, useState } from 'react';
import { itemsApi } from '../api/items';
import type { Item } from '../types/item';

export function useItems() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    itemsApi
      .list()
      .then(setItems)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const addItem = useCallback(async (name: string) => {
    const item = await itemsApi.create(name);
    setItems((prev) => [...prev, item]);
  }, []);

  return { items, loading, error, addItem };
}
