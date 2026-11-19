# Re-prueba de los hallazgos de Entradas — 18/11/2026

**Responsable:** Etienne Araya (Integración y Calidad) · **Fecha:** 18/11/2026, 21:45 (UTC-3)

En la [sesión del 17/11](sesion-integracion-2026-11-17.md#3-hallazgos-para-entradas) quedaron seis hallazgos para Entradas (H1 a H6). El 18/11, Entradas publicó los arreglos en su `main` (commits `97b8430` «errores corregidos encontrados por ellos» y `430a9f3`). Esta prueba los verifica en el ambiente real.

## Ambiente

- Entradas en `430a9f3`, levantado con **su propio `docker-compose.yml`, sin override**. La clave de Auth se pasa como variable `INTERNAL_API_KEY` (arreglo H5).
- Auth actualizado a `f87671d` (`equipo-auth/arquitectura`), el Gateway, RabbitMQ (vhost `ticketu`) y el Panel de `main`, todos en `plataforma-eventos-net`.
- Todo pasa por el Gateway `:8080`: el Panel en `/api/organizador/v1`, Entradas en `/api/entradas` y Auth en `/api/auth`. Se usan `organizador1` y `comprador1`.
- El inventario de Entradas se leyó directamente de su Mongo (`ticketu_entradas_db.inventario_evento`).

## Resultado

| Hallazgo | Qué se hizo | Antes (17/11) | Ahora |
|---|---|---|---|
| **H2** · editar reiniciaba el stock | Evento de 10 entradas: se compran 3 y se edita el nombre en el Panel (`evento_actualizado`) | `stock_actual` volvía a 10, y el Panel borraba un evento con ventas | ✅ `stock_actual` sigue en 7 con 3 compradas, y eliminar en el Panel responde `CANCELADO` |
| **H3** · `evento_eliminado` se procesaba como alta | Evento sin ventas, eliminado en el Panel | Quedaba `PUBLICADO` con 100 entradas | ✅ Sale de `inventario_evento`, y una compra sobre él responde 404 «El evento solicitado no existe» |
| **H1** · la compra gratuita no avisaba AGOTADO | Evento de 2 entradas: se compran las 2 | Solo publicaba `stock.agotado` | ✅ Publica `entradas.evento.stock.v1`: el Panel registra `stock=0` y Catálogo muestra `estado_disponibilidad: AGOTADO` |
| **H4** · precio 10000 en gratuitos | Mismos eventos GRATUITA | `precio_unitario: 10000` | ✅ `precio_unitario: 0` |
| **H5** · clave fija en el compose | Levantar Entradas sin override | Había que editar o sobreescribir su compose | ✅ `INTERNAL_API_KEY: ${INTERNAL_API_KEY:-…}` la toma del entorno |
| **H6** · `id_usuario` del seed no se actualizaba | Inventario de los eventos creados | Conservaba `usr-org-panel` | ✅ `id_usuario` = `e03fb2aa-…`, el de organizador1 en Auth. Al sincronizar, el mensaje del Panel también reemplaza el `id_usuario` |

Salida completa, sin editar: [`reprueba-entradas-2026-11-18.txt`](reprueba-entradas-2026-11-18.txt). Captura: [`capturas/entradas-04-reprueba-hallazgos.png`](capturas/entradas-04-reprueba-hallazgos.png).

Después de actualizar Auth y Entradas, las pruebas de `tools/pruebas-integracion/` siguen pasando: Auth por el Gateway 10/10 y Notificaciones 9/9.

## Observación menor para Entradas

Su código ya no liga la cola a `panel.#`. Pero la cola es durable, así que el enlace viejo sigue en un RabbitMQ que ya existía, y Entradas sigue recibiendo los mensajes de Check-in y Promociones (se ve en su log). No cambia ningún resultado. En un RabbitMQ nuevo no pasa; en uno existente se corrige quitando ese enlace a mano.
