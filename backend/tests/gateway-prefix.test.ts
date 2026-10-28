import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { seedDemo } from '@panel/database/seed-demo';
import { setupTestApp } from './helpers/test-app.js';

// El API Gateway de TicketU reenvía /api/organizador/* sin recortar el path. Las rutas de /api/v1 deben responder
// exactamente igual bajo /api/organizador/v1, para que los contratos sólo cambien el prefijo.
let ctx: Awaited<ReturnType<typeof setupTestApp>>;
beforeAll(async () => { ctx = await setupTestApp(); });
beforeEach(async () => { await ctx.reset(); await seedDemo(mongoose.connection.db!); });
afterAll(async () => { await ctx.teardown(); });

type Call = (base: string) => request.Test;
const cases: Array<[string, Call]> = [
  ['GET /organizador/eventos/proximos', (b) => request(ctx.app).get(`${b}/organizador/eventos/proximos`)],
  ['POST /organizador/eventos/buscar', (b) => request(ctx.app).post(`${b}/organizador/eventos/buscar`).send({ texto: 'feria' })],
  ['GET /organizador/eventos/{id}', (b) => request(ctx.app).get(`${b}/organizador/eventos/66f1a0000000000000000002`)],
  ['GET /panel/eventos-disponibles', (b) => request(ctx.app).get(`${b}/panel/eventos-disponibles`)],
  ['GET /panel/eventos/{id} (staff)', (b) => request(ctx.app).get(`${b}/panel/eventos/66f1a0000000000000000004`).set('Cookie', 'jwt=token-staff')],
  ['GET /panel/eventos/{id}/cambios-estado', (b) => request(ctx.app).get(`${b}/panel/eventos/66f1a0000000000000000004/cambios-estado`)],
  ['GET /panel/eventos/mios', (b) => request(ctx.app).get(`${b}/panel/eventos/mios`).set('Cookie', 'jwt=token-org-a')],
  ['GET /panel/eventos/mios/{id}', (b) => request(ctx.app).get(`${b}/panel/eventos/mios/66f1a0000000000000000001`).set('Cookie', 'jwt=token-org-a')],
  ['GET /panel/eventos/mios sin cookie → 401', (b) => request(ctx.app).get(`${b}/panel/eventos/mios`)],
];

describe('Prefijo del API Gateway (/api/organizador/v1)', () => {
  it.each(cases)('%s responde igual por /api/v1 y por /api/organizador/v1', async (_name, call) => {
    const directa = await call('/api/v1');
    const gateway = await call('/api/organizador/v1');
    expect(gateway.status).toBe(directa.status);
    expect(gateway.body).toEqual(directa.body);
  });

  it('las escrituras del organizador también funcionan por el prefijo del Gateway', async () => {
    const creado = await request(ctx.app).post('/api/organizador/v1/panel/eventos').set('Cookie', 'jwt=token-org-a')
      .send({ nombre_evento: 'Evento vía Gateway', descripcion: 'd', fecha_evento: '2030-01-10', hora_evento: '10:00', direccion_evento: 'Sala 1' });
    expect(creado.status).toBe(201);
    const leido = await request(ctx.app).get(`/api/v1/panel/eventos/mios/${creado.body.id_evento}`).set('Cookie', 'jwt=token-org-a');
    expect(leido.status).toBe(200);
    expect(leido.body.nombre_evento).toBe('Evento vía Gateway');
  });

  it('una ruta inexistente bajo el prefijo del Gateway responde el error estándar 404', async () => {
    const res = await request(ctx.app).get('/api/organizador/v1/no-existe');
    expect(res.status).toBe(404);
    expect(res.body.error.codigo).toBe('ROUTE_NOT_FOUND');
  });
});
