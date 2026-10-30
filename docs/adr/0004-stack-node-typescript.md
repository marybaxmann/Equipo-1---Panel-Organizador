# ADR-0004 — Stack: Node.js + TypeScript + Express + Zod

- **Estado:** Propuesta (implementado en Sprint 1; pendiente de revisión del equipo). Reemplaza a la propuesta de [ADR-0001](0001-stack-del-panel-organizador.md), que fue rechazada
- **Fecha:** 2026-09-29
- **Responsable del área:** Backend (Joaquín Martínez)
- **Afecta a:** todo el backend

---

## 1. Contexto

ADR-0001 propuso Python + FastAPI y el equipo lo rechazó a favor de **Node.js (Express + Zod) + MongoDB**. Faltaba decidir
el lenguaje: el esqueleto inicial del repo ya venía en TypeScript, pero no compilaba.

## 2. Opciones consideradas

| Opción | A favor | En contra |
|---|---|---|
| **A. JavaScript plano** | Sin compilación | Los contratos con otros squads (nombres de campo en español, nulos, enteros) sólo se verifican en ejecución |
| **B. TypeScript** | Los tipos atrapan desalineaciones entre el Zod, el modelo y el contrato antes de ejecutar | Un paso de build y sintaxis de tipos que hay que aprender |

## 3. Decisión

**Opción B, sólo en el backend.** TypeScript compila a JavaScript y **Node.js es el runtime**: en producción se ejecuta
`node dist/server.js`, que es JavaScript puro.

| Capa | Elección |
|---|---|
| Runtime | Node.js 26 |
| Lenguaje | TypeScript 7 (`strict`, `exactOptionalPropertyTypes`, ESM con `module: nodenext`) |
| HTTP | Express 5 (propaga los errores async al error handler sin wrappers) |
| Validación | Zod 4, con mensajes en español (`z.locales.es()`) |
| Persistencia | Mongoose 9 + driver `mongodb` 7 (**una sola versión del driver** en todo el monorepo; mezclar la 6 con la 7 rompe con `BSONVersionError`) |
| Tests | Vitest + Supertest + `mongodb-memory-server` |
| Frontend | React 19 + Vite en **JavaScript** (ver ADR-0008) |
| Scripts de BD y mock de Auth | JavaScript plano (`.mjs`), ejecutados directo con Node |

## 4. Lo que este ADR NO decide

- El destino de despliegue (TASK-08).
- La tecnología del broker (ADR-0003).

## 5. Consecuencias

- `npm run typecheck -w backend` es obligatorio antes de cada PR, y el CI lo corre.
- Imports relativos **con extensión `.js`** (`import { x } from './y.js'`), por ESM + `nodenext`.
- `any` y `as any` no se aceptan en revisión: en el Sprint 1 un `as any` escondió dos bugs reales de tipos.

## 6. Cómo se revierte

`tsc` genera el JavaScript equivalente en `dist/`, así que se podría seguir desde ese JS. Se pierde el chequeo de tipos.
