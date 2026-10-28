import mongoose from 'mongoose';
import type { EventPublisher, OutgoingMessage } from './event-publisher.js';

const { Int32, ObjectId } = mongoose.mongo;

// Patrón outbox (ADR-0003): el mensaje queda PENDIENTE en mensajes_salientes (database/schema/03-mensajes_salientes.json)
// y un publicador aparte lo entrega al broker cuando exista (Sprint 3). Así un broker caído no bloquea ni pierde el cambio.
// Se escribe con el driver: Mongoose no tipa bien Int32 en un documento con payload libre.
export class OutboxEventPublisher implements EventPublisher {
  constructor(private readonly log: (line: string) => void = console.log) {}

  async publish(topic: string, { envelope, payload }: OutgoingMessage): Promise<void> {
    await mongoose.connection.collection('mensajes_salientes').insertOne({
      id_evento: new ObjectId(envelope.id_evento), topico: topic, tipo: envelope.tipo, version: new Int32(envelope.version),
      fecha_cambio: new Date(envelope.fecha_cambio), payload, estado: 'PENDIENTE', intentos: new Int32(0),
      ultimo_error: null, fecha_creacion: new Date(), fecha_envio: null,
    });
    this.log(`[mensajeria] ${topic} ← ${envelope.tipo} ${envelope.id_evento}`);
  }
}
