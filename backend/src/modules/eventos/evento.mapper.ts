import { fromDateOnly, todayInSantiago } from '../../core/time.js';
import type { EventoDoc } from './evento.model.js';

const disponibilidad = (e: EventoDoc) => (fromDateOnly(e.fecha_evento) < todayInSantiago() ? 'PASADO' : 'DISPONIBLE');

export const toEventoResumen = (e: EventoDoc) => ({
  id_evento: e._id.toString(),
  nombre_evento: e.nombre_evento,
  fecha_evento: fromDateOnly(e.fecha_evento),
  hora_evento: e.hora_evento,
  direccion_evento: e.direccion_evento,
  estado_gestion: e.estado_gestion,
});

export const toEvento = (e: EventoDoc) => ({
  ...toEventoResumen(e),
  id_organizador: e.id_organizador,
  descripcion: e.descripcion,
  hora_fin_evento: e.hora_fin_evento ?? null,
  categoria: e.categoria ?? null,
  imagen: e.imagen ?? null,
  cantidad_entradas: e.cantidad_entradas ?? null,
  tipo_entrada: e.tipo_entrada ?? null,
  precio: e.precio ?? null,
  fecha_creacion: e.fecha_creacion.toISOString(),
  fecha_actualizacion: e.fecha_actualizacion.toISOString(),
});

// Contrato Catálogo §3.1–3.2
export const toCatalogoEvento = (e: EventoDoc) => ({
  id_evento: e._id.toString(), nombre_evento: e.nombre_evento, descripcion: e.descripcion,
  direccion_evento: e.direccion_evento, fecha_evento: fromDateOnly(e.fecha_evento), hora_evento: e.hora_evento,
  hora_fin_evento: e.hora_fin_evento ?? null, imagen: e.imagen ?? null, categoria: e.categoria ?? null,
  precio: e.precio ?? null, tipo_entrada: e.tipo_entrada ?? null,
  estado_gestion: e.estado_gestion, estado_disponibilidad: disponibilidad(e),
});

// GET /panel/eventos/{id}, compartido por Entradas (contrato v1.2 §2.2) y Check-in (contrato v1.2 §3.2 y §3.4).
// Incluye la unión de campos; cada consumidor ignora los que no usa.
export const toEventoIntegracion = (e: EventoDoc) => ({
  id_evento: e._id.toString(), id_usuario: e.id_organizador, nombre_evento: e.nombre_evento,
  direccion_evento: e.direccion_evento, fecha_evento: fromDateOnly(e.fecha_evento), hora_evento: e.hora_evento,
  hora_fin_evento: e.hora_fin_evento ?? null,
  cantidad_entradas: e.cantidad_entradas ?? null, tipo_entrada: e.tipo_entrada ?? null, estado_gestion: e.estado_gestion,
});

// Tabla de dependencias: Promociones sólo necesita el identificador del evento
export const toPromocionesEvento = (e: EventoDoc) => ({
  id_evento: e._id.toString(), nombre_evento: e.nombre_evento, fecha_evento: fromDateOnly(e.fecha_evento),
});
