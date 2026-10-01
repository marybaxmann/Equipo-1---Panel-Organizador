import { Router } from 'express';
import { AppError } from '../../core/errors/app-error.js';
import { toFieldIssues, validateBody } from '../../core/validation/validate-body.js';
import type { AuthClient } from '../auth/auth.client.js';
import { requireOrganizer } from '../auth/require-organizer.js';
import { toEvento, toEventoResumen } from './evento.mapper.js';
import { createEventoSchema, listMisEventosQuerySchema } from './evento.schemas.js';
import { createEvento, getOwnedEvento, listEventosByOrganizer, publicarEvento } from './evento.service.js';

export function organizerRouter(authClient: AuthClient): Router {
  const router = Router();
  // Guard por ruta (no router.use): este router comparte prefijo con los endpoints internos de Entradas,
  // y un router.use exigiría cookie de organizador también a esos endpoints
  const guard = requireOrganizer(authClient);
  const userId = (locals: Express.Locals) => locals.user.id_usuario;

  router.post('/', guard, validateBody(createEventoSchema), async (req, res) => {
    res.status(201).json(toEvento(await createEvento(req.body, userId(res.locals))));
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

  // HU-04 (adelantada al Sprint 1): BORRADOR → PUBLICADO
  router.post('/mios/:id_evento/publicar', guard, async (req, res) => {
    res.json(toEvento(await publicarEvento(req.params.id_evento as string, userId(res.locals))));
  });

  return router;
}
