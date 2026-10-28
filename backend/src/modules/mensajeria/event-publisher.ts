// INT-02: los casos de uso publican sólo a través de esta interfaz, nunca contra el cliente del broker.
// La tecnología del broker y los nombres de tópico son configuración (ADR-0003).

// Sobre del mensaje: viaja como cabecera (propiedades del mensaje en el broker), separado del cuerpo,
// para que el cuerpo sea exactamente el que define el contrato de cada squad consumidor
export type MessageEnvelope = {
  version: number;
  tipo: string;
  fecha_cambio: string;
  id_evento: string;
};

export type OutgoingMessage = { envelope: MessageEnvelope; payload: Record<string, unknown> };

export interface EventPublisher {
  publish(topic: string, message: OutgoingMessage): Promise<void>;
}

// Para desarrollo y tests: guarda lo publicado en memoria
export class InMemoryEventPublisher implements EventPublisher {
  published: Array<{ topic: string; message: OutgoingMessage }> = [];
  async publish(topic: string, message: OutgoingMessage): Promise<void> {
    this.published.push({ topic, message });
  }
}
