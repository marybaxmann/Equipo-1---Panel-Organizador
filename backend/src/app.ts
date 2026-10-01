import cors from 'cors';
import express, { type Express } from 'express';
import { errorHandler } from './core/middlewares/error-handler.js';
import { mountSwagger } from './docs/swagger.js';
import type { AuthClient } from './modules/auth/auth.client.js';
import { organizerRouter } from './modules/eventos/organizer.routes.js';
import { integrationRouter } from './modules/integraciones/integration.routes.js';

export type AppDeps = { authClient: AuthClient; corsOrigin?: string };

export function createApp(deps: AppDeps): Express {
  const app = express();
  // credentials: true porque la identidad viaja en la cookie jwt
  app.use(cors({ origin: deps.corsOrigin ?? 'http://localhost:5173', credentials: true }));
  app.use(express.json());
  // La raíz del API no tiene contenido propio: redirige a la documentación
  app.get('/', (_req, res) => { res.redirect('/api-docs'); });
  app.get('/health', (_req, res) => { res.json({ status: 'ok', service: 'panel-organizador' }); });
  // El orden importa: organizerRouter primero, para que /panel/eventos/mios exija sesión
  app.use('/api/v1/panel/eventos', organizerRouter(deps.authClient));
  app.use('/api/v1', integrationRouter(deps.authClient));
  mountSwagger(app);
  app.use(errorHandler);
  return app;
}
