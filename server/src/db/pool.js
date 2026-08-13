import pg from 'pg';
import { config } from '../config.js';

// A timestamp column holds plain wall-clock time, such as "3 October, 2pm".
// By default the driver would read it as a date in the server's own timezone
// and shift the hours, so 2pm booked here could arrive as 9am somewhere else.
// Handing the text back untouched keeps the time exactly as the user chose it.
const POSTGRES_TIMESTAMP_TYPE_ID = 1114;
pg.types.setTypeParser(POSTGRES_TIMESTAMP_TYPE_ID, (value) => value);

// Hosted PostgreSQL providers such as Neon and Supabase require SSL, while a
// database on your own machine does not. This picks the right option.
const needsSecureConnection = !config.databaseUrl.includes('localhost')
  && !config.databaseUrl.includes('127.0.0.1');

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  ssl: needsSecureConnection ? { rejectUnauthorized: false } : false,
});

// Runs one SQL statement and hands back the rows it found.
// Use this for every database read or write so all queries go through one place.
export async function runQuery(sqlText, values = []) {
  const result = await pool.query(sqlText, values);
  return result.rows;
}

// Runs one SQL statement that is expected to touch a single row.
// Use this for lookups by id or email, where you want one row or nothing.
export async function runQueryForOneRow(sqlText, values = []) {
  const rows = await runQuery(sqlText, values);
  return rows[0] || null;
}

// Checks that the database is reachable before the server starts serving.
// Use this at startup so a bad connection string fails loudly and early.
export async function verifyDatabaseConnection() {
  await pool.query('SELECT 1');
}
