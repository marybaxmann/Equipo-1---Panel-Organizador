# ADR-0016 — Eliminación de eventos (HU-03): consulta de stock a Entradas y mensajes de cancelación

- **Estado:** Propuesta · implementado (Sprint 4)
- **Fecha:** 2026-11-16
- **Responsables:** Backend (Joaquín) · Integración (Etienne)
- **Afecta a:** `DELETE /api/v1/panel/eventos/mios/{id_evento}`, `backend/src/modules/integraciones/entradas.client.ts`, `evento.notifier.ts`, contrato Entradas §3.4

---

## 1. Contexto

HU-03 pide que un organizador pueda eliminar sus eventos. Un BORRADOR nunca se vendió, así que se puede borrar. Un PUBLICADO puede tener entradas vendidas: borrarlo dejaría a los compradores sin evento. El stock lo administra Entradas / Inventario (ADR-0007), así que el Panel tiene que preguntarle antes de decidir.

## 2. Decisión

| Estado del evento | Qué hace el Panel | Respuesta |
|---|---|---|
| BORRADOR | Lo borra sin consultar a Entradas | 200 `{ resultado: "ELIMINADO", id_evento }` |
| PUBLICADO, `stock = cantidad_entradas` | Lo borra | 200 `ELIMINADO` |
| PUBLICADO, Entradas responde 404 (no conoce el evento) | Lo borra: nunca hubo ventas | 200 `ELIMINADO` |
| PUBLICADO, `stock < cantidad_entradas` | **No lo borra**: pasa a CANCELADO y se registra en `cambios_estado_evento` | 200 `{ resultado: "CANCELADO", evento }` |
| PUBLICADO, Entradas no responde (timeout, red, 5xx dos veces, cuerpo inválido o sin `ENTRADAS_SERVICE_URL`) | No toca el evento | 503 `ENTRADAS_UNAVAILABLE` |
| FINALIZADO o CANCELADO | No se elimina | 409 `INVALID_STATE_TRANSITION` |

- La consulta es `GET {ENTRADAS_SERVICE_URL}/api/v1/entradas/eventos/{id_evento}/stock` (contrato Entradas §3.4), reenviando la cookie `jwt` del organizador. Igual que con Auth: timeout `ENTRADAS_TIMEOUT_MS` y un reintento.
- Se responde 200 con un `resultado` y no 204, para que el frontend sepa si el evento desapareció o quedó cancelado.
- El borrado y la cancelación son condicionales al estado leído: si otra petición cambió el evento entre medio, se responde 409.

### Mensajes (HU-07)

| Resultado | Catálogo | Entradas | Check-in | Notificaciones | Promociones |
|---|---|---|---|---|---|
| ELIMINADO (era BORRADOR) | — | `evento_eliminado` | — | — | — |
| ELIMINADO (era PUBLICADO) | `evento_eliminado` | `evento_eliminado` | — | — | `evento_eliminado` |
| CANCELADO | `evento_cancelado` | `evento_cancelado` | `evento_cancelado` (`tipo_cambio: CANCELADO`) | `evento_actualizado` con `nuevo_estado: CANCELADO` | `evento_cancelado` |

- `evento_eliminado` lleva `{ id_evento, id_usuario }`; el resto usa el mismo cuerpo que cada squad ya recibe.
- Check-in y Notificaciones no reciben la eliminación física: si no hubo ventas, no hay entradas que validar ni compradores a quienes avisar. Notificaciones pidió sólo cancelado y reprogramado (minuta del 29/10), y el contrato de Check-in no define `tipo_cambio: ELIMINADO`.

## 3. Consecuencias

- Mientras Entradas no publique su endpoint de stock, la demo usa `tools/mock-entradas` (declarado como simulado). Sin Entradas, eliminar un PUBLICADO responde 503: nunca se borra algo que pudo tener ventas.
- **Pendiente con Entradas:** confirmar la ruta, el formato y el significado del 404. **Pendiente con Check-in:** si quieren enterarse de la eliminación física.
