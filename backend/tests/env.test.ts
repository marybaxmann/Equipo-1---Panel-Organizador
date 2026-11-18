import { describe, expect, it } from 'vitest';
import { loadEnv } from '../src/config/env.js';

const base = { MONGO_URI: 'mongodb://localhost:27017/panel', AUTH_SERVICE_URL: 'http://auth-service:10000' };

describe('Configuración por variables de entorno', () => {
  it('una variable opcional vacía (como la pasa docker compose con ${VAR:-}) cuenta como no definida', () => {
    const env = loadEnv({ ...base, AUTH_INTERNAL_API_KEY: '', ENTRADAS_SERVICE_URL: '', BROKER_URL: '' });
    expect(env.AUTH_INTERNAL_API_KEY).toBeUndefined();
    expect(env.ENTRADAS_SERVICE_URL).toBeUndefined();
    expect(env.BROKER_URL).toBeUndefined();
  });

  it('lee la clave de Auth y la lista de tópicos con sobre en el cuerpo', () => {
    const env = loadEnv({ ...base, AUTH_INTERNAL_API_KEY: 'clave', BROKER_TOPICOS_CON_SOBRE: 'panel.evento.entradas.v1, otro.v1' });
    expect(env.AUTH_INTERNAL_API_KEY).toBe('clave');
    expect(env.BROKER_TOPICOS_CON_SOBRE).toEqual(['panel.evento.entradas.v1', 'otro.v1']);
  });

  it('CORS_ORIGIN acepta varios orígenes separados por coma y por defecto permite el frontend propio y el Unificado', () => {
    expect(loadEnv(base).CORS_ORIGIN).toEqual(['http://localhost:5173', 'http://localhost:3000']);
    expect(loadEnv({ ...base, CORS_ORIGIN: 'http://localhost:3000, http://frontend:3000' }).CORS_ORIGIN)
      .toEqual(['http://localhost:3000', 'http://frontend:3000']);
  });

  it('sin una variable obligatoria el servicio no arranca', () => {
    expect(() => loadEnv({ MONGO_URI: 'mongodb://x' })).toThrow();
  });
});
