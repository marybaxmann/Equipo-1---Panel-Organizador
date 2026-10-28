import { fromDateOnly } from '../../core/time.js';
import type { EventoAttrs, EventoDoc } from '../eventos/evento.model.js';
import { toCatalogoEvento, toPromocionesEvento } from '../eventos/evento.mapper.js';
import type { EventPublisher, OutgoingMessage } from './event-publisher.js';
import type { Topics } from './topics.js';

// Qué recibe cada squad ante cada cambio del evento. Los cuerpos siguen los contratos en docs/CONTRATO_PANEL_*.md.
export type EventoChange =
  | { kind: 'CREADO'; evento: EventoDoc; idUsuario: string }
  | { kind: 'PUBLICADO'; evento: EventoDoc; idUsuario: string }
  | { kind: 'ACTUALIZADO'; antes: EventoDoc; evento: EventoDoc; idUsuario: string };

export type EventoNotifier = (change: EventoChange) => Promise<void>;

export const MESSAGE_VERSION = 1;

export const EDITABLE_FIELDS = [
  'nombre_evento', 'descripcion', 'fecha_evento', 'hora_evento', 'hora_fin_evento', 'direccion_evento',
  'categoria', 'imagen', 'cantidad_entradas', 'tipo_entrada', 'precio',
] as const satisfies readonly (keyof EventoAttrs)[];
type EditableField = (typeof EDITABLE_FIELDS)[number];

// Contrato Check-in v1.2 §3.3: ACTUALIZADO sólo si cambia nombre, dirección, fecha u horario
const CHECKIN_FIELDS: readonly EditableField[] = ['nombre_evento', 'direccion_evento', 'fecha_evento', 'hora_evento', 'hora_fin_evento'];
// Contrato Notificaciones §2.4: reprogramación = cambio de fecha u hora
const SCHEDULE_FIELDS: readonly EditableField[] = ['fecha_evento', 'hora_evento', 'hora_fin_evento'];

const comparable = (value: unknown) => (value instanceof Date ? value.getTime() : (value ?? null));

export const changedFields = (antes: EventoDoc, despues: EventoDoc): EditableField[] =>
  EDITABLE_FIELDS.filter((campo) => comparable(antes[campo]) !== comparable(despues[campo]));

// Contrato Entradas v1.2 §3.1: los mismos 8 campos del GET compartido
const entradasPayload = (e: EventoDoc) => ({
  id_evento: e._id.toString(), id_usuario: e.id_organizador, nombre_evento: e.nombre_evento,
  fecha_evento: fromDateOnly(e.fecha_evento), hora_evento: e.hora_evento,
  cantidad_entradas: e.cantidad_entradas ?? null, tipo_entrada: e.tipo_entrada ?? null, estado_gestion: e.estado_gestion,
});

// Contrato Check-in v1.2 §3.3: estado completo del evento, para reemplazar la copia local sin combinar datos
const checkinPayload = (e: EventoDoc, tipoCambio: 'PUBLICADO' | 'ACTUALIZADO') => ({
  tipo_cambio: tipoCambio, id_evento: e._id.toString(), nombre_evento: e.nombre_evento,
  direccion_evento: e.direccion_evento, fecha_evento: fromDateOnly(e.fecha_evento), hora_evento: e.hora_evento,
  hora_fin_evento: e.hora_fin_evento ?? null, estado_gestion: e.estado_gestion,
  fecha_cambio: e.fecha_actualizacion.toISOString(),
});

export function buildMessages(change: EventoChange, topics: Topics): Array<{ topic: string; message: OutgoingMessage }> {
  const e = change.evento;
  const id = e._id.toString();
  const message = (tipo: string, payload: Record<string, unknown>) => ({
    envelope: { version: MESSAGE_VERSION, tipo, fecha_cambio: e.fecha_actualizacion.toISOString(), id_evento: id }, payload,
  });
  const notificacion = { id_evento: id, id_usuario: change.idUsuario, nuevo_estado: e.estado_gestion };

  switch (change.kind) {
    case 'CREADO':
      // Un BORRADOR sólo lo conoce Entradas (Entradas §3.1); Catálogo y Check-in no deben verlo
      return [{ topic: topics.entradas, message: message('evento_creado', entradasPayload(e)) }];
    case 'PUBLICADO':
      return [
        { topic: topics.catalogo, message: message('evento_publicado', toCatalogoEvento(e)) },
        { topic: topics.entradas, message: message('evento_publicado', entradasPayload(e)) },
        { topic: topics.checkin, message: message('evento_publicado', checkinPayload(e, 'PUBLICADO')) },
        { topic: topics.notificaciones, message: message('evento_actualizado', notificacion) },
        { topic: topics.promociones, message: message('evento_publicado', toPromocionesEvento(e)) },
      ];
    case 'ACTUALIZADO': {
      const cambios = changedFields(change.antes, e);
      if (cambios.length === 0) return [];
      const out = [{ topic: topics.entradas, message: message('evento_actualizado', entradasPayload(e)) }];
      if (e.estado_gestion !== 'PUBLICADO') return out;
      out.push({ topic: topics.catalogo, message: message('evento_actualizado', toCatalogoEvento(e)) });
      if (cambios.some((c) => CHECKIN_FIELDS.includes(c))) {
        out.push({ topic: topics.checkin, message: message('evento_actualizado', checkinPayload(e, 'ACTUALIZADO')) });
      }
      if (cambios.some((c) => SCHEDULE_FIELDS.includes(c))) {
        // En este mensaje fecha_cambio y hora_cambio son la NUEVA fecha y hora del evento (Notificaciones §2.4)
        out.push({
          topic: topics.notificaciones,
          message: message('evento_reprogramado', { ...notificacion, fecha_cambio: fromDateOnly(e.fecha_evento), hora_cambio: `${e.hora_evento}:00` }),
        });
      }
      return out;
    }
  }
}

// El cambio ya está guardado: un fallo al registrar el mensaje no revierte la operación del organizador (HU-07).
// Se reintenta una vez y, si vuelve a fallar, el mensaje completo queda en el log para reenviarlo.
export function createEventoNotifier(
  publisher: EventPublisher, topics: Topics, logError: (line: string) => void = console.error,
): EventoNotifier {
  return async (change) => {
    for (const { topic, message } of buildMessages(change, topics)) {
      try {
        await publisher.publish(topic, message);
      } catch {
        try {
          await publisher.publish(topic, message);
        } catch (error) {
          logError(`[mensajeria] FALLO ${topic} ${JSON.stringify(message)} :: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
  };
}
