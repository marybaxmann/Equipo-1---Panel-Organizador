import { z } from 'zod';
import { todayInSantiago } from '../../core/time.js';
import { EVENT_STATES } from './evento.model.js';

z.config(z.locales.es()); // mensajes de Zod en español para la UI

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Debe tener formato HH:mm');
const optional = <T extends z.ZodType>(s: T) => s.nullable().optional();

const required = { error: (iss: { input: unknown }) => (iss.input === undefined ? 'Este campo es obligatorio' : undefined) };

// strictObject: rechaza id_organizador, estado_gestion u otros campos que el cliente intente imponer
export const createEventoSchema = z.strictObject({
  nombre_evento: z.string(required).trim().min(3).max(120),
  descripcion: z.string(required).trim().min(1, 'Este campo es obligatorio').max(2000),
  fecha_evento: z.iso.date({ error: (iss) => (iss.input === undefined ? 'Este campo es obligatorio' : 'Debe tener formato YYYY-MM-DD') }),
  hora_evento: z.string(required).regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Debe tener formato HH:mm'),
  hora_fin_evento: optional(hhmm),
  direccion_evento: z.string(required).trim().min(3).max(200),
  categoria: optional(z.string().trim().max(50)),
  imagen: optional(z.url({ error: 'Debe ser una URL válida' })),
  cantidad_entradas: optional(z.int().min(1).max(100000)),
  tipo_entrada: optional(z.enum(['GRATUITA', 'PAGADA'])),
  precio: optional(z.int().min(0).max(10_000_000)),
}).superRefine((d, ctx) => {
  const issue = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message });
  const isDate = (v: string) => z.iso.date().safeParse(v).success;
  if (isDate(d.fecha_evento) && d.fecha_evento < todayInSantiago()) issue('fecha_evento', 'La fecha del evento no puede ser anterior a hoy');
  // hora_fin_evento <= hora_evento es válido: el evento termina al día siguiente (contrato Check-in v1.2 §3.2)
  if (d.tipo_entrada === 'PAGADA' && !(d.precio && d.precio > 0)) issue('precio', 'Un evento pagado requiere un precio mayor a 0');
  if (d.tipo_entrada === 'GRATUITA' && d.precio) issue('precio', 'Un evento gratuito no puede tener precio');
});
export type CreateEventoInput = z.infer<typeof createEventoSchema>;

export const listMisEventosQuerySchema = z.object({ estado_gestion: z.enum(EVENT_STATES).optional() });

export const buscarEventosSchema = z.object({
  texto: z.string().trim().min(1).optional(),
  categoria: z.string().trim().min(1).optional(),
  fecha_desde: z.iso.date().optional(),
  fecha_hasta: z.iso.date().optional(),
});
export type BuscarEventosInput = z.infer<typeof buscarEventosSchema>;
