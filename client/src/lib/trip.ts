import { createContext, useContext } from 'react';
import type { User } from '../types/models';

export interface TripContextValue {
  me: User;
  users: User[];
  nameOf: (id: number | null) => string;
}

export const TripContext = createContext<TripContextValue | null>(null);

/** The logged-in user and the list of trip members. */
export function useTrip(): TripContextValue {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error('useTrip must be used inside <TripContext.Provider>');
  return ctx;
}
