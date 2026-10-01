// Poblamiento determinista para la demo y la colección Postman: IDs y fechas fijas, historia de estados coherente.
import { pathToFileURL } from 'node:url';
import { Int32, MongoClient, ObjectId } from 'mongodb';
import { createCollections } from './create-collections.mjs';

export const ORG_A = '3f1e2c1a-4b8d-4a2e-9c3f-7d1e2f9b2d4a';
export const ORG_B = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';

const EVENTS = [
  { id: '66f1a0000000000000000001', org: ORG_A, estado: 'BORRADOR', nombre: 'Taller de Node.js para principiantes', descripcion: 'Taller práctico de backend con Express y MongoDB.', fecha: '2026-11-12', hora: '18:00', fin: '20:00', dir: 'Laboratorio de Computación, Casa Central', cat: 'tecnologia', cant: 40, tipo: 'PAGADA', precio: 5000 },
  { id: '66f1a0000000000000000002', org: ORG_A, estado: 'PUBLICADO', nombre: 'Feria de Innovación TITEC', descripcion: 'Muestra anual de proyectos de integración tecnológica.', fecha: '2026-11-20', hora: '10:00', fin: '18:00', dir: 'Auditorio Principal', cat: 'academico', cant: 300, tipo: 'GRATUITA', precio: null },
  { id: '66f1a0000000000000000003', org: ORG_A, estado: 'PUBLICADO', nombre: 'Charla de Ciberseguridad', descripcion: 'Buenas prácticas de seguridad en aplicaciones web.', fecha: '2026-12-03', hora: '17:00', fin: '19:00', dir: 'Sala Multiuso, Facultad de Ingeniería', cat: 'tecnologia', cant: 120, tipo: 'GRATUITA', precio: null },
  { id: '66f1a0000000000000000004', org: ORG_A, estado: 'FINALIZADO', nombre: 'Hackathon UV 2026', descripcion: 'Competencia de desarrollo de 12 horas.', fecha: '2026-08-20', hora: '09:00', fin: '21:00', dir: 'Gimnasio Universitario', cat: 'tecnologia', cant: 80, tipo: 'GRATUITA', precio: null },
  { id: '66f1a0000000000000000005', org: ORG_A, estado: 'CANCELADO', nombre: 'Concierto Coro Universitario', descripcion: 'Presentación de fin de semestre del coro.', fecha: '2026-11-28', hora: '19:30', fin: '21:00', dir: 'Aula Magna', cat: 'cultura', cant: 200, tipo: 'PAGADA', precio: 3000 },
  { id: '66f1b0000000000000000001', org: ORG_B, estado: 'PUBLICADO', nombre: 'Torneo Interuniversitario de Ajedrez', descripcion: 'Torneo abierto por equipos.', fecha: '2026-11-15', hora: '09:00', fin: '18:00', dir: 'Biblioteca Central', cat: 'deportes', cant: 64, tipo: 'GRATUITA', precio: null },
  { id: '66f1b0000000000000000002', org: ORG_B, estado: 'BORRADOR', nombre: 'Seminario de Robótica', descripcion: 'Introducción a robótica educativa.', fecha: '2026-12-10', hora: '15:00', fin: '18:00', dir: 'Laboratorio de Electrónica', cat: 'tecnologia', cant: 50, tipo: 'PAGADA', precio: 8000 },
];

// Secuencia de estados que llevó a cada evento a su estado actual
const TRANSITIONS = {
  BORRADOR: ['BORRADOR'],
  PUBLICADO: ['BORRADOR', 'PUBLICADO'],
  FINALIZADO: ['BORRADOR', 'PUBLICADO', 'FINALIZADO'],
  CANCELADO: ['BORRADOR', 'PUBLICADO', 'CANCELADO'],
};
const CHANGE_DATES = ['2026-07-01T12:00:00.000Z', '2026-07-10T12:00:00.000Z', '2026-08-21T12:00:00.000Z'].map((d) => new Date(d));

function toDocument(e) {
  const steps = TRANSITIONS[e.estado];
  return {
    _id: new ObjectId(e.id), id_organizador: e.org, nombre_evento: e.nombre, descripcion: e.descripcion,
    fecha_evento: new Date(`${e.fecha}T00:00:00.000Z`), hora_evento: e.hora, hora_fin_evento: e.fin,
    direccion_evento: e.dir, categoria: e.cat, imagen: null,
    cantidad_entradas: new Int32(e.cant), tipo_entrada: e.tipo, precio: e.precio === null ? null : new Int32(e.precio),
    estado_gestion: e.estado, fecha_creacion: CHANGE_DATES[0], fecha_actualizacion: CHANGE_DATES[steps.length - 1],
  };
}

function toChanges(e) {
  return TRANSITIONS[e.estado].map((estado, i, steps) => ({
    id_evento: new ObjectId(e.id), estado_anterior: i === 0 ? null : steps[i - 1], nuevo_estado: estado,
    fecha_cambio: CHANGE_DATES[i], id_usuario_responsable: e.org,
  }));
}

export async function seedDemo(db) {
  await createCollections(db); // garantiza validadores aunque la BD sea nueva
  await db.collection('cambios_estado_evento').deleteMany({});
  await db.collection('eventos').deleteMany({});
  await db.collection('eventos').insertMany(EVENTS.map(toDocument));
  await db.collection('cambios_estado_evento').insertMany(EVENTS.flatMap(toChanges));
  console.log(`[db:seed] ${EVENTS.length} eventos cargados`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const client = await MongoClient.connect(process.env.MONGO_URI ?? 'mongodb://localhost:27017/panel_organizador');
  try { await seedDemo(client.db()); } catch (error) { console.error(error); process.exitCode = 1; } finally { await client.close(); }
}
