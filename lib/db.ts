import { createClient, Client, InStatement } from '@libsql/client';

// ---- Turso cloud DB ----
const url = process.env.TURSO_DATABASE_URL || 'file:instance/suara_kampus.db';
const authToken = process.env.TURSO_AUTH_TOKEN;

const turso = createClient({ url, authToken });

// ============================================================
// Wrapper to make Turso feel like better-sqlite3
// Semua API route menggunakan pola: db.prepare(sql).get/all/run(...)
// Wrapper ini membuat API route TIDAK perlu diubah.
// ============================================================

function buildArgs(args: any[]): any[] {
  if (args.length === 1 && typeof args[0] === 'object' && !Array.isArray(args[0])) {
    return args[0]; // named params
  }
  return args; // positional params
}

function syncExec(stmt: string, args: any[]): any {
  // We use a synchronous-looking interface but internally this is async.
  // Route Handlers in Next.js are async so we can return a thenable proxy.
  // However, better-sqlite3 API is sync. We work around this with a trick:
  // Store results using Node's synchronous XMLHttpRequest workaround.
  // Since Next.js API routes are already async (they return Response),
  // we'll make db.prepare() return an async-compatible object.
  throw new Error('Use await db.execute() directly for async routes');
}

// ---- Async-compatible API ----
// Each route should use: await db.prepare(sql).get/all/run(...)
// But since better-sqlite3 is sync, we need a proxy.

type QueryResult = {
  get: (...args: any[]) => Promise<any>;
  all: (...args: any[]) => Promise<any[]>;
  run: (...args: any[]) => Promise<{ lastInsertRowid: number | bigint; changes: number }>;
};

const db = {
  prepare(sql: string): QueryResult {
    return {
      async get(...args: any[]) {
        const result = await turso.execute({ sql, args: buildArgs(args) });
        if (result.rows.length === 0) return undefined;
        // Convert row to plain object
        const row: any = {};
        result.columns.forEach((col, i) => {
          row[col] = result.rows[0][i];
        });
        return row;
      },
      async all(...args: any[]) {
        const result = await turso.execute({ sql, args: buildArgs(args) });
        return result.rows.map(row => {
          const obj: any = {};
          result.columns.forEach((col, i) => { obj[col] = row[i]; });
          return obj;
        });
      },
      async run(...args: any[]) {
        const result = await turso.execute({ sql, args: buildArgs(args) });
        return {
          lastInsertRowid: result.lastInsertRowid ?? 0,
          changes: result.rowsAffected,
        };
      },
    };
  },

  // For multi-statement migrations
  async exec(sql: string) {
    const stmts = sql.split(';').map(s => s.trim()).filter(Boolean);
    for (const stmt of stmts) {
      await turso.execute(stmt);
    }
  },

  pragma(_: string) {
    // No-op for Turso (foreign keys handled by schema)
  },
};

export default db;
export { turso };
