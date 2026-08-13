import cors from 'cors';
import express from 'express';
import { config } from './config.js';
import { verifyDatabaseConnection } from './db/pool.js';
import { handleErrors, handleUnknownRoute } from './middleware/errorHandler.js';
import { logRequests } from './middleware/loggingMiddleware.js';
import { generalRateLimit } from './middleware/rateLimitMiddleware.js';
import { appointmentRoutes } from './routes/appointmentRoutes.js';
import { authRoutes } from './routes/authRoutes.js';
import { chatRoutes } from './routes/chatRoutes.js';

// Puts the whole API together in the order requests travel through it.
// Use this from index.js, and from tests if any are ever added.
export function createApp() {
  const app = express();

  // Rate limiting counts requests per IP address, so trust the hosting proxy.
  app.set('trust proxy', 1);

  app.use(cors({ origin: config.clientOrigin }));
  app.use(express.json({ limit: '100kb' }));
  app.use(logRequests);

  // Says whether the API is awake and can still reach its database.
  // An uptime monitor calls this, so it checks the database rather than only
  // proving that the web server answered.
  //
  // This sits above the rate limiter on purpose. A monitor calls it around the
  // clock, and a 429 here would look like the site was down when it was fine.
  app.get('/api/health', async (request, response) => {
    try {
      await verifyDatabaseConnection();
      response.status(200).json({ data: { status: 'ok', database: 'connected' } });
    } catch {
      response.status(503).json({
        error: { message: 'The service is not healthy. The database is unreachable.' },
      });
    }
  });

  app.use(generalRateLimit);

  app.use('/api/auth', authRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/appointments', appointmentRoutes);

  app.use(handleUnknownRoute);
  app.use(handleErrors);

  return app;
}
