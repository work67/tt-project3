import { useCallback, useRef, useState } from 'react';

/**
 * Runs one async action at a time. `guard` ignores calls while one is in flight (a ref, so a
 * fast double-click can't slip past before React re-renders); `busy` is for disabling buttons.
 */
export function useBusy() {
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);

  const guard = useCallback(async <T>(action: () => Promise<T>): Promise<T | undefined> => {
    if (inFlight.current) return undefined;
    inFlight.current = true;
    setBusy(true);
    try {
      return await action();
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }, []);

  return { busy, guard };
}
