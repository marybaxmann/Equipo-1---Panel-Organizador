import { readFileSync } from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import mongoose from 'mongoose';
import request from 'supertest';
import { parse } from 'yaml';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { seedDemo } from '@panel/database/seed-demo';
import { setupTestApp } from './helpers/test-app.js';

// Prueba de contrato: cada respuesta real debe cumplir el schema declarado en docs/api/openapi.yaml.
// Si alguien cambia el código o el spec sin actualizar el otro, este test falla.
const spec = parse(readFileSync(new URL('../../docs/api/openapi.yaml', import.meta.url), 'utf8'));
const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);
ajv.addSchema({ $id: 'openapi', components: spec.components });
const schemaOf = (name: string) => ajv.compile({ $ref: `openapi#/components/schemas/${name}` });
const arrayOf = (name: string) => ajv.compile({ type: 'array', items: { $ref: `openapi#/components/schemas/${name}` } });

let ctx: Awaited<ReturnType<typeof setupTestApp>>;
beforeAll(async () => { ctx = await setupTestApp(); });
beforeEach(async () => { await ctx.reset(); await seedDemo(mongoose.connection.db!); });
afterAll(async () => { await ctx.teardown(); });

const cases: Array<[string, () => request.Test, ReturnType<typeof schemaOf>]> = [
  ['POST /panel/eventos → Evento', () => request(ctx.app).post('/api/v1/panel/eventos').set('Cookie', 'jwt=token-org-a')
    .send({ nombre_evento: 'Evento contrato', descripcion: 'd', fecha_evento: '2030-01-10', hora_evento: '10:00', direccion_evento: 'Sala 1' }), schemaOf('Evento')],
  ['GET /panel/eventos/mios → ListaMisEventos', () => request(ctx.app).get('/api/v1/panel/eventos/mios').set('Cookie', 'jwt=token-org-a'), schemaOf('ListaMisEventos')],
  ['GET /panel/eventos/mios/{id} → Evento', () => request(ctx.app).get('/api/v1/panel/eventos/mios/66f1a0000000000000000001').set('Cookie', 'jwt=token-org-a'), schemaOf('Evento')],
  ['POST /panel/eventos/mios/{id}/publicar → Evento', () => request(ctx.app).post('/api/v1/panel/eventos/mios/66f1a0000000000000000001/publicar').set('Cookie', 'jwt=token-org-a'), schemaOf('Evento')],
  ['409 → Error', () => request(ctx.app).post('/api/v1/panel/eventos/mios/66f1a0000000000000000002/publicar').set('Cookie', 'jwt=token-org-a'), schemaOf('Error')],
  ['GET /organizador/eventos/proximos → EventoCatalogo[]', () => request(ctx.app).get('/api/v1/organizador/eventos/proximos'), arrayOf('EventoCatalogo')],
  ['POST /organizador/eventos/buscar → EventoCatalogo[]', () => request(ctx.app).post('/api/v1/organizador/eventos/buscar').send({ texto: 'feria' }), arrayOf('EventoCatalogo')],
  ['GET /organizador/eventos/{id} → EventoCatalogo', () => request(ctx.app).get('/api/v1/organizador/eventos/66f1a0000000000000000002'), schemaOf('EventoCatalogo')],
  ['GET /panel/eventos/{id} → EventoIntegracion', () => request(ctx.app).get('/api/v1/panel/eventos/66f1a0000000000000000004').set('Cookie', 'jwt=token-staff'), schemaOf('EventoIntegracion')],
  ['GET /panel/eventos/{id}/cambios-estado → CambioEstado[]', () => request(ctx.app).get('/api/v1/panel/eventos/66f1a0000000000000000004/cambios-estado'), arrayOf('CambioEstado')],
  ['GET /panel/eventos-disponibles → EventoPromocion[]', () => request(ctx.app).get('/api/v1/panel/eventos-disponibles'), arrayOf('EventoPromocion')],
  ['400 → Error', () => request(ctx.app).post('/api/v1/panel/eventos').set('Cookie', 'jwt=token-org-a').send({}), schemaOf('Error')],
  ['401 → Error', () => request(ctx.app).get('/api/v1/panel/eventos/mios'), schemaOf('Error')],
  ['403 → Error', () => request(ctx.app).get('/api/v1/panel/eventos/mios/66f1b0000000000000000001').set('Cookie', 'jwt=token-org-a'), schemaOf('Error')],
  ['404 → Error', () => request(ctx.app).get('/api/v1/panel/eventos/no-es-id'), schemaOf('Error')],
];

describe('Contrato OpenAPI (docs/api/openapi.yaml)', () => {
  it.each(cases)('%s', async (_name, call, validate) => {
    const res = await call();
    const valid = validate(res.body);
    expect(validate.errors ?? [], JSON.stringify(res.body).slice(0, 300)).toEqual([]);
    expect(valid).toBe(true);
  });
});
