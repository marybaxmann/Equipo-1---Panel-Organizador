# ADR-0011 — Alineación con el contrato de Check-in v1.2

- **Estado:** Propuesta (implementado; pendiente de revisión del equipo). **Reemplaza en parte a [ADR-0007](0007-integracion-rest-y-datos-de-otros-squads.md)**: el endpoint `/checkin` y el nombre `hora_termino`
- **Fecha:** 2026-09-30
- **Responsables:** Integración (Etienne) · Backend (Joaquín) · Dueña del contrato: Mariajosé
- **Afecta a:** [`CONTRATO_PANEL_CHECKIN.md`](../CONTRATO_PANEL_CHECKIN.md) v1.2 · issues INT-04 e INT-07 · HU-01, HU-04

---

## 1. Contexto

El contrato de Check-in pasó de la v1.1 a la **v1.2**. Su sección 2 (acuerdos confirmados) dice que la consulta REST
**valida la sesión con Auth y admite los roles `staff` y `organizador`** (§2.4, confirmado por Auth el 29/09). La sección 3
(propuestas de Panel) pide además:
- el campo **`hora_fin_evento`**;
- que se acepten **eventos que terminan después de medianoche**;
- que Check-in use **el mismo `GET /api/v1/panel/eventos/{id_evento}` que Entradas** (§3.4).

La implementación del Sprint 1 estaba hecha contra la v1.1: tenía un endpoint propio `/checkin` sin sesión, llamaba al campo
`hora_termino` y rechazaba eventos con `hora_termino <= hora_evento`.

## 2. Decisión

| Tema | Antes (v1.1) | Ahora (v1.2) |
|---|---|---|
| Nombre del campo | `hora_termino` | **`hora_fin_evento`**, en la BD, la API, el Swagger, el seed, el front y Postman |
| Eventos que cruzan medianoche | Rechazados (400) | **Válidos**: si `hora_fin_evento <= hora_evento`, termina al día siguiente (America/Santiago) |
| Consulta de Check-in | `GET /panel/eventos/{id}/checkin`, sin sesión | **Eliminado**. Check-in usa `GET /api/v1/panel/eventos/{id}` |
| `GET /api/v1/panel/eventos/{id}` | Sin sesión, cualquier estado, campos de Entradas | **Con sesión validada con Auth**, roles `staff` u `organizador` (401/403/503); sólo `PUBLICADO`, `FINALIZADO` o `CANCELADO` (un BORRADOR → 404); devuelve la **unión** de campos de Entradas y Check-in (`EventoIntegracion` en el Swagger) |
| Publicar (HU-04) | Exigía nombre, fecha y ubicación | Exige además **`hora_fin_evento`**: Check-in la necesita para todo evento publicado |
| Formulario de creación | Sin hora de término | Campo opcional "Hora de término", con el aviso "Obligatoria para publicar" |

Implementación:
- `requireRoles(authClient, roles, mensaje)` en `backend/src/modules/auth/require-organizer.ts` (`requireOrganizer` pasa a ser un caso particular);
- `toEventoIntegracion` en `evento.mapper.ts`;
- el mock de Auth y el `FakeAuthClient` de los tests suman **`token-staff`**, con rol `staff`.

## 3. Lo que este ADR NO decide

| Tema | Estado | Quién |
|---|---|---|
| **Autenticación de Entradas** en el endpoint compartido | Su contrato (v1.2 §2.3) **no define** autenticación. Desde ahora necesita enviar una sesión `staff` u `organizador`, o acordar otro mecanismo (p. ej. un rol de servicio) | Etienne con Entradas (INT-04) |
| Formato de error `{ codigo_http, error, mensaje }` (Check-in §3.4) | Es una **propuesta pendiente** del contrato. Panel mantiene su formato único `{ error: { codigo, mensaje, detalles } }` (ADR-0006) hasta que se confirme. Si se acepta, se cambia en **todas** las rutas, no sólo en ésta | Etienne con Check-in y Auth |
| Mensaje por broker `panel.evento.checkin.v1` con `tipo_cambio` | Queda con HU-07 (ADR-0003) | Sprint 3 |
| `cantidad_entradas` como aforo | Check-in debe decir si lo necesita (§3.5). Hoy ya viaja en la respuesta compartida | Check-in |

## 4. Consecuencias

- **Cambio incompatible para quien ya consumía** `/checkin`, `hora_termino` o el GET sin sesión. En el Sprint 1 no había consumidores reales, sólo el mock y Postman.
- Tests: `integraciones.test.ts` cubre el GET compartido (staff, organizador, BORRADOR→404, 401, 403, 503) y `hu01` y `hu04` cubren el caso de medianoche y la hora de término obligatoria para publicar.
- Las bases de datos locales hay que regenerarlas: `npm run db:init && npm run db:seed`.

## 5. Cómo se revierte

Se vuelve a los nombres y reglas de la v1.1 revirtiendo el commit. Esto sólo se justifica si Check-in retira la v1.2; si no,
Panel estaría incumpliendo un acuerdo confirmado.
