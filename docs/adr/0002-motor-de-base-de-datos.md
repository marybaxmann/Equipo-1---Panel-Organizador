# ADR-0002 — Motor de base de datos: MongoDB con validadores `$jsonSchema`

- **Estado:** Propuesta (implementado en Sprint 1; pendiente de revisión del equipo)
- **Fecha:** 2026-09-29
- **Responsable del área:** Base de Datos (Christopher Okinggton)
- **Afecta a:** HU-01..HU-07 · rúbrica BD1–BD4

---

## 1. Contexto

El equipo acordó usar MongoDB (Mongoose) como base del Panel. La rúbrica de la Evaluación 1, en cambio, está escrita
en términos relacionales: pide un **diagrama relacional generado desde la base de datos**, un **script de creación**
con **diccionario de datos**, y evalúa **llaves primarias, llaves foráneas, tipos, nulabilidad y ausencia de ciclos** (BD4).

Si se usa MongoDB "sin esquema" (colecciones que se crean solas al primer insert), no hay de dónde generar un diagrama ni
un diccionario, y la base acepta cualquier documento, incluidos datos de otros squads (lo que castiga BD2).

## 2. Opciones consideradas

| Opción | A favor | En contra |
|---|---|---|
| **A. PostgreSQL** | Encaja 1:1 con la rúbrica (DDL, `COMMENT ON`, FK reales, herramientas de diagrama) | Contradice lo ya acordado por el equipo |
| **B. MongoDB sin esquema** | Cero fricción | No hay script de creación, ni diccionario, ni diagrama generable; BD3/BD4 quedarían sin evidencia |
| **C. MongoDB con validadores `$jsonSchema`** | Respeta el acuerdo del equipo; la base **rechaza** documentos inválidos; el esquema es una fuente de verdad legible por máquina | Las FK no son físicas: hay que declararlas por convención y validarlas en la aplicación |

## 3. Decisión

**Opción C.** El esquema vive en `database/schema/*.json` y se aplica con `database/scripts/create-collections.mjs`
(idempotente: `createCollection` o `collMod`).

| Aspecto | Cómo se resuelve |
|---|---|
| Script de creación | `npm run db:init` → validadores `$jsonSchema` (`validationLevel: strict`, `additionalProperties: false`) e índices |
| Diccionario de datos | La `description` de cada campo del `$jsonSchema` **es** el diccionario |
| Diagrama "generado desde la BD" | `npm run db:docs` lee `listCollections()` + `indexes()` de la base **en ejecución** y escribe `docs/bd/diagrama-er.md` (Mermaid) y `docs/bd/diccionario-datos.md` |
| PK | `_id` (ObjectId) |
| FK | Convención: la descripción empieza con `[FK coleccion._id]`. Hoy: `cambios_estado_evento.id_evento → eventos._id` |
| Referencias a otros squads | La descripción empieza con `[REF Squad.campo]`, sin relación en el diagrama: `id_organizador`, `id_usuario_responsable` → Auth |
| Tipos numéricos | `int` en la BD. Mongoose usa `Schema.Types.Int32`; si no, un `Number` de JS se guarda como `double` y el validador lo rechaza (error 121) |
| Colecciones creadas por Mongoose | Prohibido: `autoCreate: false` y `autoIndex: false` en los modelos. Sólo el script crea colecciones |

Modelo actual: `eventos` (1) ──< (N) `cambios_estado_evento`. Sin ciclos.

## 4. Lo que este ADR NO decide

| Tema | Dónde se decide |
|---|---|
| Colección `mensajes_salientes` para el broker | ADR-0003 (Sprint 3) |
| Eliminación física o lógica de eventos | HU-03, Sprint 3 |
| Transacciones multi-documento (requieren replica set) | Hoy se usa compensación: si falla el insert del cambio de estado, se borra el evento. Revisar si se despliega con replica set |

## 5. Consecuencias

**Positivas**
- La base valida por sí misma: un campo extra (p. ej. `stock`) o un estado inválido se rechazan con el error 121. Está cubierto por tests en `backend/tests/database-schema.test.ts`.
- Diccionario y diagrama siempre coinciden con la base real, porque se generan de ella.

**Negativas**
- La integridad referencial (`id_evento`) la garantiza la aplicación, no el motor.
- Cambiar el modelo exige tocar tres lugares: `database/schema/*.json`, el modelo Mongoose y el schema Zod. Los tests de contrato y de BD detectan si quedan desalineados.

**Cómo se trabaja un cambio de modelo**
1. Editar `database/schema/NN-coleccion.json` (incluida la `description`).
2. Reflejarlo en `backend/src/modules/eventos/*.model.ts` y, si llega por la API, en `evento.schemas.ts` y `docs/api/openapi.yaml`.
3. `npm run db:init && npm run db:seed && npm run db:docs && npm test`.
4. Commitear también `docs/bd/*` regenerado.

## 6. Cómo se revierte

Migrar a PostgreSQL costaría reescribir los modelos y el acceso a datos (`evento.service.ts`, `integration.service.ts`)
y traducir los `$jsonSchema` a DDL. La API y los tests de integración no cambiarían, porque los contratos no dependen del motor.
