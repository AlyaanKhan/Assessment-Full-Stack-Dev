import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { config } from '../src/config.js';

// Finds the folder this file lives in, so the SQL files are found either way.
// Use this because the script may be run from the server folder or the repo root.
const thisFolder = path.dirname(fileURLToPath(import.meta.url));

// Reads one SQL file from the db folder and runs it against the database.
// Use this to apply schema.sql and then seed.sql in order.
async function runSqlFile(client, fileName) {
  const sqlText = fs.readFileSync(path.join(thisFolder, fileName), 'utf8');
  await client.query(sqlText);
  console.log(`Applied ${fileName}`);
}

// Creates all the tables and adds the sample data.
// Use this once after setting DATABASE_URL, instead of running psql by hand.
async function setUpDatabase() {
  const needsSecureConnection = !config.databaseUrl.includes('localhost')
    && !config.databaseUrl.includes('127.0.0.1');

  const client = new pg.Client({
    connectionString: config.databaseUrl,
    ssl: needsSecureConnection ? { rejectUnauthorized: false } : false,
  });

  try {
    await client.connect();
  } catch (error) {
    console.error('Could not connect to the database:', error.message);
    console.error('Check DATABASE_URL in your .env file.');
    process.exit(1);
  }

  try {
    await runSqlFile(client, 'schema.sql');
    await runSqlFile(client, 'seed.sql');
    console.log('');
    console.log('Database is ready.');
    console.log('You can log in with demo@example.com and the password Password123');
  } catch (error) {
    console.error('Could not set up the database:', error.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

setUpDatabase();
