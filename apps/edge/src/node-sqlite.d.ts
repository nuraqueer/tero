// The part of Node's built-in SQLite the tests use, so the Worker's types don't need Node's.
declare module 'node:sqlite' {
  export class DatabaseSync {
    constructor(path: string);
    prepare(sql: string): { all(...params: unknown[]): Record<string, unknown>[] };
  }
}
