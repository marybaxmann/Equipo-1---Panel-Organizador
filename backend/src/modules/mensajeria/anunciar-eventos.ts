import { EventoModel, type EventoDoc } from '../eventos/evento.model.js';
import type { EventoNotifier } from './evento.notifier.js';

// Los eventos que se cargan directo en MongoDB (seed de demo) no pasan por la API, así que ningún squad se entera.
// Esto deja en el outbox los mismos mensajes que habría generado la API, con el mismo notifier y formato de contrato:
// evento_creado para todos (Entradas conoce también los BORRADOR) y evento_publicado para los PUBLICADO
// (Catálogo, Entradas, Check-in y Promociones). FINALIZADO y CANCELADO sólo van a Entradas, con su estado_gestion actual.
// Devuelve cuántos eventos se anunciaron.
export async function anunciarEventos(notifier: EventoNotifier): Promise<number> {
  const eventos = await EventoModel.find().sort({ _id: 1 }).lean<EventoDoc[]>();
  for (const evento of eventos) {
    await notifier({ kind: 'CREADO', evento, idUsuario: evento.id_organizador });
    if (evento.estado_gestion === 'PUBLICADO') {
      await notifier({ kind: 'PUBLICADO', evento, idUsuario: evento.id_organizador });
    }
  }
  return eventos.length;
}
