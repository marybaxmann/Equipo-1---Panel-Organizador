import { Router } from 'express';
import { AppError } from '../../core/errors/app-error.js';
import { toFieldIssues, validateBody } from '../../core/validation/validate-body.js';
import type { AuthClient } from '../auth/auth.client.js';
import type { EventoNotifier } from '../mensajeria/evento.notifier.js';
import { requireOrganizer } from '../auth/require-organizer.js';
import { toEvento, toEventoResumen } from './evento.mapper.js';
import { createEventoSchema, listMisEventosQuerySchema, updateEventoSchema } from './evento.schemas.js';
import { createEvento, getOwnedEvento, listEventosByOrganizer, publicarEvento, updateEvento } from './evento.service.js';

export function organizerRouter(authClient: AuthClient, notify: EventoNotifier): Router {
  const router = Router();
  // Guard por ruta (no router.use): este router comparte prefijo con los endpoints internos de Entradas,
  // y un router.use exigiría cookie de organizador también a esos endpoints
  const guard = requireOrganizer(authClient);
  const userId = (locals: Express.Locals) => locals.user.id_usuario;

  router.post('/', guard, validateBody(createEventoSchema), async (req, res) => {
    res.status(201).json(toEvento(await createEvento(req.body, userId(res.locals), notify)));
  });

  router.get('/mios', guard, async (req, res) => {
    const query = listMisEventosQuerySchema.safeParse(req.query);
    if (!query.success) throw new AppError(400, 'VALIDATION_ERROR', 'Filtro inválido.', toFieldIssues(query.error));
    const eventos = await listEventosByOrganizer(userId(res.locals), query.data.estado_gestion);
    res.json({ eventos: eventos.map(toEventoResumen) });
  });

  router.get('/mios/:id_evento', guard, async (req, res) => {
    res.json(toEvento(await getOwnedEvento(req.params.id_evento as string, userId(res.locals))));
  });

  // HU-02: BORRADOR o PUBLICADO; si está publicado, los otros squads reciben el cambio por el outbox (INT-02)
  router.patch('/mios/:id_evento', guard, validateBody(updateEventoSchema), async (req, res) => {
    res.json(toEvento(await updateEvento(req.params.id_evento as string, req.body, userId(res.locals), notify)));
  });

  // HU-04 (adelantada al Sprint 1): BORRADOR → PUBLICADO
  router.post('/mios/:id_evento/publicar', guard, async (req, res) => {
    res.json(toEvento(await publicarEvento(req.params.id_evento as string, userId(res.locals), notify)));
  });

  return router;
}
