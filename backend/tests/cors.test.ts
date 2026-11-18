import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { FakeAuthClient } from './helpers/fake-auth.js';
import { FakeEntradasClient } from './helpers/fake-entradas.js';

// Reporte de integración: el Frontend Unificado (:3000) quedaba bloqueado porque sólo se permitía :5173
const app = createApp({
  authClient: new FakeAuthClient(), entradasClient: new FakeEntradasClient(), notifier: async () => {},
  corsOrigin: ['http://localhost:5173', 'http://localhost:3000'],
});

describe('CORS con varios orígenes', () => {
  it.each(['http://localhost:5173', 'http://localhost:3000'])('permite %s con credenciales (cookie jwt)', async (origin) => {
    const res = await request(app).options('/api/organizador/v1/panel/eventos/mios')
      .set('Origin', origin).set('Access-Control-Request-Method', 'GET');
    expect(res.headers['access-control-allow-origin']).toBe(origin);
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('no permite un origen que no está en la lista', async () => {
    const res = await request(app).get('/health').set('Origin', 'http://sitio-ajeno.test');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
