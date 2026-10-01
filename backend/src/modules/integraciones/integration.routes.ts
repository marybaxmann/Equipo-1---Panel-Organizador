import { Router } from 'express';
import { validateBody } from '../../core/validation/validate-body.js';
import type { AuthClient } from '../auth/auth.client.js';
import { ORGANIZER_ROLE, STAFF_ROLE, requireRoles } from '../auth/require-organizer.js';
import { toCatalogoEvento, toEventoIntegracion, toPromocionesEvento } from '../eventos/evento.mapper.js';
import { buscarEventosSchema } from '../eventos/evento.schemas.js';
import { buscarPublicados, findProximos, findPublicados, getEventoInStates, listCambios } from './integration.service.js';

// Servicios que consumen otros squads (BE3). Salvo el GET compartido Entradas/Check-in, no llevan cookie de usuario:
// el acceso interno lo controla el API Gateway.
// Se monta en /api/v1 DESPUÉS de organizerRouter para que /panel/eventos/mios no caiga en /panel/eventos/:id_evento.
export function integrationRouter(authClient: AuthClient): Router {
  const router = Router();
  // Contrato Check-in v1.2 §2.4 (confirmado por Auth): la consulta valida la sesión y admite staff y organizador
  const staffUOrganizador = requireRoles(authClient, [STAFF_ROLE, ORGANIZER_ROLE], 'Rol no autorizado para consultar eventos.');

  // Catálogo (contrato Catálogo v1.1 §2.2)
  router.get('/organizador/eventos/proximos', async (_req, res) => { res.json((await findProximos()).map(toCatalogoEvento)); });
  router.post('/organizador/eventos/buscar', validateBody(buscarEventosSchema), async (req, res) => {
    res.json((await buscarPublicados(req.body)).map(toCatalogoEvento));
  });
  router.get('/organizador/eventos/:id_evento', async (req, res) => {
    res.json(toCatalogoEvento(await getEventoInStates(req.params.id_evento, ['PUBLICADO'])));
  });

  // Promociones (tabla de dependencias: id_evento)
  router.get('/panel/eventos-disponibles', async (_req, res) => { res.json((await findPublicados()).map(toPromocionesEvento)); });

  // Entradas (contrato v1.2 §2.3) + Check-in (contrato v1.2 §3.4): mismo endpoint. Un BORRADOR no se expone (Check-in §3.2)
  router.get('/panel/eventos/:id_evento', staffUOrganizador, async (req, res) => {
    res.json(toEventoIntegracion(await getEventoInStates(req.params.id_evento as string, ['PUBLICADO', 'FINALIZADO', 'CANCELADO'])));
  });

  // Notificaciones (tabla de dependencias)
  router.get('/panel/eventos/:id_evento/cambios-estado', async (req, res) => { res.json(await listCambios(req.params.id_evento)); });

  return router;
}
