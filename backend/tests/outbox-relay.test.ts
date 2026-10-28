import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { seedDemo } from '@panel/database/seed-demo';
import type { Options } from 'amqplib';
import { OutboxEventPublisher } from '../src/modules/mensajeria/outbox.publisher.js';
import { OutboxRelay, type BrokerChannel, type BrokerConnection } from '../src/modules/mensajeria/outbox.relay.js';
import { setupTestApp } from './helpers/test-app.js';

// Canal falso: registra lo publicado y puede simular que el broker rechaza la confirmación
class FakeChannel implements BrokerChannel {
  published: Array<{ exchange: string; routingKey: string; body: unknown; options: Options.Publish }> = [];
  failNext = 0;
  publish(exchange: string, routingKey: string, content: Buffer, options: Options.Publish): boolean {
    this.published.push({ exchange, routingKey, body: JSON.parse(content.toString('utf8')), options });
    return true;
  }
  async waitForConfirms(): Promise<void> {
    if (this.failNext > 0) { this.failNext -= 1; throw new Error('nack del broker'); }
  }
}

class FakeConnection implements BrokerConnection {
  resets = 0;
  down = false;
  constructor(readonly ch: FakeChannel = new FakeChannel()) {}
  async channel(): Promise<BrokerChannel> { if (this.down) throw new Error('ECONNREFUSED'); return this.ch; }
  reset(): void { this.resets += 1; }
  async close(): Promise<void> {}
}

const outbox = () => mongoose.connection.db!.collection('mensajes_salientes');
const relayWith = (conn: BrokerConnection, maxIntentos = 3) =>
  new OutboxRelay(conn, { exchange: 'ticketu.events', pollMs: 10, maxIntentos, log: () => {} });

async function addPending(n: number, base = Date.parse('2030-01-01T00:00:00.000Z')) {
  const publisher = new OutboxEventPublisher(() => {});
  for (let i = 0; i < n; i += 1) {
    await publisher.publish(`panel.evento.test${i}.v1`, {
      envelope: { version: 1, tipo: 'evento_publicado', fecha_cambio: new Date(base + i).toISOString(), id_evento: '66f1a0000000000000000002' },
      payload: { id_evento: '66f1a0000000000000000002', orden: i },
    });
  }
}

let ctx: Awaited<ReturnType<typeof setupTestApp>>;
beforeAll(async () => { ctx = await setupTestApp(); });
beforeEach(async () => { await ctx.reset(); });
afterAll(async () => { await ctx.teardown(); });

describe('Publicador del outbox hacia RabbitMQ (HU-07, ADR-0013)', () => {
  it('un PENDIENTE se publica en el exchange con el tópico como routing key y queda ENVIADO', async () => {
    await addPending(1);
    const conn = new FakeConnection();
    expect(await relayWith(conn).runOnce()).toBe(1);

    const [sent] = conn.ch.published;
    expect(sent!.exchange).toBe('ticketu.events');
    expect(sent!.routingKey).toBe('panel.evento.test0.v1');
    expect(sent!.body).toEqual({ id_evento: '66f1a0000000000000000002', orden: 0 });
    const doc = await outbox().findOne({});
    expect(doc!.estado).toBe('ENVIADO');
    expect(doc!.fecha_envio).toBeInstanceOf(Date);
    // El sobre viaja en las propiedades del mensaje; el cuerpo es el del contrato
    expect(sent!.options).toMatchObject({
      persistent: true, contentType: 'application/json', type: 'evento_publicado', appId: 'organizador-service',
      messageId: doc!._id.toHexString(),
      headers: { version: 1, tipo: 'evento_publicado', id_evento: '66f1a0000000000000000002' },
    });
  });

  it('publicar un evento por la API termina con todos sus mensajes ENVIADO', async () => {
    await seedDemo(mongoose.connection.db!);
    const res = await request(ctx.app).post('/api/v1/panel/eventos/mios/66f1a0000000000000000001/publicar').set('Cookie', 'jwt=token-org-a');
    expect(res.status).toBe(200);
    const conn = new FakeConnection();
    const enviados = await relayWith(conn).runOnce();
    expect(enviados).toBe(5);
    expect(conn.ch.published.map((p) => p.routingKey).sort()).toEqual([
      'panel.evento.catalogo.v1', 'panel.evento.checkin.v1', 'panel.evento.entradas.v1', 'panel.evento.notificaciones.v1', 'panel.evento.promociones.v1',
    ]);
    expect(await outbox().countDocuments({ estado: { $ne: 'ENVIADO' } })).toBe(0);
  });

  it('respeta el orden de creación de los mensajes', async () => {
    await addPending(4);
    const conn = new FakeConnection();
    await relayWith(conn).runOnce();
    expect(conn.ch.published.map((p) => (p.body as { orden: number }).orden)).toEqual([0, 1, 2, 3]);
  });

  it('si el broker rechaza un mensaje: suma un intento, guarda el error, lo deja PENDIENTE y corta la vuelta', async () => {
    await addPending(2);
    const conn = new FakeConnection();
    conn.ch.failNext = 1;
    await expect(relayWith(conn).runOnce()).rejects.toThrow('nack del broker');
    const [primero, segundo] = await outbox().find({}).sort({ fecha_creacion: 1 }).toArray();
    expect(primero).toMatchObject({ estado: 'PENDIENTE', intentos: 1, ultimo_error: 'nack del broker' });
    expect(segundo).toMatchObject({ estado: 'PENDIENTE', intentos: 0 });
    expect(conn.resets).toBe(1); // descarta la conexión para reconectar en la próxima vuelta

    // En la vuelta siguiente salen los dos, en orden
    expect(await relayWith(conn).runOnce()).toBe(2);
    expect(await outbox().countDocuments({ estado: 'ENVIADO' })).toBe(2);
  });

  it('al llegar al máximo de intentos el mensaje queda FALLIDO y no bloquea a los siguientes', async () => {
    await addPending(2);
    const conn = new FakeConnection();
    const relay = relayWith(conn, 2);
    conn.ch.failNext = 2;
    await expect(relay.runOnce()).rejects.toThrow();
    await expect(relay.runOnce()).rejects.toThrow();
    expect(await relay.runOnce()).toBe(1);
    const docs = await outbox().find({}).sort({ fecha_creacion: 1 }).toArray();
    expect(docs.map((d) => d.estado)).toEqual(['FALLIDO', 'ENVIADO']);
    expect(docs[0]!.intentos).toBe(2);
  });

  it('con el broker caído no toca los mensajes ni gasta intentos', async () => {
    await addPending(1);
    const conn = new FakeConnection();
    conn.down = true;
    await expect(relayWith(conn).runOnce()).rejects.toThrow('broker no disponible');
    expect(await outbox().findOne({})).toMatchObject({ estado: 'PENDIENTE', intentos: 0 });
    conn.down = false;
    expect(await relayWith(conn).runOnce()).toBe(1);
  });

  it('dos publicadores en paralelo nunca publican el mismo mensaje dos veces', async () => {
    await addPending(20);
    const a = new FakeConnection();
    const b = new FakeConnection();
    const [na, nb] = await Promise.all([relayWith(a).runOnce(), relayWith(b).runOnce()]);
    expect(na + nb).toBe(20);
    const ids = [...a.ch.published, ...b.ch.published].map((p) => p.options.messageId);
    expect(new Set(ids).size).toBe(20);
  });

  it('al arrancar devuelve a PENDIENTE los mensajes que quedaron ENVIANDO por una caída', async () => {
    await addPending(1);
    await outbox().updateMany({}, { $set: { estado: 'ENVIANDO' } });
    const conn = new FakeConnection();
    const relay = relayWith(conn);
    expect(await relay.recoverInFlight()).toBe(1);
    expect(await relay.runOnce()).toBe(1);
  });

  it('la espera entre vueltas crece con los errores seguidos y tiene un tope', () => {
    const relay = new OutboxRelay(new FakeConnection(), { exchange: 'x', pollMs: 1000, maxIntentos: 3, maxBackoffMs: 5000, log: () => {} });
    expect(relay.nextDelay()).toBe(1000);
    (relay as unknown as { consecutiveFailures: number }).consecutiveFailures = 2;
    expect(relay.nextDelay()).toBe(4000);
    (relay as unknown as { consecutiveFailures: number }).consecutiveFailures = 6;
    expect(relay.nextDelay()).toBe(5000);
  });

  it('start y stop: publica en segundo plano y se detiene limpio', async () => {
    await addPending(3);
    const conn = new FakeConnection();
    const relay = relayWith(conn);
    await relay.start();
    for (let i = 0; i < 50 && conn.ch.published.length < 3; i += 1) await new Promise((r) => setTimeout(r, 20));
    await relay.stop();
    expect(conn.ch.published).toHaveLength(3);
    expect(await outbox().countDocuments({ estado: 'ENVIADO' })).toBe(3);
  });
});
