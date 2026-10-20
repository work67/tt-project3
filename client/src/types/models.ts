// Mirrors server/src/types/models.ts
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
  net: { userId: number; netCents: number }[];
  transfers: { fromUserId: number; toUserId: number; amountCents: number }[];
}
