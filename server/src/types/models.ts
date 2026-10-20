export interface User {
  id: number;
  username: string;
  displayName: string;
}

export interface Todo {
  id: number;
  title: string;
  notes: string;
  assigneeId: number | null;
  dueDate: string | null;
  done: boolean;
  createdBy: number;
  createdAt: string;
}

export interface Expense {
  id: number;
  description: string;
  amountCents: number;
  paidBy: number;
  createdBy: number;
  createdAt: string;
  shares: { userId: number; shareCents: number }[];
}

export interface Settlement {
  id: number;
  fromUserId: number;
  toUserId: number;
  amountCents: number;
  createdBy: number;
  createdAt: string;
}

export interface Balances {
  /** Positive = this person is owed money; negative = they owe. */
  net: { userId: number; netCents: number }[];
  /** Fewest payments that settle everyone up. */
  transfers: { fromUserId: number; toUserId: number; amountCents: number }[];
}
