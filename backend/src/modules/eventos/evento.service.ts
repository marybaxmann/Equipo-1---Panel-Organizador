import { AppError, type FieldIssue } from '../../core/errors/app-error.js';
import { toDateOnly } from '../../core/time.js';
import type { EventoNotifier } from '../mensajeria/evento.notifier.js';
import { CambioEstadoModel } from './cambio-estado.model.js';
import { EventoModel, type EventoDoc, type EventState } from './evento.model.js';
import { priceIssues, type CreateEventoInput, type UpdateEventoInput } from './evento.schemas.js';

export async function createEvento(input: CreateEventoInput, organizerId: string, notify: EventoNotifier): Promise<EventoDoc> {
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
  await notify({ kind: 'CREADO', evento, idUsuario: organizerId });
  return evento;
}

export function listEventosByOrganizer(organizerId: string, estado?: EventState): Promise<EventoDoc[]> {
  const filter = { id_organizador: organizerId, ...(estado && { estado_gestion: estado }) };
  return EventoModel.find(filter).sort({ fecha_evento: 1, hora_evento: 1 }).lean<EventoDoc[]>();
}

// Contratos Entradas v1.2 §2.3 y Check-in v1.2 §3.4: un id con formato inválido es 400, no 404
const OBJECT_ID = /^[0-9a-f]{24}$/i;

export async function findEventoById(idEvento: string): Promise<EventoDoc | null> {
  if (!OBJECT_ID.test(idEvento)) {
    throw new AppError(400, 'INVALID_EVENT_ID', 'El id_evento no tiene un formato válido.',
      [{ campo: 'id_evento', mensaje: 'Debe ser un identificador de 24 caracteres hexadecimales' }]);
  }
  return EventoModel.findById(idEvento).lean<EventoDoc>();
}

export async function getOwnedEvento(idEvento: string, organizerId: string): Promise<EventoDoc> {
  const evento = await findEventoById(idEvento);
  if (!evento) throw new AppError(404, 'EVENT_NOT_FOUND', 'El evento no existe.');
  // HU-06: validación de propiedad, no sólo de rol
  if (evento.id_organizador !== organizerId) throw new AppError(403, 'EVENT_NOT_OWNED', 'No tienes permiso sobre este evento.');
  return evento;
}

// HU-04: nombre, fecha, hora de inicio y de término, ubicación, cantidad y tipo de entrada.
// hora_fin_evento también lo exige el contrato con Check-in (v1.2 §3.2)
const CAMPOS_PARA_PUBLICAR = [
  'nombre_evento', 'fecha_evento', 'hora_evento', 'hora_fin_evento', 'direccion_evento', 'cantidad_entradas', 'tipo_entrada',
] as const;

const camposFaltantes = (evento: { [K in (typeof CAMPOS_PARA_PUBLICAR)[number]]?: unknown }, mensaje: string): FieldIssue[] =>
  CAMPOS_PARA_PUBLICAR.filter((campo) => evento[campo] === null || evento[campo] === undefined || evento[campo] === '')
    .map((campo) => ({ campo, mensaje }));

export async function publicarEvento(idEvento: string, organizerId: string, notify: EventoNotifier): Promise<EventoDoc> {
  const evento = await getOwnedEvento(idEvento, organizerId);
  if (evento.estado_gestion !== 'BORRADOR') {
    throw new AppError(409, 'INVALID_STATE_TRANSITION', 'Sólo un evento en Borrador puede publicarse.');
  }
  const faltantes = camposFaltantes(evento, 'Este campo es obligatorio para publicar');
  if (faltantes.length > 0) throw new AppError(400, 'VALIDATION_ERROR', 'Faltan datos para publicar el evento.', faltantes);
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
  await notify({ kind: 'PUBLICADO', evento: publicado, idUsuario: organizerId });
  return publicado;
}

// HU-02: FINALIZADO y CANCELADO ya no se editan
const ESTADOS_EDITABLES: readonly EventState[] = ['BORRADOR', 'PUBLICADO'];

export async function updateEvento(idEvento: string, input: UpdateEventoInput, organizerId: string, notify: EventoNotifier): Promise<EventoDoc> {
  const antes = await getOwnedEvento(idEvento, organizerId);
  if (!ESTADOS_EDITABLES.includes(antes.estado_gestion)) {
    throw new AppError(409, 'EVENT_NOT_EDITABLE', 'Sólo un evento en Borrador o Publicado puede editarse.');
  }
  const cambios = { ...input, ...(input.fecha_evento !== undefined && { fecha_evento: toDateOnly(input.fecha_evento) }) };
  // Las reglas cruzadas se validan sobre el evento como quedaría, no sólo sobre los campos enviados
  const resultado = { ...antes, ...cambios };
  const problemas = [
    ...priceIssues(resultado),
    // Un evento publicado ya lo ven otros squads: no puede quedar sin los datos que se exigieron para publicarlo
    ...(antes.estado_gestion === 'PUBLICADO' ? camposFaltantes(resultado, 'Un evento publicado no puede quedar sin este campo') : []),
  ];
  if (problemas.length > 0) throw new AppError(400, 'VALIDATION_ERROR', 'Hay campos inválidos.', problemas);
  // Condición sobre el estado leído: si alguien lo publicó entre medio, no se aplican reglas viejas
  const despues = await EventoModel.findOneAndUpdate(
    { _id: antes._id, estado_gestion: antes.estado_gestion },
    { $set: cambios },
    { returnDocument: 'after' },
  ).lean<EventoDoc>();
  if (!despues) throw new AppError(409, 'EVENT_NOT_EDITABLE', 'El evento cambió de estado mientras se editaba. Vuelve a cargarlo.');
  await notify({ kind: 'ACTUALIZADO', antes, evento: despues, idUsuario: organizerId });
  return despues;
}
