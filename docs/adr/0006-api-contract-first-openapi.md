# ADR-0006 — API contract-first con OpenAPI y pruebas de contrato

- **Estado:** Propuesta (implementado en Sprint 1; pendiente de revisión del equipo)
- **Fecha:** 2026-09-29
- **Responsables:** Backend (Joaquín) · Calidad (Etienne) para la colección Postman
- **Afecta a:** rúbrica BE1, BE3 y CA2 · todos los endpoints

---

## 1. Contexto

La rúbrica evalúa el Swagger de los servicios propios (BE1) y de los que consumen otros squads (BE3): **todas** las HU, no
sólo las terminadas. Otros cinco squads van a integrar contra Panel, así que el Swagger es un contrato, no un anexo.
En el Sprint 1 se encontró un schema del Swagger que rechazaba las respuestas reales de la API.

## 2. Opciones consideradas

| Opción | En contra |
|---|---|
| Generar el Swagger desde el código | No permite documentar lo que aún no existe (HU-02/03 planificadas) |
| Swagger escrito a mano sin verificación | Se desalinea del código en silencio (pasó en el Sprint 1) |
| **Swagger escrito a mano + tests que validan las respuestas reales contra él** | — |

## 3. Decisión

- **Fuente de verdad:** [`docs/api/openapi.yaml`](../api/openapi.yaml) (OpenAPI 3.1). El backend lo sirve en `/api-docs` (y `/` redirige ahí).
- **Servicio consumido:** [`docs/api/auth-consumido.yaml`](../api/auth-consumido.yaml).
- **Nombres de campo:** en español snake_case e **idénticos a los contratos** (`id_evento`, `nombre_evento`, `direccion_evento`, `estado_gestion`…). El código va en inglés; los datos, con los nombres del contrato.
- **Error único:** `{ error: { codigo, mensaje, detalles?: [{ campo, mensaje }] } }`, con `codigo` estable (`VALIDATION_ERROR`, `SESSION_INVALID`, `FORBIDDEN_ROLE`, `EVENT_NOT_OWNED`, `EVENT_NOT_FOUND`, `INVALID_STATE_TRANSITION`, `AUTH_ERROR`, `AUTH_UNAVAILABLE`, `INTERNAL_ERROR`).
- **Endpoints futuros:** se documentan con `x-sprint: N` y el tag "Planificado". Al implementarse, se quita `x-sprint` y se mueven al tag del organizador.
- **Tres capas de verificación:**

| Capa | Archivo | Qué atrapa |
|---|---|---|
| Lint | `npx @redocly/cli lint docs/api/openapi.yaml` (en CI) | YAML inválido, operaciones sin seguridad o sin errores |
| Contrato | `backend/tests/contrato-openapi.test.ts` (ajv) | Una respuesta real que no cumple su schema |
| Integración | `postman/` + Newman (`npm run test:integration`) | Casos por consumidor con resultado esperado |

## 4. Lo que este ADR NO decide

- El prefijo del API Gateway. Hoy conviven `/api/v1/panel/...` y `/api/v1/organizador/...`, porque los contratos de Entradas y de Catálogo ya confirmaron esas rutas.
- AsyncAPI para los mensajes del broker (ADR-0003).

## 5. Consecuencias

- **Todo cambio de endpoint = cambio en `openapi.yaml` en el mismo PR.** Si no, falla el test de contrato.
- Un squad consumidor puede proponer un cambio editando el YAML en un PR. Así queda registrado como acuerdo.
- `postman/panel-organizador.postman_collection.json` se genera con `node postman/generate-collection.mjs`: se edita el generador, no el JSON.

## 6. Cómo se revierte

Se puede pasar a Swagger generado desde el código (p. ej. zod-to-openapi). Los tests de contrato siguen sirviendo sin cambios.
