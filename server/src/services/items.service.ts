import { randomUUID } from 'node:crypto';
import type { Item } from '../types/item.js';

// In-memory store — replace with a database layer later.
const items: Item[] = [{ id: randomUUID(), name: 'First item', createdAt: new Date().toISOString() }];

export function findAll(): Item[] {
  return items;
}

export function findById(id: string): Item | undefined {
  return items.find((item) => item.id === id);
}

export function create(name: string): Item {
  const item: Item = { id: randomUUID(), name, createdAt: new Date().toISOString() };
  items.push(item);
  return item;
}
