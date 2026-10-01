# ADR-0010 — Monorepo con workspaces y flujo de calidad

- **Estado:** Propuesta (implementado en Sprint 1; pendiente de revisión del equipo)
- **Fecha:** 2026-09-29
- **Responsables:** todo el equipo · Calidad (Etienne, Christopher) para su mantenimiento
- **Afecta a:** estructura del repo · rúbrica CA1/CA2 · CI

---

## 1. Contexto

La rúbrica exige que el repositorio contenga **backend, frontend y scripts de base de datos**, que haya evidencia de
**ejecución** de las pruebas y que el repo se pueda inspeccionar. Cinco personas van a trabajar en paralelo, cada una en su área.

## 2. Decisión

**Un repositorio, con npm workspaces y un solo `package-lock.json` en la raíz.**

```
backend/        API (TypeScript)            → ADR-0004, 0005, 0006, 0007, 0009
frontend/       SPA (React, JavaScript)     → ADR-0008
database/       schema $jsonSchema + scripts (crear, seed, generar docs) → ADR-0002
tools/mock-auth Auth simulado para desarrollo → ADR-0005
postman/        colección de integración (generada por script)
docs/           contratos, ADR, Swagger, BD generada, evidencias, plan
```

| Práctica | Cómo |
|---|---|
| Entorno reproducible | `docker compose` (MongoDB 8 + mock de Auth) · README con 6 comandos |
| Datos de demo y de prueba | `npm run db:seed`: **7 eventos con IDs fijos** (`66f1a…01..05` de la Organizadora A en los 4 estados; `66f1b…01..02` del Organizador B). Tests y Postman dependen de esos IDs: **no cambiarlos** |
| Documentos generados | `docs/bd/*` sale de `npm run db:docs`; la colección Postman, de `postman/generate-collection.mjs`. **No se editan a mano** |
| Tests | `npm test` (Vitest: unitarios, funcionales por HU, BD, integración y contrato) · evidencia en `docs/evidencias/` |
| CI | `.github/workflows/ci.yml`: typecheck, tests, lint del Swagger y build del frontend en cada push y PR |
| Commits | Conventional Commits en inglés; PR revisado por otro integrante; no se mergea con el CI en rojo |

## 3. Lo que este ADR NO decide

- La estrategia de ramas más allá de "PR a `main`" (se puede adoptar ramas por HU: `feat/hu-02-editar`).
- El despliegue (TASK-08).

## 4. Consecuencias

- Comandos desde la raíz: `npm run dev:api`, `npm run dev:web`, `npm test`, `npm run db:*`, `npm run test:integration`.
- Instalar una dependencia: `npm install <paquete> -w backend` (o `-w frontend`), **nunca** con `npm install` dentro de la carpeta.
- Una sola versión de cada librería compartida (p. ej. el driver `mongodb` 7, ver ADR-0004).

## 5. Cómo se revierte

Cada workspace es un proyecto npm autónomo: se puede separar en repos distintos copiando la carpeta y su `package.json`.
