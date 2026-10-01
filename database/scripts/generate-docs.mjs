import { MongoClient } from 'mongodb';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { loadDefinitions } from './create-collections.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Propósito de cada índice (Mongo no guarda descripciones de índices)
const INDEX_PURPOSE = {
  _id_: 'PK (índice automático de MongoDB)',
  ix_eventos_organizador_fecha: 'HU-05: listar los eventos de un organizador ordenados por fecha',
  ix_eventos_estado_fecha: 'Catálogo/Promociones: eventos PUBLICADO por fecha',
  ix_cambios_evento_fecha: 'Notificaciones: historial de estados de un evento, más reciente primero',
};

async function generateDocs() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/panel_organizador';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();
    // Orden estable (el de los archivos de schema) para que regenerar no produzca diffs espurios
    const order = loadDefinitions().map((d) => d.collection);
    const collections = (await db.listCollections().toArray())
      .filter((c) => order.includes(c.name))
      .sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
    
    let mermaid = '```mermaid\nerDiagram\n';
    let dict = '# Diccionario de Datos\n\n';
    let relations = '';

    for (const collInfo of collections) {
      if (collInfo.name.startsWith('system.')) continue;
      
      const collName = collInfo.name;
      const validator = collInfo.options?.validator?.$jsonSchema;
      if (!validator) continue;

      mermaid += `  ${collName} {\n`;
      dict += `## Colección: \`${collName}\`\n\n`;
      if (validator.description) {
        dict += `${validator.description}\n\n`;
      }

      dict += `| Campo | Tipo | Nulo | Clave | Restricciones | Descripción |\n`;
      dict += `|---|---|---|---|---|---|\n`;

      const properties = validator.properties || {};
      const required = validator.required || [];

      // Add _id field which is implicit in the schema usually
      if (!properties._id) {
        mermaid += `    objectId _id PK "NOT NULL"\n`;
        dict += `| _id | objectId | NO | PK | | Identificador único del documento |\n`;
      }

      for (const [field, def] of Object.entries(properties)) {
        if (field === '_id' && !properties._id) continue;
        
        const types = [].concat(def.bsonType ?? []);
        const baseType = types.filter((t) => t !== 'null').join('|') || 'string';
        const typeStr = def.enum ? `${baseType} (enum)` : baseType;
        const isNullable = types.includes('null') || (def.enum ?? []).includes(null);
        const isRequired = required.includes(field) && !isNullable;
        const nullLabel = isRequired ? 'NOT NULL' : 'NULL';
        const nullTable = isRequired ? 'NO' : 'SI';

        let keyLabel = '';
        let tableKeyLabel = '';
        let comment = '';
        
        const desc = def.description || '';
        
        if (field === '_id') {
          keyLabel = 'PK';
          tableKeyLabel = 'PK';
        } else if (desc.startsWith('[FK ')) {
          keyLabel = 'FK';
          tableKeyLabel = 'FK';
          // [FK eventos._id]
          const match = desc.match(/\[FK ([^\.]+)\._id\]/);
          if (match) {
            const target = match[1];
            relations += `  ${target} ||--o{ ${collName} : "${field}"\n`;
          }
        } else if (desc.startsWith('[REF ')) {
          comment = '"REF Auth (externo)"';
          tableKeyLabel = 'REF';
        }

        let restrictions = [];
        if (def.enum) restrictions.push(`enum: ${def.enum.filter((v) => v !== null).join(', ')}`);
        if (def.minLength !== undefined) restrictions.push(`minLength: ${def.minLength}`);
        if (def.maxLength !== undefined) restrictions.push(`maxLength: ${def.maxLength}`);
        if (def.minimum !== undefined) restrictions.push(`min: ${def.minimum}`);
        if (def.maximum !== undefined) restrictions.push(`max: ${def.maximum}`);
        if (def.pattern !== undefined) restrictions.push(`pattern: ${def.pattern}`);

        const safeType = baseType.replace(/[^a-zA-Z0-9_]/g, '');
        
        let mermaidLine = `    ${safeType} ${field}`;
        if (keyLabel) mermaidLine += ` ${keyLabel}`;
        let finalComment = nullLabel;
        if (comment) finalComment += `, REF Auth (externo)`;
        if (def.enum) finalComment += `, enum`;
        mermaidLine += ` "${finalComment}"`;
        mermaid += `${mermaidLine}\n`;

        dict += `| ${field} | ${typeStr} | ${nullTable} | ${tableKeyLabel} | ${restrictions.join('; ')} | ${desc.replace(/\|/g, '\\|')} |\n`;
      }
      mermaid += `  }\n`;

      // Indexes
      const indexes = await db.collection(collName).indexes();
      if (indexes.length > 0) {
        dict += `\n### Índices\n\n`;
        dict += `| Nombre | Campos | Propósito |\n`;
        dict += `|---|---|---|\n`;
        for (const idx of indexes) {
          const fields = Object.keys(idx.key).join(', ');
          const purpose = INDEX_PURPOSE[idx.name] ?? (idx.unique ? 'Único' : 'Búsqueda');
          dict += `| ${idx.name} | ${fields} | ${purpose} |\n`;
        }
      }
      dict += `\n---\n\n`;
    }

    mermaid += relations;
    mermaid += '```\n';

    const dateIso = new Date().toISOString();
    const erContent = `Generado automáticamente desde la base de datos \`${db.databaseName}\` el \`${dateIso}\` con \`database/scripts/generate-docs.mjs\`\n\n${mermaid}`;

    dict += `## Convenciones de nomenclatura\n`;
    dict += `- Colecciones en snake_case plural y en español.\n`;
    dict += `- Campos snake_case en español, iguales a los contratos.\n`;
    dict += `- \`id_<entidad>\` para identificadores.\n`;
    dict += `- \`fecha_*\` para fechas.\n`;
    dict += `- enums en MAYÚSCULAS.\n`;

    const docsDir = join(__dirname, '../../docs/bd');
    mkdirSync(docsDir, { recursive: true });

    writeFileSync(join(docsDir, 'diagrama-er.md'), erContent);
    writeFileSync(join(docsDir, 'diccionario-datos.md'), dict);
    
    console.log('Documentación generada correctamente en docs/bd/');
  } finally {
    await client.close();
  }
}

generateDocs().catch((error) => { console.error(error); process.exitCode = 1; });
