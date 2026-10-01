# ADR-0007 — Servicios REST para los consumidores y sólo referencias a datos de otros squads

- **Estado:** Propuesta (implementado en Sprint 1). **Reemplazado en parte por [ADR-0011](0011-alineacion-contrato-checkin-v1-2.md)**: Check-in usa ahora el GET compartido con sesión, y `hora_termino` pasó a llamarse `hora_fin_evento`
- **Fecha:** 2026-09-29
- **Responsables:** Integración (Etienne) · Backend (Joaquín) · Base de Datos (Christopher)
- **Afecta a:** rúbrica BE3, BD2 y GE4 · los seis `docs/CONTRATO_PANEL_*.md`

---

## 1. Contexto

La tabla de dependencias TITEC dice que Panel **envía** datos a Catálogo, Entradas, Check-in, Notificaciones y Promociones,
y que **recibe** sólo de Auth. Según la rúbrica, "cada envío implica al menos un servicio propio definido en Swagger", y
los datos recibidos no se replican: se guardan sólo identificadores. El broker todavía no está acordado (ADR-0003).

Hay dos asimetrías conocidas:
- la tabla dice que Check-in recibe la **hora de fin**, pero el contrato de Check-in dice que Panel no la tiene;
- la fila "usuario (id, rol) → Auth (por confirmar)".

## 2. Decisión

**2.1 Un endpoint REST por consumidor, sin cookie de usuario** (acceso interno vía API Gateway, mecanismo por acordar).
Implementación: `backend/src/modules/integraciones/`.

| Consumidor | Endpoint | Regla | Contrato |
|---|---|---|---|
| Catálogo | `GET /api/v1/organizador/eventos/proximos` | Sólo PUBLICADO con fecha ≥ hoy | Catálogo §2.2 (confirmado) |
| Catálogo | `POST /api/v1/organizador/eventos/buscar` | Sólo PUBLICADO; texto literal (regex escapada) | Catálogo §2.2 |
| Catálogo | `GET /api/v1/organizador/eventos/{id}` | BORRADOR → 404 (no es visible) | Catálogo §2.2 |
| Entradas | `GET /api/v1/panel/eventos/{id}` | Cualquier estado; `id_usuario` = organizador | Entradas §2.3 (confirmado) |
| Check-in | ~~`GET /api/v1/panel/eventos/{id}/checkin`~~ → ver ADR-0011 | — | Contrato Check-in v1.2 |
| Notificaciones | `GET /api/v1/panel/eventos/{id}/cambios-estado` | Historial `{tipo, id_evento, nuevo_estado, fecha_cambio}` | Notificaciones §2.2 |
| Promociones | `GET /api/v1/panel/eventos-disponibles` | Sólo PUBLICADO: `id_evento`, nombre, fecha | Tabla de dependencias |

**2.2 Datos de otros squads:** sólo referencias.

| Dato | Dueño | En Panel |
|---|---|---|
| `id_usuario` del organizador | Auth | `eventos.id_organizador`, sólo el id |
| Nombre, RUT y correo del usuario | Auth | **No se guardan** (se descartan de la respuesta de Auth) |
| Stock, entradas vendidas, capacidad, QR | Entradas | **No se guardan ni se muestran**. Panel sólo define `cantidad_entradas` (cantidad inicial habilitada) |
| Promedio de reseñas, descuentos | Reseñas / Promociones | No aplican |

**2.3 Asimetrías:** se agregó la hora de término (opcional; hoy `hora_fin_evento`, ADR-0011) al modelo, porque BE3 y BD1 se revisan contra la tabla. La fila de
Auth "por confirmar" queda como issue INT-08.

## 3. Lo que este ADR NO decide

- `estado_disponibilidad = AGOTADO` (Catálogo): hace falta que Entradas informe el stock (INT-04). Hoy sólo se calculan `DISPONIBLE` y `PASADO`.
- El mecanismo de autenticación servicio-a-servicio en el Gateway.

## 4. Consecuencias

- **Para los otros squads:** estos endpoints ya funcionan, con datos de demo (`npm run db:seed`). Si un squad necesita otro campo o forma, debe proponerlo con un PR a `docs/api/openapi.yaml` + el contrato correspondiente.
- Tests: `backend/tests/integraciones.test.ts` (17 casos) + los casos de contrato.

## 5. Cómo se revierte

Cuando exista el broker, los endpoints REST pueden quedar para consulta y reconciliación, o retirarse si el consumidor lo pide.
Retirarlos exige quitarlos de `openapi.yaml` en el mismo PR.
