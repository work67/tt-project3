import { api } from './client';
import type { Balances, Expense, Me, Settlement, Todo, User } from '../types/models';

export const authApi = {
  me: () => api.get<Me>('/auth/me'),
  login: (username: string, password: string) =>
    api.post<Me>('/auth/login', { username, password }),
  logout: () => api.post<void>('/auth/logout'),
  /** Logs out every other session; this one stays logged in. */
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<Me>('/auth/password', { currentPassword, newPassword }),
};

export const usersApi = {
  list: () => api.get<User[]>('/users'),
};

export type NewTodo = Pick<Todo, 'title' | 'assigneeId' | 'dueDate'>;

export const todosApi = {
  list: () => api.get<Todo[]>('/todos'),
  create: (todo: NewTodo) => api.post<Todo>('/todos', todo),
  update: (id: number, changes: Partial<Omit<Todo, 'id'>>) =>
    api.patch<Todo>(`/todos/${id}`, changes),
  remove: (id: number) => api.delete(`/todos/${id}`),
};

export interface NewExpense {
  description: string;
  amountCents: number;
  paidBy: number;
  participantIds: number[];
}

export const expensesApi = {
  list: () => api.get<Expense[]>('/expenses'),
  create: (expense: NewExpense) => api.post<Expense>('/expenses', expense),
  remove: (id: number) => api.delete(`/expenses/${id}`),
};

export const settlementsApi = {
  list: () => api.get<Settlement[]>('/settlements'),
  create: (fromUserId: number, toUserId: number, amountCents: number) =>
    api.post<Settlement>('/settlements', { fromUserId, toUserId, amountCents }),
  remove: (id: number) => api.delete(`/settlements/${id}`),
};

export const balancesApi = {
  get: () => api.get<Balances>('/balances'),
};
