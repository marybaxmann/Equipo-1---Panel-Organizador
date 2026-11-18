import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { seedDemo } from '@panel/database/seed-demo';
import { anunciarEventos } from '../src/modules/mensajeria/anunciar-eventos.js';
import { createEventoNotifier } from '../src/modules/mensajeria/evento.notifier.js';
import { OutboxEventPublisher } from '../src/modules/mensajeria/outbox.publisher.js';
import { loadTopics } from '../src/modules/mensajeria/topics.js';
import { setupTestApp } from './helpers/test-app.js';

// Reporte de integración: el seed carga 7 eventos directo en MongoDB y ningún squad se enteraba por el broker
let ctx: Awaited<ReturnType<typeof setupTestApp>>;
beforeAll(async () => { ctx = await setupTestApp(); });
beforeEach(async () => { await ctx.reset(); await seedDemo(mongoose.connection.db!); });
afterAll(async () => { await ctx.teardown(); });

const notifier = () => createEventoNotifier(new OutboxEventPublisher(() => {}), loadTopics({}));
const salientes = () => mongoose.connection.db!.collection('mensajes_salientes').find().toArray();

describe('Anunciar por el broker los eventos del seed', () => {
  it('deja evento_creado para los 7 eventos y evento_publicado para los 3 PUBLICADO', async () => {
    expect(await salientes()).toHaveLength(0); // el seed por sí solo no anuncia nada
    expect(await anunciarEventos(notifier())).toBe(7);
    const msgs = await salientes();
    const creados = msgs.filter((m) => m.tipo === 'evento_creado');
    expect(creados).toHaveLength(7);
    expect(creados.every((m) => m.topico === 'panel.evento.entradas.v1' && m.estado === 'PENDIENTE')).toBe(true);
    const publicados = msgs.filter((m) => m.tipo === 'evento_publicado');
    // 3 PUBLICADO × 4 squads (Catálogo, Entradas, Check-in, Promociones)
    expect(publicados).toHaveLength(12);
    expect(new Set(publicados.map((m) => m.id_evento.toString()))).toEqual(
      new Set(['66f1a0000000000000000002', '66f1a0000000000000000003', '66f1b0000000000000000001']),
    );
  });

  it('un BORRADOR sólo llega a Entradas, nunca a Catálogo', async () => {
    await anunciarEventos(notifier());
    const delBorrador = (await salientes()).filter((m) => m.id_evento.toString() === '66f1a0000000000000000001');
    expect(delBorrador.map((m) => m.topico)).toEqual(['panel.evento.entradas.v1']);
    expect(delBorrador[0]?.payload).toMatchObject({ id_evento: '66f1a0000000000000000001', estado_gestion: 'BORRADOR' });
  });
});
