import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { seedDemo } from '@panel/database/seed-demo';
import { setupTestApp } from './helpers/test-app.js';

// Fixtures del seed: la Feria (300 entradas) es un PUBLICADO de la Organizadora A
const A_BORRADOR = '66f1a0000000000000000001';
const A_PUBLICADO = '66f1a0000000000000000002';
const A_FINALIZADO = '66f1a0000000000000000004';
const A_CANCELADO = '66f1a0000000000000000005';
const B_PUBLICADO = '66f1b0000000000000000001';
const CANTIDAD_FERIA = 300;

let ctx: Awaited<ReturnType<typeof setupTestApp>>;
beforeAll(async () => { ctx = await setupTestApp(); });
beforeEach(async () => { await ctx.reset(); await seedDemo(mongoose.connection.db!); });
afterAll(async () => { await ctx.teardown(); });

const eliminar = (id: string, token: string | null = 'token-org-a', base = '/api/v1') => {
  const req = request(ctx.app).delete(`${base}/panel/eventos/mios/${id}`);
  return token ? req.set('Cookie', `jwt=${token}`) : req;
};
const db = () => mongoose.connection.db!;
const enBd = (id: string) => db().collection('eventos').findOne({ _id: new mongoose.Types.ObjectId(id) });
const mensajes = (id: string) => db().collection('mensajes_salientes').find({ id_evento: new mongoose.Types.ObjectId(id) }).toArray();
const topicosYTipos = async (id: string) => (await mensajes(id)).map((m) => `${m.topico} ${m.tipo}`).sort();

describe('HU-03 Eliminar un evento', () => {
  it('CA: un BORRADOR propio se elimina físicamente sin consultar a Entradas', async () => {
    const res = await eliminar(A_BORRADOR);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ resultado: 'ELIMINADO', id_evento: A_BORRADOR });
    expect(await enBd(A_BORRADOR)).toBeNull();
    expect(ctx.entradas.calls).toEqual([]);
    // Un BORRADOR sólo lo conocía Entradas
    expect(await topicosYTipos(A_BORRADOR)).toEqual(['panel.evento.entradas.v1 evento_eliminado']);
  });

  it('CA: un PUBLICADO sin entradas vendidas (stock = cantidad) se elimina físicamente', async () => {
    ctx.entradas.stock.set(A_PUBLICADO, CANTIDAD_FERIA);
    const res = await eliminar(A_PUBLICADO);
    expect(res.status).toBe(200);
    expect(res.body.resultado).toBe('ELIMINADO');
    expect(ctx.entradas.calls).toEqual([A_PUBLICADO]);
    expect(await enBd(A_PUBLICADO)).toBeNull();
    expect((await request(ctx.app).get(`/api/v1/organizador/eventos/${A_PUBLICADO}`)).status).toBe(404);
    expect(await topicosYTipos(A_PUBLICADO)).toEqual([
      'panel.evento.catalogo.v1 evento_eliminado', 'panel.evento.entradas.v1 evento_eliminado', 'panel.evento.promociones.v1 evento_eliminado',
    ]);
  });

  it('CA: un PUBLICADO que Entradas no conoce (404 en stock) se elimina: no hubo ventas', async () => {
    const res = await eliminar(A_PUBLICADO);
    expect(res.body.resultado).toBe('ELIMINADO');
    expect(await enBd(A_PUBLICADO)).toBeNull();
  });

  it('CA: un PUBLICADO con entradas vendidas no se elimina: pasa a CANCELADO y se registra el cambio', async () => {
    ctx.entradas.stock.set(A_PUBLICADO, CANTIDAD_FERIA - 25);
    const res = await eliminar(A_PUBLICADO);
    expect(res.status).toBe(200);
    expect(res.body.resultado).toBe('CANCELADO');
    expect(res.body.evento).toMatchObject({ id_evento: A_PUBLICADO, estado_gestion: 'CANCELADO' });
    expect(await enBd(A_PUBLICADO)).toMatchObject({ estado_gestion: 'CANCELADO' });
    const cambios = await db().collection('cambios_estado_evento')
      .find({ id_evento: new mongoose.Types.ObjectId(A_PUBLICADO) }).sort({ fecha_cambio: -1 }).toArray();
    expect(cambios[0]).toMatchObject({ estado_anterior: 'PUBLICADO', nuevo_estado: 'CANCELADO' });
  });

  it('CA: un evento cancelado deja de estar disponible en el catálogo público', async () => {
    ctx.entradas.stock.set(A_PUBLICADO, 0);
    await eliminar(A_PUBLICADO);
    const proximos = await request(ctx.app).get('/api/v1/organizador/eventos/proximos');
    expect(proximos.body.map((e: { id_evento: string }) => e.id_evento)).not.toContain(A_PUBLICADO);
    expect((await request(ctx.app).get(`/api/v1/organizador/eventos/${A_PUBLICADO}`)).status).toBe(404);
  });

  it('CA (HU-07): la cancelación se comunica por broker a Catálogo, Entradas, Check-in, Notificaciones y Promociones', async () => {
    ctx.entradas.stock.set(A_PUBLICADO, 10);
    await eliminar(A_PUBLICADO);
    expect(await topicosYTipos(A_PUBLICADO)).toEqual([
      'panel.evento.catalogo.v1 evento_cancelado', 'panel.evento.checkin.v1 evento_cancelado', 'panel.evento.entradas.v1 evento_cancelado',
      'panel.evento.notificaciones.v1 evento_actualizado', 'panel.evento.promociones.v1 evento_cancelado',
    ]);
    const todos = await mensajes(A_PUBLICADO);
    expect(todos.find((m) => m.topico === 'panel.evento.notificaciones.v1')!.payload)
      .toEqual({ id_evento: A_PUBLICADO, id_usuario: '3f1e2c1a-4b8d-4a2e-9c3f-7d1e2f9b2d4a', nuevo_estado: 'CANCELADO' });
    expect(todos.find((m) => m.topico === 'panel.evento.checkin.v1')!.payload).toMatchObject({ tipo_cambio: 'CANCELADO', estado_gestion: 'CANCELADO' });
  });

  it('CA: si Entradas no está disponible, el evento no se elimina y se pide intentar más tarde (503)', async () => {
    ctx.entradas.unavailable = true;
    const res = await eliminar(A_PUBLICADO);
    expect(res.status).toBe(503);
    expect(res.body.error.codigo).toBe('ENTRADAS_UNAVAILABLE');
    expect(await enBd(A_PUBLICADO)).toMatchObject({ estado_gestion: 'PUBLICADO' });
    expect(await mensajes(A_PUBLICADO)).toEqual([]);
  });

  it.each([[A_FINALIZADO, 'FINALIZADO'], [A_CANCELADO, 'CANCELADO']])('un evento %s (%s) no se elimina → 409', async (id) => {
    const res = await eliminar(id);
    expect(res.status).toBe(409);
    expect(res.body.error.codigo).toBe('INVALID_STATE_TRANSITION');
    expect(await enBd(id)).not.toBeNull();
  });

  it('CA: sólo el dueño puede eliminar (evento de B siendo A → 403)', async () => {
    const res = await eliminar(B_PUBLICADO);
    expect(res.status).toBe(403);
    expect(res.body.error.codigo).toBe('EVENT_NOT_OWNED');
    expect(await enBd(B_PUBLICADO)).not.toBeNull();
  });

  it('política de autorización: sin sesión 401, otro rol 403, inexistente 404, id inválido 400, Auth caído 503', async () => {
    expect((await eliminar(A_BORRADOR, null)).status).toBe(401);
    expect((await eliminar(A_BORRADOR, 'token-asistente')).body.error.codigo).toBe('FORBIDDEN_ROLE');
    expect((await eliminar('66f000000000000000000000')).status).toBe(404);
    expect((await eliminar('no-es-id')).body.error.codigo).toBe('INVALID_EVENT_ID');
    ctx.auth.unavailable = true;
    expect((await eliminar(A_BORRADOR)).status).toBe(503);
    expect(await enBd(A_BORRADOR)).not.toBeNull();
  });

  it('responde también por el prefijo del API Gateway (/api/organizador/v1)', async () => {
    const res = await eliminar(A_BORRADOR, 'token-org-a', '/api/organizador/v1');
    expect(res.status).toBe(200);
    expect(res.body.resultado).toBe('ELIMINADO');
  });
});
