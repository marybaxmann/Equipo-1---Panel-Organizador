import { connect, type ChannelModel, type ConfirmChannel, type Options } from 'amqplib';
import mongoose from 'mongoose';

const { Int32 } = mongoose.mongo;
type ObjectId = mongoose.mongo.ObjectId;

// Publicador del outbox (ADR-0003, ADR-0013): toma los mensajes PENDIENTE de mensajes_salientes, los publica en el
// exchange compartido de TicketU (RabbitMQ) y los marca ENVIADO. La API nunca espera al broker: si está caído,
// los mensajes se acumulan y salen cuando vuelve.

export type EstadoMensaje = 'PENDIENTE' | 'ENVIANDO' | 'ENVIADO' | 'FALLIDO';

export type MensajeSaliente = {
  _id: ObjectId; id_evento: ObjectId; topico: string; tipo: string; version: number; fecha_cambio: Date;
  // Los enteros se guardan como Int32 (validador bsonType int); al leerlos el driver los entrega como number
  payload: Record<string, unknown>; estado: EstadoMensaje; intentos: number | mongoose.mongo.Int32; ultimo_error: string | null;
  fecha_creacion: Date; fecha_envio: Date | null;
};

// Lo mínimo que el relay necesita del broker; en los tests se reemplaza por un canal falso
export interface BrokerChannel {
  publish(exchange: string, routingKey: string, content: Buffer, options: Options.Publish): boolean;
  waitForConfirms(): Promise<void>;
}

export interface BrokerConnection {
  channel(): Promise<BrokerChannel>;
  // Descarta la conexión actual (después de un error) para que la próxima llamada a channel() reconecte
  reset(): void;
  close(): Promise<void>;
}

export type OutboxRelayOptions = {
  exchange: string;
  pollMs: number;
  maxIntentos: number;
  appId?: string;
  maxBackoffMs?: number;
  log?: (line: string) => void;
};

const COLLECTION = 'mensajes_salientes';
const MAX_ERROR_LENGTH = 500;
const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error)).slice(0, MAX_ERROR_LENGTH);

// Propiedades AMQP: el cuerpo es exactamente el del contrato de cada squad; el sobre (ADR-0003) viaja en las cabeceras
export function publishOptions(msg: MensajeSaliente, appId: string): Options.Publish {
  return {
    contentType: 'application/json', contentEncoding: 'utf-8', persistent: true,
    messageId: msg._id.toHexString(), type: msg.tipo, appId, timestamp: Math.floor(msg.fecha_creacion.getTime() / 1000),
    headers: { version: msg.version, tipo: msg.tipo, id_evento: msg.id_evento.toHexString(), fecha_cambio: msg.fecha_cambio.toISOString() },
  };
}

export class OutboxRelay {
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private stopped = false;
  private consecutiveFailures = 0;
  private readonly log: (line: string) => void;

  constructor(
    private readonly broker: BrokerConnection,
    private readonly opts: OutboxRelayOptions,
    private readonly db: () => mongoose.mongo.Db = () => mongoose.connection.db!,
  ) {
    this.log = opts.log ?? console.log;
  }

  private get collection() { return this.db().collection<MensajeSaliente>(COLLECTION); }

  // Un mensaje queda ENVIANDO sólo mientras se publica; si el proceso se cayó en ese momento, vuelve a PENDIENTE.
  // El consumidor puede recibirlo dos veces: por eso cada mensaje lleva messageId estable para deduplicar.
  async recoverInFlight(): Promise<number> {
    const { modifiedCount } = await this.collection.updateMany({ estado: 'ENVIANDO' }, { $set: { estado: 'PENDIENTE' } });
    if (modifiedCount > 0) this.log(`[outbox] ${modifiedCount} mensaje(s) ENVIANDO devueltos a PENDIENTE`);
    return modifiedCount;
  }

  // Reserva el PENDIENTE más antiguo. findOneAndUpdate es atómico: dos relays nunca toman el mismo mensaje.
  private claimNext() {
    return this.collection.findOneAndUpdate(
      { estado: 'PENDIENTE' },
      { $set: { estado: 'ENVIANDO' } },
      { sort: { fecha_creacion: 1, _id: 1 }, returnDocument: 'after' },
    );
  }

  // Publica hasta vaciar la cola de pendientes (o hasta el primer error). Devuelve cuántos quedaron ENVIADO.
  async runOnce(): Promise<number> {
    let channel: BrokerChannel;
    try {
      channel = await this.broker.channel();
    } catch (error) {
      // Broker inalcanzable: no se toca ningún mensaje, así que no se gastan intentos
      this.broker.reset();
      throw new Error(`broker no disponible: ${errorText(error)}`);
    }
    let sent = 0;
    for (;;) {
      if (this.stopped) return sent;
      const msg = await this.claimNext();
      if (!msg) return sent;
      try {
        channel.publish(this.opts.exchange, msg.topico, Buffer.from(JSON.stringify(msg.payload)), publishOptions(msg, this.opts.appId ?? 'organizador-service'));
        await channel.waitForConfirms();
      } catch (error) {
        const intentos = Number(msg.intentos) + 1;
        const estado: EstadoMensaje = intentos >= this.opts.maxIntentos ? 'FALLIDO' : 'PENDIENTE';
        await this.collection.updateOne({ _id: msg._id }, { $set: { estado, intentos: new Int32(intentos), ultimo_error: errorText(error) } });
        this.log(`[outbox] error al publicar ${msg.topico} ${msg._id.toHexString()} (intento ${intentos}${estado === 'FALLIDO' ? ', FALLIDO' : ''}): ${errorText(error)}`);
        this.broker.reset();
        throw error;
      }
      await this.collection.updateOne({ _id: msg._id }, { $set: { estado: 'ENVIADO', fecha_envio: new Date() } });
      sent += 1;
      this.log(`[outbox] ${msg.topico} → ${msg.tipo} ${msg.id_evento.toHexString()}`);
    }
  }

  // Espera entre vueltas: pollMs si todo va bien; con errores seguidos crece al doble hasta maxBackoffMs
  nextDelay(): number {
    const max = this.opts.maxBackoffMs ?? 30_000;
    return this.consecutiveFailures === 0 ? this.opts.pollMs : Math.min(max, this.opts.pollMs * 2 ** this.consecutiveFailures);
  }

  private async tick(): Promise<void> {
    if (this.running || this.stopped) return;
    this.running = true;
    try {
      await this.runOnce();
      this.consecutiveFailures = 0;
    } catch (error) {
      this.consecutiveFailures += 1;
      if (this.consecutiveFailures === 1 || this.consecutiveFailures % 10 === 0) {
        this.log(`[outbox] sin publicar (${this.consecutiveFailures} vuelta(s) con error): ${errorText(error)}`);
      }
    } finally {
      this.running = false;
      if (!this.stopped) this.timer = setTimeout(() => void this.tick(), this.nextDelay());
    }
  }

  async start(): Promise<void> {
    this.stopped = false;
    await this.recoverInFlight();
    this.log(`[outbox] publicando en el exchange ${this.opts.exchange} cada ${this.opts.pollMs} ms`);
    void this.tick();
  }

  async stop(): Promise<void> {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    while (this.running) await new Promise((resolve) => setTimeout(resolve, 20));
    await this.broker.close();
  }
}

// Conexión real a RabbitMQ: ConfirmChannel (el broker confirma cada mensaje) y exchange topic durable compartido
export function createAmqpConnection(url: string, exchange: string, log: (line: string) => void = console.log): BrokerConnection {
  let model: ChannelModel | null = null;
  let channel: ConfirmChannel | null = null;
  let opening: Promise<ConfirmChannel> | null = null;

  const drop = () => {
    const current = model;
    model = null; channel = null;
    if (current) void current.close().catch(() => {});
  };

  async function open(): Promise<ConfirmChannel> {
    const m = await connect(url);
    // Sin estos listeners, un error de red tumbaría el proceso completo
    m.on('error', (error: Error) => log(`[outbox] error de conexión con el broker: ${error.message}`));
    m.on('close', () => { if (model === m) { model = null; channel = null; } });
    try {
      const c = await m.createConfirmChannel();
      c.on('error', (error: Error) => log(`[outbox] error del canal: ${error.message}`));
      c.on('close', () => { if (channel === c) channel = null; });
      await c.assertExchange(exchange, 'topic', { durable: true });
      model = m; channel = c;
      log(`[outbox] conectado al broker (exchange ${exchange})`);
      return c;
    } catch (error) {
      void m.close().catch(() => {});
      throw error;
    }
  }

  return {
    async channel() {
      if (channel) return channel;
      opening ??= open().finally(() => { opening = null; });
      return opening;
    },
    reset: drop,
    async close() {
      const current = model;
      model = null; channel = null;
      if (current) await current.close().catch(() => {});
    },
  };
}
