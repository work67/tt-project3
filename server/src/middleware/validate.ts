import { HttpError } from './errorHandler.js';
import { userExists } from '../services/users.service.js';

export function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new HttpError(400, `"${field}" is required`);
  return value.trim();
}

export function optionalString(value: unknown, field: string): string {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') throw new HttpError(400, `"${field}" must be text`);
  return value.trim();
}

export function requireCents(value: unknown, field: string): number {
  if (!Number.isInteger(value) || (value as number) <= 0) {
    throw new HttpError(400, `"${field}" must be a positive whole number of cents`);
  }
  return value as number;
}

export function requireUserId(value: unknown, field: string): number {
  if (!userExists(value)) throw new HttpError(400, `"${field}" is not a trip member`);
  return value;
}

export function optionalUserId(value: unknown, field: string): number | null {
  return value === null || value === undefined ? null : requireUserId(value, field);
}

export function optionalDate(value: unknown, field: string): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new HttpError(400, `"${field}" must be a YYYY-MM-DD date`);
  }
  return value;
}

export function idParam(value: string): number {
  const id = Number(value);
  if (!Number.isInteger(id)) throw new HttpError(400, 'Invalid id');
  return id;
}
