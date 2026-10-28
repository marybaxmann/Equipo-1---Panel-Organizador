import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';
import type { EventoDoc } from '../src/modules/eventos/evento.model.js';
import { InMemoryEventPublisher, type EventPublisher } from '../src/modules/mensajeria/event-publisher.js';
import { createEventoNotifier } from '../src/modules/mensajeria/evento.notifier.js';
import { loadTopics } from '../src/modules/mensajeria/topics.js';

const evento: EventoDoc = {
  _id: new mongoose.Types.ObjectId('66f1a0000000000000000002'), id_organizador: 'org-1', nombre_evento: 'Feria', descripcion: 'd',
  fecha_evento: new Date('2030-11-20T00:00:00.000Z'), hora_evento: '10:00', hora_fin_evento: '18:00', direccion_evento: 'Auditorio',
  categoria: null, imagen: null, cantidad_entradas: 300, tipo_entrada: 'GRATUITA', precio: null, estado_gestion: 'PUBLICADO',
  fecha_creacion: new Date('2030-01-01T00:00:00.000Z'), fecha_actualizacion: new Date('2030-01-02T00:00:00.000Z'),
};

describe('INT-02 Abstracción de publicación al broker', () => {
  it('CA: cambiar un tópico no requiere tocar código (se lee del entorno)', async () => {
    const publisher = new InMemoryEventPublisher();
    const notify = createEventoNotifier(publisher, loadTopics({ TOPIC_CATALOGO: 'catalogo.eventos.acordado' }));
    await notify({ kind: 'PUBLICADO', evento, idUsuario: 'org-1' });
    expect(publisher.published.map((p) => p.topic)).toContain('catalogo.eventos.acordado');
    expect(publisher.published.map((p) => p.topic)).toContain('panel.evento.entradas.v1'); // los demás quedan con su valor por defecto
  });

  it('cada mensaje lleva el sobre versionado (version, tipo, fecha_cambio, id_evento)', async () => {
    const publisher = new InMemoryEventPublisher();
    await createEventoNotifier(publisher, loadTopics({}))({ kind: 'CREADO', evento: { ...evento, estado_gestion: 'BORRADOR' }, idUsuario: 'org-1' });
    expect(publisher.published[0]!.message.envelope).toEqual({
      version: 1, tipo: 'evento_creado', fecha_cambio: '2030-01-02T00:00:00.000Z', id_evento: '66f1a0000000000000000002',
    });
  });

  it('un fallo de publicación se reintenta una vez y, si persiste, se registra sin interrumpir la operación', async () => {
    let calls = 0;
    const failing: EventPublisher = { async publish() { calls += 1; throw new Error('broker caído'); } };
    const logs: string[] = [];
    const notify = createEventoNotifier(failing, loadTopics({}), (line) => logs.push(line));
    await expect(notify({ kind: 'CREADO', evento, idUsuario: 'org-1' })).resolves.toBeUndefined();
    expect(calls).toBe(2);
    expect(logs[0]).toMatch(/FALLO panel\.evento\.entradas\.v1 .*broker caído/);
  });

  it('si el reintento funciona, no se registra error', async () => {
    let calls = 0;
    const flaky: EventPublisher = { async publish() { calls += 1; if (calls === 1) throw new Error('timeout'); } };
    const logs: string[] = [];
    await createEventoNotifier(flaky, loadTopics({}), (line) => logs.push(line))({ kind: 'CREADO', evento, idUsuario: 'org-1' });
    expect(logs).toEqual([]);
  });
});
