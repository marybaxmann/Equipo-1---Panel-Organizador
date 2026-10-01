import { Schema, model } from 'mongoose';
import { EVENT_STATES } from './evento.model.js';

const cambioEstadoSchema = new Schema(
  {
    id_evento: { type: Schema.Types.ObjectId, ref: 'Evento', required: true },
    estado_anterior: { type: String, enum: [...EVENT_STATES, null], default: null },
    nuevo_estado: { type: String, enum: EVENT_STATES, required: true },
    fecha_cambio: { type: Date, required: true },
    id_usuario_responsable: { type: String, required: true },
  },
  { collection: 'cambios_estado_evento', versionKey: false, autoCreate: false, autoIndex: false },
);

export const CambioEstadoModel = model('CambioEstado', cambioEstadoSchema);
