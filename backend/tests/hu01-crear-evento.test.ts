import request from 'supertest';
import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { setupTestApp } from './helpers/test-app.js';
import { ORG_A } from './helpers/fake-auth.js';

let ctx: Awaited<ReturnType<typeof setupTestApp>>;
beforeAll(async () => { ctx = await setupTestApp(); });
beforeEach(async () => { await ctx.reset(); });
afterAll(async () => { await ctx.teardown(); });

const URL = '/api/v1/panel/eventos';
const valid = { nombre_evento: 'Feria de Innovación', descripcion: 'Muestra anual', fecha_evento: '2030-10-15', hora_evento: '18:00', direccion_evento: 'Auditorio Principal' };
const post = (body: object, token = 'token-org-a') => request(ctx.app).post(URL).set('Cookie', `jwt=${token}`).send(body);

describe('HU-01 Crear un evento', () => {
  it('CA: crea el evento en BORRADOR asociado al organizador autenticado', async () => {
    const res = await post(valid);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ ...valid, estado_gestion: 'BORRADOR', id_organizador: ORG_A.id_usuario });
    expect(res.body.id_evento).toMatch(/^[a-f0-9]{24}$/);
  });

  it('registra el cambio de estado inicial (null → BORRADOR)', async () => {
    const res = await post(valid);
    const cambios = await mongoose.connection.db!.collection('cambios_estado_evento').find().toArray();
    expect(cambios).toHaveLength(1);
    expect(cambios[0]).toMatchObject({ estado_anterior: null, nuevo_estado: 'BORRADOR', id_usuario_responsable: ORG_A.id_usuario });
    expect(cambios[0]!.id_evento.toString()).toBe(res.body.id_evento);
  });

  it('CA: valida campos obligatorios y devuelve el detalle por campo', async () => {
    const res = await post({});
    expect(res.status).toBe(400);
    const campos = res.body.error.detalles.map((d: { campo: string }) => d.campo);
    expect(campos).toEqual(expect.arrayContaining(['nombre_evento', 'descripcion', 'fecha_evento', 'hora_evento', 'direccion_evento']));
    expect(res.body.error.detalles.every((d: any) => d.mensaje === 'Este campo es obligatorio')).toBe(true);
  });

  it('rechaza un precio fuera de rango con 400 (no 500)', async () => {
    const res = await post({ ...valid, tipo_entrada: 'PAGADA', precio: 3_000_000_000 });
    expect(res.status).toBe(400);
    expect(res.body.error.detalles[0].campo).toBe('precio');
  });

  it('rechaza una fecha pasada', async () => {
    const res = await post({ ...valid, fecha_evento: '2020-01-01' });
    expect(res.status).toBe(400);
    expect(res.body.error.detalles[0].campo).toBe('fecha_evento');
  });

  it('rechaza evento PAGADA sin precio', async () => {
    const res = await post({ ...valid, tipo_entrada: 'PAGADA' });
    expect(res.status).toBe(400);
  });

  it('acepta campos opcionales y guarda precio entero', async () => {
    const res = await post({ ...valid, tipo_entrada: 'PAGADA', precio: 5000, cantidad_entradas: 200, hora_fin_evento: '21:00', categoria: 'academico' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ precio: 5000, cantidad_entradas: 200, hora_fin_evento: '21:00' });
  });

  it('acepta un evento que termina después de medianoche (contrato Check-in v1.2 §3.2)', async () => {
    const res = await post({ ...valid, hora_evento: '21:00', hora_fin_evento: '03:00' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ hora_evento: '21:00', hora_fin_evento: '03:00' });
  });

  it('HU-06: no permite imponer dueño ni estado desde el body', async () => {
    const res = await post({ ...valid, id_organizador: 'otro', estado_gestion: 'PUBLICADO' });
    expect(res.status).toBe(400);
  });

  it('HU-06: 401 sin sesión y 403 si no es organizador', async () => {
    expect((await request(ctx.app).post(URL).send(valid)).status).toBe(401);
    expect((await post(valid, 'token-asistente')).status).toBe(403);
  });

  it('HU-06: 503 si Auth no está disponible y no crea nada', async () => {
    ctx.auth.unavailable = true;
    expect((await post(valid)).status).toBe(503);
    expect(await mongoose.connection.db!.collection('eventos').countDocuments()).toBe(0);
  });
});
