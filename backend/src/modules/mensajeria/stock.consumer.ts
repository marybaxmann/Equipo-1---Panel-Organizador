import { connect, type Channel, type ChannelModel, type ConsumeMessage } from 'amqplib';
import { z } from 'zod';
import { EventoModel, type Disponibilidad, type EventoDoc } from '../eventos/evento.model.js';
import type { EventoNotifier } from './evento.notifier.js';

// Consumidor de entradas.evento.stock.v1 (contrato Entradas §3.4, ADR-0018). Es el único dato que Panel RECIBE por broker:
// cuando Entradas informa stock = 0, el evento queda AGOTADO y Panel se lo comunica a Catálogo. El stock en sí no se guarda (ADR-0007).

const OBJECT_ID = /^[0-9a-f]{24}$/i;
const stockSchema = z.object({ id_evento: z.string().regex(OBJECT_ID), stock: z.number().int().min(0) });
export type StockMessage = z.infer<typeof stockSchema>;

// Contrato Entradas §3.4: { id_evento, stock }. Entradas publica con el sobre estándar de TicketU
// { eventId, eventName, occurredAt, source, data } (publish_event de su broker_service.py), así que los datos vienen en "data".
// También se aceptan el cuerpo plano del contrato y { envelope, payload } (ADR-0017)
export function parseStockMessage(body: unknown): StockMessage | null {
  let candidate = body;
  if (typeof body === 'object' && body !== null) {
    if ('data' in body) candidate = body.data;
    else if ('payload' in body) candidate = body.payload;
  }
  const parsed = stockSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

export type StockResult = 'ACTUALIZADO' | 'SIN_CAMBIO' | 'EVENTO_NO_ENCONTRADO';

// stock = 0 → AGOTADO. stock > 0 → vuelve a DISPONIBLE (por ejemplo, tras una devolución): el contrato sólo exige avisar
// el 0, pero si Entradas informa otro valor, Panel no deja un evento marcado como agotado cuando ya no lo está.
// Atómico e idempotente: sólo escribe y avisa si la disponibilidad cambia, así un mensaje repetido no genera otro aviso.
export async function applyStock(msg: StockMessage, notify: EventoNotifier): Promise<StockResult> {
  const nueva: Disponibilidad = msg.stock === 0 ? 'AGOTADO' : 'DISPONIBLE';
  const distinta = nueva === 'AGOTADO' ? { estado_disponibilidad: { $ne: 'AGOTADO' as const } } : { estado_disponibilidad: 'AGOTADO' as const };
  const evento = await EventoModel.findOneAndUpdate(
    { _id: msg.id_evento, ...distinta },
    { $set: { estado_disponibilidad: nueva } },
    { returnDocument: 'after' },
  ).lean<EventoDoc>();
  if (evento) {
    await notify({ kind: 'DISPONIBILIDAD', evento });
    return 'ACTUALIZADO';
  }
  return (await EventoModel.exists({ _id: msg.id_evento })) ? 'SIN_CAMBIO' : 'EVENTO_NO_ENCONTRADO';
}

// Política propuesta en ADR-0014: ACK después de guardar y hasta 3 reintentos ante un error de procesamiento
export const MAX_REINTENTOS = 3;
export const RETRY_HEADER = 'x-reintentos';

export type DeliveryAction =
  | { action: 'ack'; log: string }
  | { action: 'retry'; reintento: number; log: string }
  | { action: 'discard'; log: string };

export async function handleStockDelivery(content: Buffer, reintentos: number, notify: EventoNotifier): Promise<DeliveryAction> {
  let body: unknown;
  try {
    body = JSON.parse(content.toString('utf8'));
  } catch {
    return { action: 'discard', log: 'descartado: el cuerpo no es JSON' };
  }
  const msg = parseStockMessage(body);
  // Un mensaje mal formado no mejora reintentándolo: se descarta y queda en el log para avisar a Entradas
  if (!msg) return { action: 'discard', log: `descartado: no cumple { id_evento, stock } :: ${content.toString('utf8').slice(0, 300)}` };
  try {
    const result = await applyStock(msg, notify);
    return { action: 'ack', log: `${msg.id_evento} stock=${msg.stock} → ${result}` };
  } catch (error) {
    const detalle = error instanceof Error ? error.message : String(error);
    if (reintentos < MAX_REINTENTOS) {
      return { action: 'retry', reintento: reintentos + 1, log: `error en ${msg.id_evento} (reintento ${reintentos + 1}/${MAX_REINTENTOS}): ${detalle}` };
    }
    return { action: 'discard', log: `descartado tras ${MAX_REINTENTOS} reintentos ${msg.id_evento} stock=${msg.stock}: ${detalle}` };
  }
}

export type StockConsumerOptions = {
  url: string;
  exchange: string;
  queue: string;
  routingKey: string;
  notify: EventoNotifier;
  reconnectMs?: number;
  log?: (line: string) => void;
};

export type StockConsumer = { stop(): Promise<void> };

// Cola durable propia del Panel enlazada al exchange compartido (ADR-0014). Si el broker se cae, reconecta solo;
// mientras tanto la API sigue funcionando y los mensajes esperan en la cola.
export function startStockConsumer(opts: StockConsumerOptions): StockConsumer {
  const log = opts.log ?? console.log;
  let model: ChannelModel | null = null;
  let timer: NodeJS.Timeout | null = null;
  let stopped = false;

  const scheduleReconnect = () => {
    if (!stopped) timer = setTimeout(() => void open(), opts.reconnectMs ?? 5000);
  };

  async function process(channel: Channel, delivery: ConsumeMessage) {
    const reintentos = Number(delivery.properties.headers?.[RETRY_HEADER] ?? 0) || 0;
    const result = await handleStockDelivery(delivery.content, reintentos, opts.notify);
    log(`[stock] ${result.log}`);
    try {
      if (result.action === 'retry') {
        await new Promise((resolve) => setTimeout(resolve, 1000 * result.reintento));
        channel.sendToQueue(opts.queue, delivery.content, {
          contentType: 'application/json', persistent: true,
          headers: { ...delivery.properties.headers, [RETRY_HEADER]: result.reintento },
        });
      }
      channel.ack(delivery);
    } catch {
      // Canal cerrado: sin ACK, el broker vuelve a entregar el mensaje al reconectar
    }
  }

  async function open(): Promise<void> {
    let m: ChannelModel | null = null;
    try {
      m = await connect(opts.url);
      const current = m;
      // Sin estos listeners, un error de red tumbaría el proceso completo
      current.on('error', (error: Error) => log(`[stock] error de conexión con el broker: ${error.message}`));
      current.on('close', () => {
        if (model !== current) return;
        model = null;
        log('[stock] conexión cerrada; se reintenta');
        scheduleReconnect();
      });
      const channel = await current.createChannel();
      channel.on('error', (error: Error) => log(`[stock] error del canal: ${error.message}`));
      await channel.assertExchange(opts.exchange, 'topic', { durable: true });
      await channel.assertQueue(opts.queue, { durable: true });
      await channel.bindQueue(opts.queue, opts.exchange, opts.routingKey);
      await channel.prefetch(1);
      if (stopped) {
        await current.close();
        return;
      }
      model = current;
      await channel.consume(opts.queue, (delivery) => { if (delivery) void process(channel, delivery); });
      log(`[stock] escuchando ${opts.routingKey} en la cola ${opts.queue} (exchange ${opts.exchange})`);
    } catch (error) {
      if (m) void m.close().catch(() => {});
      log(`[stock] broker no disponible: ${error instanceof Error ? error.message : String(error)}`);
      scheduleReconnect();
    }
  }

  void open();
  return {
    async stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
      const current = model;
      model = null;
      if (current) await current.close().catch(() => {});
    },
  };
}
