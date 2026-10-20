export type SqlValue = string | number | null;

export interface Statement {
  sql: string;
  params?: SqlValue[];
}

/**
 * The few database operations the app needs, async so the same services run on
 * local SQLite (node:sqlite) and Cloudflare D1.
 */
export interface Database {
  all<T>(sql: string, ...params: SqlValue[]): Promise<T[]>;
  get<T>(sql: string, ...params: SqlValue[]): Promise<T | undefined>;
  run(sql: string, ...params: SqlValue[]): Promise<{ changes: number; lastRowId: number }>;
  /** Run several statements atomically: all succeed or none do. */
  batch(statements: Statement[]): Promise<void>;
}
