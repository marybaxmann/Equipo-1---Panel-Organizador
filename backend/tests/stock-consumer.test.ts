import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { seedDemo } from '@panel/database/seed-demo';
import { EventoModel } from '../src/modules/eventos/evento.model.js';
import { createEventoNotifier } from '../src/modules/mensajeria/evento.notifier.js';
import { OutboxEventPublisher } from '../src/modules/mensajeria/outbox.publisher.js';
import { applyStock, handleStockDelivery, MAX_REINTENTOS, parseStockMessage } from '../src/modules/mensajeria/stock.consumer.js';
import { loadTopics } from '../src/modules/mensajeria/topics.js';
import { setupTestApp } from './helpers/test-app.js';

// Fixtures del seed (IDs fijos)
const A_BORRADOR = '66f1a0000000000000000001';
const A_PUBLICADO = '66f1a0000000000000000002';
const INEXISTENTE = '66f000000000000000000000';

let ctx: Awaited<ReturnType<typeof setupTestApp>>;
const notify = createEventoNotifier(new OutboxEventPublisher(() => {}), loadTopics({}));
beforeAll(async () => { ctx = await setupTestApp(); });
beforeEach(async () => { await ctx.reset(); await seedDemo(mongoose.connection.db!); });
afterEach(() => { vi.restoreAllMocks(); });
afterAll(async () => { await ctx.teardown(); });

const db = () => mongoose.connection.db!;
const enBd = (id: string) => db().collection('eventos').findOne({ _id: new mongoose.Types.ObjectId(id) });
const mensajes = (id: string) => db().collection('mensajes_salientes').find({ id_evento: new mongoose.Types.ObjectId(id) }).toArray();
const buffer = (body: unknown) => Buffer.from(typeof body === 'string' ? body : JSON.stringify(body));

describe('Contrato Entradas §3.4: Panel recibe el aviso de stock por entradas.evento.stock.v1 (ADR-0018)', () => {
  it('acepta el sobre real de Entradas { eventId, eventName, occurredAt, source, data } (publish_event de su broker_service.py)', () => {
    const real = {
      eventId: '0b8c8b1e-7f0a-4c55-9f53-0d6a2f1d9a10', eventName: 'entradas.evento.stock.v1', occurredAt: '2026-11-17T23:10:00.000000',
      source: 'entradas-service', data: { id_evento: A_PUBLICADO, stock: 0 },
    };
    expect(parseStockMessage(real)).toEqual({ id_evento: A_PUBLICADO, stock: 0 });
  });

  it('acepta el cuerpo plano del contrato y el cuerpo con sobre { envelope, payload }', () => {
    expect(parseStockMessage({ id_evento: A_PUBLICADO, stock: 0 })).toEqual({ id_evento: A_PUBLICADO, stock: 0 });
    expect(parseStockMessage({ envelope: { tipo: 'stock_agotado' }, payload: { id_evento: A_PUBLICADO, stock: 0 } }))
      .toEqual({ id_evento: A_PUBLICADO, stock: 0 });
  });

  it.each([
    ['sin stock', { id_evento: A_PUBLICADO }],
    ['stock negativo', { id_evento: A_PUBLICADO, stock: -1 }],
    ['stock como texto', { id_evento: A_PUBLICADO, stock: '0' }],
    ['id_evento con formato inválido', { id_evento: 'evt-001', stock: 0 }],
  ])('rechaza un mensaje %s', (_label, body) => {
    expect(parseStockMessage(body)).toBeNull();
  });

  it('stock = 0 → el evento queda AGOTADO sin cambiar estado_gestion, y Catálogo lo ve AGOTADO', async () => {
    expect(await applyStock({ id_evento: A_PUBLICADO, stock: 0 }, notify)).toBe('ACTUALIZADO');
    expect(await enBd(A_PUBLICADO)).toMatchObject({ estado_gestion: 'PUBLICADO', estado_disponibilidad: 'AGOTADO' });
    const detalle = await request(ctx.app).get(`/api/v1/organizador/eventos/${A_PUBLICADO}`);
    expect(detalle.body).toMatchObject({ estado_gestion: 'PUBLICADO', estado_disponibilidad: 'AGOTADO' });
    const proximos = await request(ctx.app).get('/api/v1/organizador/eventos/proximos');
    expect(proximos.body.find((e: { id_evento: string }) => e.id_evento === A_PUBLICADO)).toMatchObject({ estado_disponibilidad: 'AGOTADO' });
  });

  it('Panel comunica AGOTADO a Catálogo por panel.evento.catalogo.v1 (y a nadie más)', async () => {
    await applyStock({ id_evento: A_PUBLICADO, stock: 0 }, notify);
    const todos = await mensajes(A_PUBLICADO);
    expect(todos.map((m) => `${m.topico} ${m.tipo}`)).toEqual(['panel.evento.catalogo.v1 evento_actualizado']);
    expect(todos[0]!.payload).toMatchObject({ id_evento: A_PUBLICADO, estado_gestion: 'PUBLICADO', estado_disponibilidad: 'AGOTADO' });
  });

  it('un aviso repetido no vuelve a escribir ni a avisar (idempotente)', async () => {
    await applyStock({ id_evento: A_PUBLICADO, stock: 0 }, notify);
    expect(await applyStock({ id_evento: A_PUBLICADO, stock: 0 }, notify)).toBe('SIN_CAMBIO');
    expect(await mensajes(A_PUBLICADO)).toHaveLength(1);
  });

  it('si Entradas informa stock > 0 después de agotarse, el evento vuelve a DISPONIBLE y se avisa a Catálogo', async () => {
    await applyStock({ id_evento: A_PUBLICADO, stock: 0 }, notify);
    expect(await applyStock({ id_evento: A_PUBLICADO, stock: 3 }, notify)).toBe('ACTUALIZADO');
    expect(await enBd(A_PUBLICADO)).toMatchObject({ estado_disponibilidad: 'DISPONIBLE' });
    const todos = await mensajes(A_PUBLICADO);
    expect(todos.map((m) => m.payload.estado_disponibilidad)).toEqual(['AGOTADO', 'DISPONIBLE']);
  });

  it('stock > 0 en un evento que nunca se agotó no genera escritura ni mensaje', async () => {
    expect(await applyStock({ id_evento: A_PUBLICADO, stock: 120 }, notify)).toBe('SIN_CAMBIO');
    expect(await mensajes(A_PUBLICADO)).toEqual([]);
  });

  it('un BORRADOR agotado se marca, pero no se avisa a Catálogo (no lo muestra)', async () => {
    expect(await applyStock({ id_evento: A_BORRADOR, stock: 0 }, notify)).toBe('ACTUALIZADO');
    expect(await enBd(A_BORRADOR)).toMatchObject({ estado_disponibilidad: 'AGOTADO' });
    expect(await mensajes(A_BORRADOR)).toEqual([]);
  });

  it('un evento que Panel no tiene se confirma (ACK) sin error', async () => {
    const result = await handleStockDelivery(buffer({ id_evento: INEXISTENTE, stock: 0 }), 0, notify);
    expect(result).toMatchObject({ action: 'ack' });
    expect(result.log).toContain('EVENTO_NO_ENCONTRADO');
  });

  it('un cuerpo que no es JSON o no cumple el contrato se descarta (no se reintenta)', async () => {
    expect((await handleStockDelivery(buffer('no es json'), 0, notify)).action).toBe('discard');
    expect((await handleStockDelivery(buffer({ id_evento: A_PUBLICADO }), 0, notify)).action).toBe('discard');
  });

  it(`un error al guardar se reintenta hasta ${MAX_REINTENTOS} veces y luego se descarta con log`, async () => {
    vi.spyOn(EventoModel, 'findOneAndUpdate').mockImplementation(() => { throw new Error('mongo caído'); });
    const body = buffer({ id_evento: A_PUBLICADO, stock: 0 });
    expect(await handleStockDelivery(body, 0, notify)).toMatchObject({ action: 'retry', reintento: 1 });
    expect(await handleStockDelivery(body, MAX_REINTENTOS - 1, notify)).toMatchObject({ action: 'retry', reintento: MAX_REINTENTOS });
    const final = await handleStockDelivery(body, MAX_REINTENTOS, notify);
    expect(final.action).toBe('discard');
    expect(final.log).toContain('mongo caído');
  });
});
