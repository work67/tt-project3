import { useCallback, useEffect, useState } from 'react';

/** Load data on mount and expose `reload` for after a change. */
export function useLoader<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setData(await load());
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [load]);

  // Initial load. Mirrors `reload`, but sets state only from the promise callbacks and
  // ignores a result that arrives after `load` changed or the component unmounted.
  useEffect(() => {
    let current = true;
    load().then(
      (result) => {
        if (!current) return;
        setData(result);
        setError(null);
      },
      (err: unknown) => {
        if (current) setError((err as Error).message);
      },
    );
    return () => {
      current = false;
    };
  }, [load]);

  return { data, error, reload };
}
