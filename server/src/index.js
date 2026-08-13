import { createApp } from './app.js';
import { config } from './config.js';
import { verifyDatabaseConnection } from './db/pool.js';

// Checks the database is reachable and then starts listening for requests.
// Use this as the single entry point of the server.
async function startServer() {
  try {
    await verifyDatabaseConnection();
    console.log('Connected to the database.');
  } catch (error) {
    console.error('Could not connect to the database:', error.message);
    process.exit(1);
  }

  createApp().listen(config.port, () => {
    console.log(`API listening on http://localhost:${config.port}`);
  });
}

startServer();
