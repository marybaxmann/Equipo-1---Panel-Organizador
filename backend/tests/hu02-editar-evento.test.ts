import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { seedDemo } from '@panel/database/seed-demo';
import { ORG_A } from './helpers/fake-auth.js';
import { setupTestApp } from './helpers/test-app.js';

// Fixtures del seed (Organizadora A salvo B_BORRADOR)
const A_BORRADOR = '66f1a0000000000000000001'; // PAGADA, precio 5000, hora_fin 20:00
const A_PUBLICADO = '66f1a0000000000000000002'; // Feria de Innovación, GRATUITA, 300 entradas
const A_FINALIZADO = '66f1a0000000000000000004';
const A_CANCELADO = '66f1a0000000000000000005';
const B_BORRADOR = '66f1b0000000000000000002';

let ctx: Awaited<ReturnType<typeof setupTestApp>>;
beforeAll(async () => { ctx = await setupTestApp(); });
beforeEach(async () => { await ctx.reset(); await seedDemo(mongoose.connection.db!); });
afterAll(async () => { await ctx.teardown(); });

const editar = (id: string, body: object, token = 'token-org-a') =>
  request(ctx.app).patch(`/api/v1/panel/eventos/mios/${id}`).set('Cookie', `jwt=${token}`).send(body);
const mensajes = (id: string) => mongoose.connection.db!.collection('mensajes_salientes')
  .find({ id_evento: new mongoose.Types.ObjectId(id) }).toArray();
const topicos = async (id: string) => (await mensajes(id)).map((m) => m.topico).sort();
const campos = (res: request.Response) => res.body.error.detalles.map((d: { campo: string }) => d.campo);

describe('HU-02 Editar un evento', () => {
  it('CA: el dueño edita un BORRADOR, el cambio queda guardado y se informa con 200', async () => {
    const res = await editar(A_BORRADOR, { nombre_evento: 'Taller de Node.js avanzado', hora_evento: '19:00' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id_evento: A_BORRADOR, nombre_evento: 'Taller de Node.js avanzado', hora_evento: '19:00', estado_gestion: 'BORRADOR' });
    expect(res.body.fecha_actualizacion > res.body.fecha_creacion).toBe(true);
    const guardado = await request(ctx.app).get(`/api/v1/panel/eventos/mios/${A_BORRADOR}`).set('Cookie', 'jwt=token-org-a');
    expect(guardado.body.nombre_evento).toBe('Taller de Node.js avanzado');
  });

  it('CA: permite modificar fecha, hora de inicio y hora de término', async () => {
    const res = await editar(A_BORRADOR, { fecha_evento: '2030-03-01', hora_evento: '22:00', hora_fin_evento: '01:00' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ fecha_evento: '2030-03-01', hora_evento: '22:00', hora_fin_evento: '01:00' });
  });

  it('editar no cambia el estado ni agrega filas al historial de estados', async () => {
    const antes = await mongoose.connection.db!.collection('cambios_estado_evento').countDocuments();
    await editar(A_PUBLICADO, { descripcion: 'Nueva descripción' });
    expect(await mongoose.connection.db!.collection('cambios_estado_evento').countDocuments()).toBe(antes);
  });

  it('un BORRADOR editado sólo se avisa a Entradas', async () => {
    await editar(A_BORRADOR, { cantidad_entradas: 60 });
    const [m] = await mensajes(A_BORRADOR);
    expect(await topicos(A_BORRADOR)).toEqual(['panel.evento.entradas.v1']);
    expect(m).toMatchObject({ tipo: 'evento_actualizado', payload: { cantidad_entradas: 60, estado_gestion: 'BORRADOR' } });
  });

  it('CA: un PUBLICADO editado se comunica a Catálogo y Entradas; Check-in sólo si cambian nombre, dirección o fecha/hora', async () => {
    await editar(A_PUBLICADO, { descripcion: 'Sólo cambia la descripción' });
    expect(await topicos(A_PUBLICADO)).toEqual(['panel.evento.catalogo.v1', 'panel.evento.entradas.v1']);
    await mongoose.connection.db!.collection('mensajes_salientes').deleteMany({});

    await editar(A_PUBLICADO, { direccion_evento: 'Aula Magna' });
    expect(await topicos(A_PUBLICADO)).toEqual(['panel.evento.catalogo.v1', 'panel.evento.checkin.v1', 'panel.evento.entradas.v1']);
    const checkin = (await mensajes(A_PUBLICADO)).find((m) => m.topico === 'panel.evento.checkin.v1')!;
    expect(checkin.payload).toMatchObject({ tipo_cambio: 'ACTUALIZADO', direccion_evento: 'Aula Magna', nombre_evento: 'Feria de Innovación TITEC' });
  });

  it('CA: una reprogramación de un PUBLICADO también avisa a Notificaciones (evento_reprogramado)', async () => {
    await editar(A_PUBLICADO, { fecha_evento: '2030-11-21', hora_evento: '11:30' });
    expect(await topicos(A_PUBLICADO)).toEqual([
      'panel.evento.catalogo.v1', 'panel.evento.checkin.v1', 'panel.evento.entradas.v1', 'panel.evento.notificaciones.v1',
    ]);
    const noti = (await mensajes(A_PUBLICADO)).find((m) => m.topico === 'panel.evento.notificaciones.v1')!;
    // Contrato Notificaciones §2.4: fecha_cambio y hora_cambio son la nueva fecha y hora del evento
    expect(noti).toMatchObject({
      tipo: 'evento_reprogramado',
      payload: { id_evento: A_PUBLICADO, id_usuario: ORG_A.id_usuario, nuevo_estado: 'PUBLICADO', fecha_cambio: '2030-11-21', hora_cambio: '11:30:00' },
    });
  });

  it('enviar los mismos valores no genera mensajes', async () => {
    const res = await editar(A_PUBLICADO, { nombre_evento: 'Feria de Innovación TITEC' });
    expect(res.status).toBe(200);
    expect(await mensajes(A_PUBLICADO)).toHaveLength(0);
  });

  it('Catálogo ve el cambio de un evento publicado en sus consultas REST', async () => {
    await editar(A_PUBLICADO, { hora_evento: '12:00' });
    const catalogo = await request(ctx.app).get(`/api/v1/organizador/eventos/${A_PUBLICADO}`);
    expect(catalogo.body.hora_evento).toBe('12:00');
  });

  it('CA: sólo BORRADOR o PUBLICADO son editables (FINALIZADO y CANCELADO → 409)', async () => {
    for (const id of [A_FINALIZADO, A_CANCELADO]) {
      const res = await editar(id, { descripcion: 'x' });
      expect(res.status).toBe(409);
      expect(res.body.error.codigo).toBe('EVENT_NOT_EDITABLE');
    }
  });

  it('CA: valida la información (cuerpo vacío, campo desconocido, formato inválido, null en un obligatorio)', async () => {
    expect((await editar(A_BORRADOR, {})).status).toBe(400);
    const intrusos = await editar(A_BORRADOR, { estado_gestion: 'PUBLICADO', id_organizador: 'otro' });
    expect(intrusos.status).toBe(400);
    const formato = await editar(A_BORRADOR, { hora_evento: '25:00', fecha_evento: '15-10-2030', nombre_evento: null });
    expect(formato.status).toBe(400);
    expect(campos(formato).sort()).toEqual(['fecha_evento', 'hora_evento', 'nombre_evento']);
  });

  it('CA: reglas cruzadas sobre el evento como quedaría (fecha pasada, precio ↔ tipo de entrada)', async () => {
    expect(campos(await editar(A_BORRADOR, { fecha_evento: '2020-01-01' }))).toEqual(['fecha_evento']);
    // A_BORRADOR es PAGADA con precio: pasarlo a GRATUITA sin quitar el precio no es coherente
    expect(campos(await editar(A_BORRADOR, { tipo_entrada: 'GRATUITA' }))).toEqual(['precio']);
    expect((await editar(A_BORRADOR, { tipo_entrada: 'GRATUITA', precio: null })).status).toBe(200);
    // A_PUBLICADO es GRATUITA: pasarlo a PAGADA exige precio
    expect(campos(await editar(A_PUBLICADO, { tipo_entrada: 'PAGADA' }))).toEqual(['precio']);
  });

  it('un PUBLICADO no puede quedar sin un dato obligatorio para publicar', async () => {
    const res = await editar(A_PUBLICADO, { hora_fin_evento: null, cantidad_entradas: null });
    expect(res.status).toBe(400);
    expect(campos(res)).toEqual(['hora_fin_evento', 'cantidad_entradas']);
    expect(await mensajes(A_PUBLICADO)).toHaveLength(0);
  });

  it('un BORRADOR sí puede quedar sin datos opcionales', async () => {
    const res = await editar(A_BORRADOR, { hora_fin_evento: null });
    expect(res.status).toBe(200);
    expect(res.body.hora_fin_evento).toBeNull();
  });

  it('HU-06: sólo el dueño (403), evento inexistente (404), id mal formado (400)', async () => {
    const ajeno = await editar(B_BORRADOR, { descripcion: 'x' });
    expect(ajeno.status).toBe(403);
    expect(ajeno.body.error.codigo).toBe('EVENT_NOT_OWNED');
    expect((await editar('66f000000000000000000000', { descripcion: 'x' })).status).toBe(404);
    expect((await editar('no-es-id', { descripcion: 'x' })).status).toBe(400);
  });

  it('HU-06: sin sesión 401 · rol asistente 403 · Auth caído 503, y no se modifica nada', async () => {
    expect((await request(ctx.app).patch(`/api/v1/panel/eventos/mios/${A_BORRADOR}`).send({ descripcion: 'x' })).status).toBe(401);
    expect((await editar(A_BORRADOR, { descripcion: 'x' }, 'token-asistente')).status).toBe(403);
    ctx.auth.unavailable = true;
    expect((await editar(A_BORRADOR, { descripcion: 'x' })).status).toBe(503);
    const evento = await mongoose.connection.db!.collection('eventos').findOne({ _id: new mongoose.Types.ObjectId(A_BORRADOR) });
    expect(evento!.descripcion).not.toBe('x');
  });
});
