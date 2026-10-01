import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { seedDemo } from '@panel/database/seed-demo';
import { setupTestApp } from './helpers/test-app.js';

// Fixtures del seed: A_BORRADOR y A_PUBLICADO son de la Organizadora A; B_BORRADOR es del Organizador B
const A_BORRADOR = '66f1a0000000000000000001';
const A_PUBLICADO = '66f1a0000000000000000002';
const B_BORRADOR = '66f1b0000000000000000002';

let ctx: Awaited<ReturnType<typeof setupTestApp>>;
beforeAll(async () => { ctx = await setupTestApp(); });
beforeEach(async () => { await ctx.reset(); await seedDemo(mongoose.connection.db!); });
afterAll(async () => { await ctx.teardown(); });

const publicar = (id: string, token = 'token-org-a') =>
  request(ctx.app).post(`/api/v1/panel/eventos/mios/${id}/publicar`).set('Cookie', `jwt=${token}`);

describe('HU-04 Publicar un evento', () => {
  it('CA: un BORRADOR propio pasa a PUBLICADO y queda registrado el cambio de estado', async () => {
    const res = await publicar(A_BORRADOR);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id_evento: A_BORRADOR, estado_gestion: 'PUBLICADO' });
    const cambios = await mongoose.connection.db!.collection('cambios_estado_evento')
      .find({ id_evento: new mongoose.Types.ObjectId(A_BORRADOR) }).sort({ fecha_cambio: -1 }).toArray();
    expect(cambios[0]).toMatchObject({ estado_anterior: 'BORRADOR', nuevo_estado: 'PUBLICADO' });
  });

  it('CA: al publicarse aparece en Catálogo (antes no era visible)', async () => {
    expect((await request(ctx.app).get(`/api/v1/organizador/eventos/${A_BORRADOR}`)).status).toBe(404);
    await publicar(A_BORRADOR);
    expect((await request(ctx.app).get(`/api/v1/organizador/eventos/${A_BORRADOR}`)).status).toBe(200);
  });

  it('CA: sólo un BORRADOR puede publicarse (PUBLICADO → 409)', async () => {
    const res = await publicar(A_PUBLICADO);
    expect(res.status).toBe(409);
    expect(res.body.error.codigo).toBe('INVALID_STATE_TRANSITION');
  });

  it('CA: sólo eventos propios (evento de B siendo A → 403)', async () => {
    const res = await publicar(B_BORRADOR);
    expect(res.status).toBe(403);
    expect(res.body.error.codigo).toBe('EVENT_NOT_OWNED');
  });

  it('exige hora_fin_evento para publicar (contrato Check-in v1.2)', async () => {
    const creado = await request(ctx.app).post('/api/v1/panel/eventos').set('Cookie', 'jwt=token-org-a')
      .send({ nombre_evento: 'Sin hora de término', descripcion: 'd', fecha_evento: '2030-01-10', hora_evento: '10:00', direccion_evento: 'Sala 1' });
    const res = await publicar(creado.body.id_evento);
    expect(res.status).toBe(400);
    expect(res.body.error.detalles.map((d: { campo: string }) => d.campo)).toEqual(['hora_fin_evento']);
  });

  it('HU-06: sin sesión 401 · rol asistente 403 · id inexistente 404', async () => {
    expect((await request(ctx.app).post(`/api/v1/panel/eventos/mios/${A_BORRADOR}/publicar`)).status).toBe(401);
    expect((await publicar(A_BORRADOR, 'token-asistente')).status).toBe(403);
    expect((await publicar('66f000000000000000000000')).status).toBe(404);
  });
});
