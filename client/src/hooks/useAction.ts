import { useCallback, useRef, useState } from 'react';

/**
 * Run a change against the API, then `reload`. Tracks `busy` (and ignores
 * calls while one is in flight) and keeps the last failure in `error`.
 * `run` resolves `true` on success, so callers only reset forms when it worked.
 */
export function useAction(reload?: () => Promise<unknown>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const run = useCallback(
    async (action: () => Promise<unknown>) => {
      if (inFlight.current) return false;
      inFlight.current = true;
      setBusy(true);
      setError(null);
      try {
        await action();
        await reload?.();
        return true;
      } catch (err) {
        setError((err as Error).message);
        return false;
      } finally {
        inFlight.current = false;
        setBusy(false);
      }
    },
    [reload],
  );

  return { run, busy, error, setError };
}
