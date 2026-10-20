import { api } from './client';
import type { Item } from '../types/item';

export const itemsApi = {
  list: () => api.get<Item[]>('/items'),
  create: (name: string) => api.post<Item>('/items', { name }),
};
