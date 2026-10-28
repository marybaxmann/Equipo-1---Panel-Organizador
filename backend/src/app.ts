import cors from 'cors';
import express, { type Express } from 'express';
import { AppError } from './core/errors/app-error.js';
import { errorHandler } from './core/middlewares/error-handler.js';
import { mountSwagger } from './docs/swagger.js';
import type { AuthClient } from './modules/auth/auth.client.js';
import { organizerRouter } from './modules/eventos/organizer.routes.js';
import { integrationRouter } from './modules/integraciones/integration.routes.js';
import type { EventoNotifier } from './modules/mensajeria/evento.notifier.js';

// notifier: cómo se avisa a los otros squads de cada cambio del evento (INT-02, outbox en producción)
export const API_BASES = ['/api/v1', '/api/organizador/v1'] as const;

export type AppDeps ={ authClient: AuthClient; notifier: EventoNotifier; corsOrigin?: string };

export function createApp(deps: AppDeps): Express {
  const app = express();
  // credentials: true porque la identidad viaja en la cookie jwt
  app.use(cors({ origin: deps.corsOrigin ?? 'http://localhost:5173', credentials: true }));
  app.use(express.json());
  // La raíz del API no tiene contenido propio: redirige a la documentación
  app.get('/', (_req, res) => { res.redirect('/api-docs'); });
  app.get('/health', (_req, res) => { res.json({ status: 'ok', service: 'panel-organizador' }); });
  // Dos raíces con las mismas rutas: /api/v1 (llamadas directas, contratos actuales) y /api/organizador/v1,
  // que es el prefijo que el API Gateway de TicketU reenvía a este servicio sin recortarlo
  for (const base of API_BASES) {
    // El orden importa: organizerRouter primero, para que /panel/eventos/mios exija sesión
    app.use(`${base}/panel/eventos`, organizerRouter(deps.authClient, deps.notifier));
    app.use(base, integrationRouter(deps.authClient));
  }
  mountSwagger(app);
  // Ruta inexistente: mismo formato de error que el resto de la API (no la página HTML de Express)
  app.use((req, _res, next) => { next(new AppError(404, 'ROUTE_NOT_FOUND', `No existe la ruta ${req.method} ${req.path}.`)); });
  app.use(errorHandler);
  return app;
}
