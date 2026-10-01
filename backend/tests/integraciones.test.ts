import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { seedDemo } from '@panel/database/seed-demo';
import { setupTestApp } from './helpers/test-app.js';

// Fixtures = seed de la demo (IDs fijos). Fechas absolutas en 2026-11/12, válidas hasta fin de 2026.
const A_BORRADOR = '66f1a0000000000000000001';
const A_PUB_FERIA = '66f1a0000000000000000002';
const A_PUB_CHARLA = '66f1a0000000000000000003';
const A_FINALIZADO = '66f1a0000000000000000004';
const B_PUB = '66f1b0000000000000000001';

let ctx: Awaited<ReturnType<typeof setupTestApp>>;
beforeAll(async () => { ctx = await setupTestApp(); });
beforeEach(async () => { await ctx.reset(); await seedDemo(mongoose.connection.db!); });
afterAll(async () => { await ctx.teardown(); });

const get = (path: string) => request(ctx.app).get(`/api/v1${path}`);
const ids = (body: { id_evento: string }[]) => body.map((e) => e.id_evento);

describe('Integración — Catálogo', () => {
  it('próximos: sólo PUBLICADO con fecha futura, ordenados por fecha, con estado_disponibilidad', async () => {
    const res = await get('/organizador/eventos/proximos');
    expect(res.status).toBe(200);
    expect(ids(res.body)).toEqual([B_PUB, A_PUB_FERIA, A_PUB_CHARLA]);
    expect(res.body.every((e: { estado_disponibilidad: string }) => e.estado_disponibilidad === 'DISPONIBLE')).toBe(true);
  });

  it('buscar: texto en nombre o descripción, case-insensitive, sólo PUBLICADO', async () => {
    const res = await request(ctx.app).post('/api/v1/organizador/eventos/buscar').send({ texto: 'FERIA' });
    expect(res.status).toBe(200);
    expect(ids(res.body)).toEqual([A_PUB_FERIA]);
    const porDescripcion = await request(ctx.app).post('/api/v1/organizador/eventos/buscar').send({ texto: 'buenas prácticas' });
    expect(ids(porDescripcion.body)).toEqual([A_PUB_CHARLA]);
  });

  it('buscar: categoría y rango de fechas; excluye BORRADOR y FINALIZADO de la misma categoría', async () => {
    const res = await request(ctx.app).post('/api/v1/organizador/eventos/buscar').send({ categoria: 'tecnologia', fecha_desde: '2026-11-01', fecha_hasta: '2026-12-31' });
    expect(ids(res.body)).toEqual([A_PUB_CHARLA]);
  });

  it('buscar: caracteres de regex se tratan como texto literal', async () => {
    const res = await request(ctx.app).post('/api/v1/organizador/eventos/buscar').send({ texto: '.*' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('buscar: body inválido → 400', async () => {
    const res = await request(ctx.app).post('/api/v1/organizador/eventos/buscar').send({ fecha_desde: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error.detalles[0].campo).toBe('fecha_desde');
  });

  it('detalle: BORRADOR no es visible (404); PUBLICADO devuelve el contrato', async () => {
    expect((await get(`/organizador/eventos/${A_BORRADOR}`)).status).toBe(404);
    const res = await get(`/organizador/eventos/${A_PUB_FERIA}`);
    expect(res.status).toBe(200);
    expect(Object.keys(res.body).sort()).toEqual(['categoria', 'descripcion', 'direccion_evento', 'estado_disponibilidad', 'estado_gestion',
      'fecha_evento', 'hora_evento', 'hora_fin_evento', 'id_evento', 'imagen', 'nombre_evento', 'precio', 'tipo_entrada']);
  });
});

// GET /panel/eventos/{id}: compartido por Entradas y Check-in (contrato Check-in v1.2 §2.4 y §3.4)
const getConSesion = (path: string, token: string) => get(path).set('Cookie', `jwt=${token}`);

describe('Integración — Entradas y Check-in (GET compartido)', () => {
  it('staff obtiene los campos de ambos contratos, con hora_fin_evento', async () => {
    const res = await getConSesion(`/panel/eventos/${A_FINALIZADO}`, 'token-staff');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id_evento: A_FINALIZADO, id_usuario: '3f1e2c1a-4b8d-4a2e-9c3f-7d1e2f9b2d4a', nombre_evento: 'Hackathon UV 2026',
      direccion_evento: 'Gimnasio Universitario', fecha_evento: '2026-08-20', hora_evento: '09:00', hora_fin_evento: '21:00',
      cantidad_entradas: 80, tipo_entrada: 'GRATUITA', estado_gestion: 'FINALIZADO',
    });
  });

  it('organizador también puede consultar', async () => {
    expect((await getConSesion(`/panel/eventos/${A_PUB_FERIA}`, 'token-org-b')).status).toBe(200);
  });

  it('un BORRADOR no se expone (404)', async () => {
    expect((await getConSesion(`/panel/eventos/${A_BORRADOR}`, 'token-staff')).status).toBe(404);
  });

  it('sin sesión 401 · rol no autorizado 403 · Auth caído 503', async () => {
    expect((await get(`/panel/eventos/${A_PUB_FERIA}`)).status).toBe(401);
    const asistente = await getConSesion(`/panel/eventos/${A_PUB_FERIA}`, 'token-asistente');
    expect(asistente.status).toBe(403);
    expect(asistente.body.error.codigo).toBe('FORBIDDEN_ROLE');
    ctx.auth.unavailable = true;
    expect((await getConSesion(`/panel/eventos/${A_PUB_FERIA}`, 'token-staff')).status).toBe(503);
  });

  it('id inválido o inexistente → 404', async () => {
    for (const id of ['no-es-id', '66f000000000000000000000']) {
      expect((await getConSesion(`/panel/eventos/${id}`, 'token-staff')).status).toBe(404);
    }
  });
});

describe('Integración — Notificaciones', () => {
  it('historial de cambios de estado, más reciente primero', async () => {
    const res = await get(`/panel/eventos/${A_FINALIZADO}/cambios-estado`);
    expect(res.status).toBe(200);
    expect(res.body.map((c: { nuevo_estado: string }) => c.nuevo_estado)).toEqual(['FINALIZADO', 'PUBLICADO', 'BORRADOR']);
    expect(res.body[0]).toMatchObject({ tipo: 'evento_actualizado', id_evento: A_FINALIZADO });
  });
});

describe('Integración — Promociones', () => {
  it('eventos disponibles: sólo PUBLICADO con id, nombre y fecha', async () => {
    const res = await get('/panel/eventos-disponibles');
    expect(ids(res.body)).toEqual([B_PUB, A_PUB_FERIA, A_PUB_CHARLA]);
    expect(Object.keys(res.body[0]).sort()).toEqual(['fecha_evento', 'id_evento', 'nombre_evento']);
  });
});

describe('Integración — robustez', () => {
  it.each([
    '/organizador/eventos/no-es-id',
    '/panel/eventos/no-es-id/cambios-estado', '/panel/eventos/66f000000000000000000000/cambios-estado',
  ])('id inválido o inexistente → 404: %s', async (path) => {
    const res = await get(path);
    expect(res.status).toBe(404);
    expect(res.body.error.codigo).toBe('EVENT_NOT_FOUND');
  });

  it('regresión de orden de rutas: /panel/eventos/mios sin cookie sigue en 401', async () => {
    expect((await get('/panel/eventos/mios')).status).toBe(401);
  });

  it('swagger servido desde docs/api', async () => {
    const res = await request(ctx.app).get('/api-docs/openapi.json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toMatch(/^3\.1/);
  });
});
