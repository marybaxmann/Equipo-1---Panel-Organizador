// Script de creación de la BD del Panel Organizador (equivalente al DDL en MongoDB).
// Crea cada colección con su validador $jsonSchema e índices. Es idempotente: si la colección ya existe, aplica collMod.
import { readdirSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { MongoClient } from 'mongodb';

const schemaDir = new URL('../schema/', import.meta.url);

export function loadDefinitions() {
  return readdirSync(schemaDir).filter((f) => f.endsWith('.json')).sort()
    .map((f) => JSON.parse(readFileSync(new URL(f, schemaDir), 'utf8')));
}

export async function createCollections(db) {
  const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name));
  for (const def of loadDefinitions()) {
    const options = { validator: { $jsonSchema: def.jsonSchema }, validationLevel: 'strict', validationAction: 'error' };
    if (existing.has(def.collection)) await db.command({ collMod: def.collection, ...options });
    else await db.createCollection(def.collection, options);
    for (const index of def.indexes) await db.collection(def.collection).createIndex(index.key, index.options);
    console.log(`[db:init] ${def.collection} ok`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const client = await MongoClient.connect(process.env.MONGO_URI ?? 'mongodb://localhost:27017/panel_organizador');
  try { await createCollections(client.db()); } finally { await client.close(); }
}
