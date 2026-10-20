import type { Database, SqlValue } from './types.js';

// The slice of Cloudflare's D1 API we use (full types: @cloudflare/workers-types).
interface D1PreparedStatement {
  bind(...values: SqlValue[]): D1PreparedStatement;
  all<T>(): Promise<{ results: T[] }>;
  first<T>(): Promise<T | null>;
  run(): Promise<{ meta: { changes: number; last_row_id: number } }>;
}
export interface D1Database {
  prepare(sql: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<unknown>;
}

/** Cloudflare D1 binding. Schema comes from `wrangler d1 migrations apply`. */
export function createD1Database(d1: D1Database): Database {
  const prepare = (sql: string, params: SqlValue[]) => d1.prepare(sql).bind(...params);

  return {
    async all<T>(sql: string, ...params: SqlValue[]) {
      return (await prepare(sql, params).all<T>()).results;
    },
    async get<T>(sql: string, ...params: SqlValue[]) {
      return (await prepare(sql, params).first<T>()) ?? undefined;
    },
    async run(sql: string, ...params: SqlValue[]) {
      const { meta } = await prepare(sql, params).run();
      return { changes: meta.changes, lastRowId: meta.last_row_id };
    },
    async batch(statements) {
      await d1.batch(statements.map(({ sql, params = [] }) => prepare(sql, params)));
    },
  };
}
