import type { QueryFilter } from 'mongoose';
import { AppError } from '../../core/errors/app-error.js';
import { toDateOnly, todayInSantiago } from '../../core/time.js';
import { CambioEstadoModel } from '../eventos/cambio-estado.model.js';
import { EventoModel, type EventoAttrs, type EventoDoc, type EventState } from '../eventos/evento.model.js';
import type { BuscarEventosInput } from '../eventos/evento.schemas.js';
import { findEventoById } from '../eventos/evento.service.js';

type EventoFilter = QueryFilter<EventoAttrs>;

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const findSorted = (filter: EventoFilter): Promise<EventoDoc[]> =>
  EventoModel.find(filter).sort({ fecha_evento: 1, hora_evento: 1 }).lean<EventoDoc[]>();

// Catálogo sólo ve eventos PUBLICADO: un BORRADOR nunca es visible fuera del panel
export const findProximos = () =>
  findSorted({ estado_gestion: 'PUBLICADO', fecha_evento: { $gte: toDateOnly(todayInSantiago()) } });

export const findPublicados = () => findSorted({ estado_gestion: 'PUBLICADO' });

export function buscarPublicados(criteria: BuscarEventosInput): Promise<EventoDoc[]> {
  // El texto se escapa para que el usuario no pueda inyectar expresiones regulares (ReDoS)
  const regex = criteria.texto ? { $regex: escapeRegex(criteria.texto), $options: 'i' } : undefined;
  const rango = {
    ...(criteria.fecha_desde && { $gte: toDateOnly(criteria.fecha_desde) }),
    ...(criteria.fecha_hasta && { $lte: toDateOnly(criteria.fecha_hasta) }),
  };
  return findSorted({
    estado_gestion: 'PUBLICADO',
    ...(regex && { $or: [{ nombre_evento: regex }, { descripcion: regex }] }),
    ...(criteria.categoria && { categoria: criteria.categoria }),
    ...(Object.keys(rango).length > 0 && { fecha_evento: rango }),
  });
}

// Un evento en un estado que el consumidor no debe ver se trata como inexistente (404)
export async function getEventoInStates(idEvento: string, states?: readonly EventState[]): Promise<EventoDoc> {
  const evento = await findEventoById(idEvento);
  if (!evento || (states && !states.includes(evento.estado_gestion))) {
    throw new AppError(404, 'EVENT_NOT_FOUND', 'El evento no existe.');
  }
  return evento;
}

export async function listCambios(idEvento: string) {
  const evento = await getEventoInStates(idEvento);
  const cambios = await CambioEstadoModel.find({ id_evento: evento._id }).sort({ fecha_cambio: -1 }).lean();
  return cambios.map((c) => ({
    tipo: 'evento_actualizado', id_evento: evento._id.toString(), nuevo_estado: c.nuevo_estado, fecha_cambio: c.fecha_cambio.toISOString(),
  }));
}
