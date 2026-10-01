# ADR-0009 — HU-04 (publicar evento) adelantada al Sprint 1

- **Estado:** Propuesta (implementado en Sprint 1; pendiente de revisión del equipo y de la Scrum Master para el tablero)
- **Fecha:** 2026-09-30
- **Responsables:** Backend (Joaquín) · Gestión (Mariajosé) para reflejarlo en GitHub
- **Afecta a:** HU-04 (#4) · planificación de sprints · rúbrica GE1/GE3

---

## 1. Contexto

Con HU-01 y HU-05 terminadas, la demo mostraba eventos que nunca podían salir de Borrador. HU-04 estaba planificada para el
Sprint 2 porque su criterio "notificar al Catálogo" depende del broker. Pero los otros criterios de aceptación no dependen
del broker, y Catálogo ya consulta los eventos PUBLICADO por REST (ADR-0007).

## 2. Decisión

Se implementa HU-04 **salvo la notificación por broker**, que queda para HU-07 (Sprint 3, ADR-0003).

| Criterio de aceptación | Estado |
|---|---|
| Sólo eventos propios | ✅ 403 `EVENT_NOT_OWNED` |
| Sólo Borrador → Publicado | ✅ otro estado → 409 `INVALID_STATE_TRANSITION`; la transición es atómica (`findOneAndUpdate` condicionado al estado) |
| Validar nombre, fecha y ubicación | ✅ faltantes → 400 |
| Notificar a Catálogo para que aparezca en la cartelera | 🟡 Catálogo lo ve de inmediato vía `GET /organizador/eventos/...`; el **mensaje** al broker llega con HU-07 |
| Un borrador no es visible en Catálogo | ✅ ya garantizado y testeado |

- Endpoint: `POST /api/v1/panel/eventos/mios/{id}/publicar`, en `organizer.routes.ts`, con `publicarEvento` en `evento.service.ts`. Registra `BORRADOR→PUBLICADO` en `cambios_estado_evento`.
- UI: botón ✓ habilitado sólo en tarjetas en Borrador, con el modal de confirmación "¿Publicar este evento? Será visible en el catálogo público." (fila 33 del checklist).
- Tests: `backend/tests/hu04-publicar-evento.test.ts` (5 casos) + 2 casos de contrato.

## 3. Lo que este ADR NO decide

- Si el issue #4 se cierra ahora o se mantiene abierto hasta la notificación por broker. **Lo decide la Scrum Master.** Sugerencia: dejarlo abierto con un comentario que diga qué criterios ya se cumplen, y cerrarlo con HU-07.
- La edición (HU-02) sigue en el Sprint 2. En la UI, el lápiz muestra un aviso.

## 4. Consecuencias

- El Sprint 2 se reduce a HU-02, más dejar listo el registro en el outbox (ADR-0003) para publicar y editar.
- `docs/api/openapi.yaml`: el endpoint pasó del tag "Planificado S2/S3" al del organizador.

## 5. Cómo se revierte

Se quita la ruta y se vuelve a marcar el endpoint con `x-sprint: 2` en el Swagger. No hay migración de datos: los eventos
publicados siguen siendo válidos.
