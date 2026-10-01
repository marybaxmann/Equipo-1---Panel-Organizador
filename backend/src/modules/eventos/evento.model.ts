import { Schema, model, type Types } from 'mongoose';

export const EVENT_STATES = ['BORRADOR', 'PUBLICADO', 'FINALIZADO', 'CANCELADO'] as const;
export type EventState = (typeof EVENT_STATES)[number];

// Tipo explícito: InferSchemaType no infiere bien Schema.Types.Int32
export interface EventoAttrs {
  id_organizador: string;
  nombre_evento: string;
  descripcion: string;
  fecha_evento: Date;
  hora_evento: string;
  hora_fin_evento: string | null;
  direccion_evento: string;
  categoria: string | null;
  imagen: string | null;
  cantidad_entradas: number | null;
  tipo_entrada: 'GRATUITA' | 'PAGADA' | null;
  precio: number | null;
  estado_gestion: EventState;
  fecha_creacion: Date;
  fecha_actualizacion: Date;
}
export type EventoDoc = EventoAttrs & { _id: Types.ObjectId };

// Refleja database/schema/01-eventos.json. La validación dura está en MongoDB; ésta es la capa de la app.
const eventoSchema = new Schema<EventoAttrs>(
  {
    id_organizador: { type: String, required: true },
    nombre_evento: { type: String, required: true },
    descripcion: { type: String, required: true },
    fecha_evento: { type: Date, required: true },
    hora_evento: { type: String, required: true },
    hora_fin_evento: { type: String, default: null },
    direccion_evento: { type: String, required: true },
    categoria: { type: String, default: null },
    imagen: { type: String, default: null },
    cantidad_entradas: { type: Schema.Types.Int32, default: null },
    tipo_entrada: { type: String, enum: ['GRATUITA', 'PAGADA', null], default: null },
    precio: { type: Schema.Types.Int32, default: null },
    estado_gestion: { type: String, enum: EVENT_STATES, required: true, default: 'BORRADOR' },
  },
  {
    collection: 'eventos',
    versionKey: false,
    autoCreate: false,
    autoIndex: false,
    timestamps: { createdAt: 'fecha_creacion', updatedAt: 'fecha_actualizacion' },
  },
);

export const EventoModel = model<EventoAttrs>('Evento', eventoSchema);
