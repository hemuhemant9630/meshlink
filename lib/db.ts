import { Pool } from 'pg';
import { neon } from '@neondatabase/serverless';

export type Row = Record<string, any>;

let pool: Pool | null = null;
let neonSql: ReturnType<typeof neon> | null = null;

export function dbUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
}

/** Run a parameterised SQL query. Uses Neon's HTTP driver on Neon, node-postgres elsewhere (local dev). */
export async function query<T = Row>(text: string, params: any[] = []): Promise<T[]> {
  const url = dbUrl();
  if (!url) throw new Error('DATABASE_URL is not set. Add a Neon database (see README).');
  if (url.includes('neon.tech')) {
    neonSql ??= neon(url);
    return (await (neonSql as any).query(text, params)) as T[];
  }
  pool ??= new Pool({ connectionString: url, max: 5 });
  const res = await pool.query(text, params);
  return res.rows as T[];
}

export async function one<T = Row>(text: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
