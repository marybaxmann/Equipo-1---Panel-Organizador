import { isValidObjectId } from 'mongoose';
import { AppError } from '../../core/errors/app-error.js';
import { toDateOnly } from '../../core/time.js';
import { CambioEstadoModel } from './cambio-estado.model.js';
import { EventoModel, type EventoDoc, type EventState } from './evento.model.js';
import type { CreateEventoInput } from './evento.schemas.js';

export async function createEvento(input: CreateEventoInput, organizerId: string): Promise<EventoDoc> {
  const eventoDoc = await EventoModel.create({
    ...input,
    hora_fin_evento: input.hora_fin_evento ?? null,
    categoria: input.categoria ?? null,
    imagen: input.imagen ?? null,
    cantidad_entradas: input.cantidad_entradas ?? null,
    tipo_entrada: input.tipo_entrada ?? null,
    precio: input.precio ?? null,
    fecha_evento: toDateOnly(input.fecha_evento),
    id_organizador: organizerId,
    estado_gestion: 'BORRADOR',
  });
  const evento = eventoDoc.toObject() as EventoDoc;
  try {
    await CambioEstadoModel.create({
      id_evento: evento._id, estado_anterior: null, nuevo_estado: 'BORRADOR',
      fecha_cambio: evento.fecha_creacion, id_usuario_responsable: organizerId,
    });
  } catch (error) {
    await EventoModel.findByIdAndDelete(evento._id); // compensación: Mongo standalone no tiene transacciones
    throw error;
  }
  return evento;
}

export function listEventosByOrganizer(organizerId: string, estado?: EventState): Promise<EventoDoc[]> {
  const filter = { id_organizador: organizerId, ...(estado && { estado_gestion: estado }) };
  return EventoModel.find(filter).sort({ fecha_evento: 1, hora_evento: 1 }).lean<EventoDoc[]>();
}

export async function findEventoById(idEvento: string): Promise<EventoDoc | null> {
  if (!isValidObjectId(idEvento)) return null;
  return EventoModel.findById(idEvento).lean<EventoDoc>();
}

export async function getOwnedEvento(idEvento: string, organizerId: string): Promise<EventoDoc> {
  const evento = await findEventoById(idEvento);
  if (!evento) throw new AppError(404, 'EVENT_NOT_FOUND', 'El evento no existe.');
  // HU-06: validación de propiedad, no sólo de rol
  if (evento.id_organizador !== organizerId) throw new AppError(403, 'EVENT_NOT_OWNED', 'No tienes permiso sobre este evento.');
  return evento;
}

// HU-04 exige nombre, fecha y ubicación; hora_fin_evento lo exige el contrato con Check-in (v1.2 §3.2)
const CAMPOS_PARA_PUBLICAR = ['nombre_evento', 'fecha_evento', 'direccion_evento', 'hora_fin_evento'] as const;

export async function publicarEvento(idEvento: string, organizerId: string): Promise<EventoDoc> {
  const evento = await getOwnedEvento(idEvento, organizerId);
  if (evento.estado_gestion !== 'BORRADOR') {
    throw new AppError(409, 'INVALID_STATE_TRANSITION', 'Sólo un evento en Borrador puede publicarse.');
  }
  const faltantes = CAMPOS_PARA_PUBLICAR.filter((campo) => !evento[campo]);
  if (faltantes.length > 0) {
    const detalles = faltantes.map((campo) => ({ campo, mensaje: 'Este campo es obligatorio para publicar' }));
    throw new AppError(400, 'VALIDATION_ERROR', 'Faltan datos para publicar el evento.', detalles);
  }
  // La condición sobre estado_gestion hace la transición atómica: dos clics simultáneos no publican dos veces
  const publicado = await EventoModel.findOneAndUpdate(
    { _id: evento._id, estado_gestion: 'BORRADOR' },
    { $set: { estado_gestion: 'PUBLICADO' } },
    { returnDocument: 'after' },
  ).lean<EventoDoc>();
  if (!publicado) throw new AppError(409, 'INVALID_STATE_TRANSITION', 'Sólo un evento en Borrador puede publicarse.');
  await CambioEstadoModel.create({
    id_evento: publicado._id, estado_anterior: 'BORRADOR', nuevo_estado: 'PUBLICADO',
    fecha_cambio: publicado.fecha_actualizacion, id_usuario_responsable: organizerId,
  });
  return publicado;
}
