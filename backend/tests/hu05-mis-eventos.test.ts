import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { setupTestApp } from './helpers/test-app.js';

let ctx: Awaited<ReturnType<typeof setupTestApp>>;
beforeAll(async () => { ctx = await setupTestApp(); });
beforeEach(async () => { await ctx.reset(); });
afterAll(async () => { await ctx.teardown(); });

const base = { descripcion: 'd', hora_evento: '10:00', direccion_evento: 'Sala 1' };
async function create(token: string, nombre: string, fecha: string) {
  const res = await request(ctx.app).post('/api/v1/panel/eventos').set('Cookie', `jwt=${token}`).send({ ...base, nombre_evento: nombre, fecha_evento: fecha });
  return res.body.id_evento as string;
}
const list = (token: string, qs = '') => request(ctx.app).get(`/api/v1/panel/eventos/mios${qs}`).set('Cookie', `jwt=${token}`);

describe('HU-05 Ver mis eventos', () => {
  it('CA: muestra únicamente los eventos del organizador, ordenados por fecha', async () => {
    await create('token-org-a', 'A tarde', '2030-05-02');
    await create('token-org-a', 'A temprano', '2030-05-01');
    await create('token-org-b', 'Del otro', '2030-05-01');
    const res = await list('token-org-a');
    expect(res.status).toBe(200);
    expect(res.body.eventos.map((e: { nombre_evento: string }) => e.nombre_evento)).toEqual(['A temprano', 'A tarde']);
  });

  it('CA: cada evento trae nombre, fecha, ubicación y estado', async () => {
    await create('token-org-a', 'Uno', '2030-05-01');
    const [evento] = (await list('token-org-a')).body.eventos;
    expect(Object.keys(evento)).toEqual(expect.arrayContaining(['id_evento', 'nombre_evento', 'fecha_evento', 'direccion_evento', 'estado_gestion']));
  });

  it('filtra por estado_gestion y valida el filtro', async () => {
    await create('token-org-a', 'Uno', '2030-05-01');
    expect((await list('token-org-a', '?estado_gestion=PUBLICADO')).body.eventos).toEqual([]);
    expect((await list('token-org-a', '?estado_gestion=BORRADOR')).body.eventos).toHaveLength(1);
    expect((await list('token-org-a', '?estado_gestion=OTRO')).status).toBe(400);
  });

  it('devuelve lista vacía si no tiene eventos', async () => {
    expect((await list('token-org-a')).body).toEqual({ eventos: [] });
  });

  it('CA: permite seleccionar un evento propio (detalle)', async () => {
    const id = await create('token-org-a', 'Uno', '2030-05-01');
    const res = await request(ctx.app).get(`/api/v1/panel/eventos/mios/${id}`).set('Cookie', 'jwt=token-org-a');
    expect(res.status).toBe(200);
    expect(res.body.id_evento).toBe(id);
  });

  it('HU-06: validación de propiedad — 403 al pedir el evento de otro organizador', async () => {
    const id = await create('token-org-b', 'Ajeno', '2030-05-01');
    const res = await request(ctx.app).get(`/api/v1/panel/eventos/mios/${id}`).set('Cookie', 'jwt=token-org-a');
    expect(res.status).toBe(403);
    expect(res.body.error.codigo).toBe('EVENT_NOT_OWNED');
  });

  it('404 con id inexistente o mal formado', async () => {
    for (const id of ['66f000000000000000000000', 'no-es-id']) {
      const res = await request(ctx.app).get(`/api/v1/panel/eventos/mios/${id}`).set('Cookie', 'jwt=token-org-a');
      expect(res.status).toBe(404);
    }
  });
});
