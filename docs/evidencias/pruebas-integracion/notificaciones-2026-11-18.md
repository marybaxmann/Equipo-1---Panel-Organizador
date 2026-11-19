# Prueba Panel → Notificaciones por el exchange acordado — 18/11/2026

**Responsable:** Etienne Araya (Integración y Calidad) · **Fecha:** 18/11/2026, 20:17 (UTC-3)

Verifica la decisión de ADR-0019 (contrato Notificaciones v1.4 §2.2): el Panel publica los mensajes de Notificaciones también en el exchange `panel.evento.notificaciones.v1`, que es donde Notificaciones armó su consumidor. Los pasos son los que acordó el equipo para la prueba con Notificaciones.

## Ambiente

- Panel desde `main` (`b39035b`, incluye el PR #41), con `docker-compose.integracion.yml`, en la red `plataforma-eventos-net`.
- `BROKER_EXCHANGES_ADICIONALES=panel.evento.notificaciones.v1=panel.evento.notificaciones.v1` (valor por defecto del compose).
- API Gateway (`:8080`), Auth real con su seed QA, Entradas / Inventario y RabbitMQ de la plataforma, vhost `ticketu`, igual que en la [sesión del 17/11](sesion-integracion-2026-11-17.md).
- Notificaciones no corría en este ambiente. En su lugar se creó la cola `prueba.notificaciones`, ligada **sólo** al exchange `panel.evento.notificaciones.v1` con `#`, como la de su consumidor. Se borró al terminar.

## Pasos y resultado

| Paso | Llamada (vía Gateway) | Resultado |
|---|---|---|
| 1 | Login de `organizador1` y `comprador1` en `POST :8080/api/auth/login` | cookie `jwt` de Auth |
| 2 | `POST /api/organizador/v1/panel/eventos` (GRATUITA, 50 entradas) | `id_evento` `6afe31eff332b462ae86e954` |
| 3 | `POST …/mios/{id}/publicar` | 200. A Notificaciones no le llega nada |
| 4 | `PATCH …/mios/{id}` con `{"fecha_evento":"2026-12-13","hora_evento":"20:00"}` | 200. Llega `evento_reprogramado` |
| 5 | `POST :8080/api/entradas/procesar-compra` (comprador1, 1 entrada) | `{"nuevo_stock":49,"estado_pago":"GRATUITA"}` |
| 6 | `DELETE …/mios/{id}` | `{"resultado":"CANCELADO"}`. Llega `evento_actualizado` |
| 7 | `GET …/{id}/cambios-estado` | BORRADOR → PUBLICADO → CANCELADO |

### Mensajes recibidos en la cola ligada sólo a `panel.evento.notificaciones.v1`

```text
exchange=panel.evento.notificaciones.v1 routing_key=panel.evento.notificaciones.v1 type=evento_reprogramado
  {"id_evento":"6afe31eff332b462ae86e954","id_usuario":"e03fb2aa-8a3e-4d97-b46a-30553d424fcd","nuevo_estado":"PUBLICADO","fecha_cambio":"2026-12-13","hora_cambio":"20:00:00"}
exchange=panel.evento.notificaciones.v1 routing_key=panel.evento.notificaciones.v1 type=evento_actualizado
  {"id_evento":"6afe31eff332b462ae86e954","id_usuario":"e03fb2aa-8a3e-4d97-b46a-30553d424fcd","nuevo_estado":"CANCELADO"}
```

- El cuerpo es JSON plano, con los campos del contrato §2.3 y §2.4. En `evento_reprogramado`, `fecha_cambio` y `hora_cambio` son la nueva fecha y hora del evento.
- El tipo viaja en la propiedad AMQP `type` y en el header `tipo`. También van los headers `id_evento`, `fecha_cambio` y `version`, con `app_id: organizador-service`.
- `id_usuario` es el `id_usuario` que entrega Auth para organizador1.

Log del Panel:

```text
[mensajeria] panel.evento.notificaciones.v1 ← evento_reprogramado 6afe31eff332b462ae86e954
[outbox] panel.evento.notificaciones.v1 → evento_reprogramado 6afe31eff332b462ae86e954
[mensajeria] panel.evento.notificaciones.v1 ← evento_actualizado 6afe31eff332b462ae86e954
[outbox] panel.evento.notificaciones.v1 → evento_actualizado 6afe31eff332b462ae86e954
```

## Capturas

- [`capturas/notificaciones-01-pasos.png`](capturas/notificaciones-01-pasos.png): respuestas de los pasos 4 y 6, `cambios-estado`, los mensajes recibidos y el log del Panel. Es la salida real de la terminal, convertida en imagen.
- [`capturas/notificaciones-02-cola-rabbitmq.png`](capturas/notificaciones-02-cola-rabbitmq.png): la consola de RabbitMQ con la cola, su enlace al exchange `panel.evento.notificaciones.v1` y los dos mensajes abiertos.

## Observación

Al actualizar `main` en un clon de Windows, el contenedor del Panel no arrancaba (`set: illegal option -`), porque Git descargó `backend/docker-entrypoint.sh` con CRLF. Se corrigió en el PR #43 (`.gitattributes` con `*.sh text eol=lf`).

## Pendiente

Repetir los pasos 4 y 6 con el consumidor real de Notificaciones levantado, y registrar su log o su base de datos recibiendo los dos mensajes.
