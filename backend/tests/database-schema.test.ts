import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, ObjectId, type Db } from 'mongodb';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createCollections } from '@panel/database/create-collections';

let server: MongoMemoryServer; let client: MongoClient; let db: Db;
beforeAll(async () => {
  server = await MongoMemoryServer.create();
  client = await MongoClient.connect(server.getUri());
  db = client.db('schema_test');
  await createCollections(db);
  await createCollections(db); // idempotente: la segunda corrida no debe fallar
});
afterAll(async () => { await client.close(); await server.stop(); });

const validEvento = () => ({
  _id: new ObjectId(), id_organizador: 'u-1', nombre_evento: 'Feria TITEC', descripcion: 'Muestra',
  fecha_evento: new Date('2030-01-10'), hora_evento: '10:00', hora_fin_evento: null, direccion_evento: 'Auditorio',
  categoria: null, imagen: null, cantidad_entradas: null, tipo_entrada: null, precio: null,
  estado_gestion: 'BORRADOR', fecha_creacion: new Date(), fecha_actualizacion: new Date(),
});

describe('database creation script', () => {
  it('accepts a valid evento', async () => {
    await expect(db.collection('eventos').insertOne(validEvento())).resolves.toBeTruthy();
  });
  it.each([
    ['missing nombre_evento', (e: any) => { delete e.nombre_evento; }],
    ['invalid estado_gestion', (e: any) => { e.estado_gestion = 'ACTIVO'; }],
    ['invalid hora_evento', (e: any) => { e.hora_evento = '25:00'; }],
    ['extra field (other squad data)', (e: any) => { e.stock = 10; }],
  ])('rejects evento with %s', async (_label, mutate) => {
    const doc = validEvento(); mutate(doc);
    await expect(db.collection('eventos').insertOne(doc)).rejects.toMatchObject({ code: 121 });
  });
  it('creates the expected indexes', async () => {
    const names = (await db.collection('eventos').indexes()).map((i) => i.name);
    expect(names).toEqual(expect.arrayContaining(['ix_eventos_organizador_fecha', 'ix_eventos_estado_fecha']));
  });
});
describe('demo seed', () => {
  it('loads 7 valid events (validator on) with 4 states for Org A and a coherent history', async () => {
    const { seedDemo, ORG_A } = await import('@panel/database/seed-demo');
    const fresh = client.db('seed_test'); // BD nueva: el seed debe crear colecciones CON validador
    await seedDemo(fresh);
    const infos = await fresh.listCollections().toArray();
    expect(infos.every((c) => 'options' in c && c.options?.validator)).toBe(true);
    expect(await fresh.collection('eventos').countDocuments()).toBe(7);
    expect(await fresh.collection('eventos').distinct('estado_gestion', { id_organizador: ORG_A })).toHaveLength(4);
    expect(await fresh.collection('cambios_estado_evento').countDocuments()).toBe(14);
  });
});
