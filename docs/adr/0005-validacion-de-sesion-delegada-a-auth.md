# ADR-0005 — Validación de sesión delegada a Auth (fail-secure)

- **Estado:** Propuesta (implementado en Sprint 1; pendiente de revisión del equipo)
- **Fecha:** 2026-09-29
- **Responsable del área:** Backend (Joaquín) · Integración (Etienne) para confirmar los pendientes con Auth
- **Afecta a:** HU-06 y todas las operaciones del organizador · rúbrica BE2 · [CONTRATO_PANEL_AUTH.md](../CONTRATO_PANEL_AUTH.md)

---

## 1. Contexto

El contrato Auth v1.1 establece que Panel **no decodifica ni valida el JWT**: reenvía la cookie `jwt` a
`GET /internal/validar-sesion` y usa `usuario.id_usuario` y `usuario.rol` de la respuesta. Panel propuso SLA < 300 ms,
un timeout de 1 s y un reintento, pero Auth todavía no los confirmó. Tampoco hay ambiente de integración de Auth disponible.

## 2. Opciones consideradas

| Opción | En contra |
|---|---|
| Decodificar el JWT localmente | Viola el contrato y duplica la responsabilidad de Auth |
| Llamar a Auth sin timeout | Si Auth se cuelga, se cuelga Panel |
| **Llamar a Auth con timeout, 1 reintento acotado y fail-secure** | — |

## 3. Decisión

`backend/src/modules/auth/auth.client.ts` (servicio consumido, evidencia de BE2) y `require-organizer.ts`:

| Situación | Reintento | Respuesta de Panel |
|---|---|---|
| Sin cookie `jwt` | — (no llama a Auth) | 401 `SESSION_INVALID` |
| Auth 200 `valido:true`, rol `organizador` | — | continúa; `res.locals.user = { id_usuario, rol }` |
| Auth 200 con otro rol | — | 403 `FORBIDDEN_ROLE` |
| Auth 401 o `valido:false` | no | 401 `SESSION_INVALID` → el front vuelve al login |
| Auth 403 | no | 403 `ACCESS_DENIED` |
| Auth 500 o body inesperado | no | 502 `AUTH_ERROR` |
| Timeout (`AUTH_TIMEOUT_MS`, 1000 ms), error de red o 503 | **1 vez** | si vuelve a fallar: **503 `AUTH_UNAVAILABLE`** y la operación **no se ejecuta** |

- La cookie se reenvía **cruda**, como `Cookie: jwt=<valor>`.
- La identidad **nunca** sale del body ni del frontend. El body de creación rechaza `id_organizador` y `estado_gestion` (Zod estricto).
- Además del rol, se valida **propiedad**: un evento ajeno da 403 `EVENT_NOT_OWNED`. Se eligió 403 y no 404 para que la validación de propiedad sea demostrable. El costo es que revela que el id existe.

**Para desarrollo:** `tools/mock-auth/server.mjs` implementa el contrato con los tokens `token-org-a`, `token-org-b`,
`token-asistente`, `token-staff` (rol `staff`, para Check-in; ADR-0011), `token-expirado` y `token-lento` (este último responde en 3 s, para demostrar el 503).

## 4. Lo que este ADR NO decide

- La URL real de Auth en integración (`AUTH_SERVICE_URL`). La consigue Etienne (INT-01).
- Si el organizador ve su nombre en el header: hoy Panel sólo toma `id_usuario` y `rol`.

## 5. Consecuencias

- Tests: `backend/tests/auth.client.test.ts` (10 casos contra un servidor HTTP real) y `require-organizer.test.ts`.
- En el peor caso, una operación tarda ~2 s antes del 503 (timeout + 1 reintento).
- Para pasar a Auth real sólo hay que cambiar `AUTH_SERVICE_URL`; el mock deja de usarse.

## 6. Cómo se revierte

Si Auth publica otro mecanismo (p. ej. introspección por header), el cambio queda aislado en `auth.client.ts`.
La interfaz `AuthClient.validateSession(jwt)` no cambia.
