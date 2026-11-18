# Integraciones — Panel Organizador (Evaluación 2)

Declaración de las dos integraciones que se evalúan. Ambas son con **Entradas / Inventario** y son de tipos distintos (C y B), como exige la especificación.

| Integración | Tipo (A, B o C) | Módulo contraparte | Servicio, endpoint o tópico | Contrato (ruta en el repo) | Ítem en GitHub |
|---|---|---|---|---|---|
| **I1** | **C** · Mensajería por broker | Entradas / Inventario | RabbitMQ de la plataforma: exchange `ticketu.events` (topic), routing key `panel.evento.entradas.v1`. Mensajes `evento_creado`, `evento_publicado`, `evento_actualizado`, `evento_cancelado` y `evento_eliminado`, con cuerpo `{ envelope, payload }` | [`docs/CONTRATO_PANEL_ENTRADAS.md`](docs/CONTRATO_PANEL_ENTRADAS.md) §3.1 · [ADR-0013](docs/adr/0013-publicacion-outbox-rabbitmq-plataforma.md) · [ADR-0014](docs/adr/0014-politica-consumo-broker-y-responsabilidades-plataforma.md) | INT-09 (#31) |
| **I2** | **B** · Servicio ofrecido | Entradas / Inventario | `GET /api/organizador/v1/panel/eventos/{id_evento}` por el API Gateway (`GET /api/v1/panel/eventos/{id_evento}` directo), con sesión `staff` u `organizador` validada con Auth | [`docs/api/openapi.yaml`](docs/api/openapi.yaml) · [`docs/CONTRATO_PANEL_ENTRADAS.md`](docs/CONTRATO_PANEL_ENTRADAS.md) §2.3 | INT-10 (#32) |

---

## I1 · Panel publica el ciclo de vida del evento y Entradas lo consume

- **Qué pasa:** cuando el organizador crea, publica, edita, cancela o elimina un evento, Panel guarda el cambio y deja un mensaje en su outbox (`mensajes_salientes`). Un proceso lo publica en RabbitMQ y Entradas lo consume para crear o actualizar su inventario del evento. El cuerpo lleva `{ envelope, payload }`, que es como lo lee el consumidor de Entradas ([ADR-0017](docs/adr/0017-sobre-en-el-cuerpo-para-entradas.md)).
- **Código:** `backend/src/modules/mensajeria/` (`evento.notifier.ts`, `outbox.publisher.ts`, `outbox.relay.ts`) y `backend/src/modules/eventos/evento.mapper.ts`.
- **Configuración:** `BROKER_URL`, `EVENT_EXCHANGE`, `TOPIC_ENTRADAS` y `BROKER_TOPICOS_CON_SOBRE` por variables de entorno (`.env` y `docker-compose.integracion.yml`). Con `SEED_DEMO=true`, los eventos de demo también se anuncian por el broker.
- **Manejo de errores:** si el broker no está disponible, el organizador no espera; el mensaje queda `PENDIENTE` y se reintenta hasta `OUTBOX_MAX_INTENTOS`.
- **Evidencia en datos:** `cambios_estado_evento` (BORRADOR → PUBLICADO, con fecha) y `mensajes_salientes` (pasa de `PENDIENTE` a `ENVIADO`).
- **Pruebas:** `backend/tests/int02-mensajeria.test.ts`, `backend/tests/outbox-relay.test.ts`, `backend/tests/hu03-eliminar-evento.test.ts` y evidencias en `docs/evidencias/`.
- **Prueba con el servicio real (17/11/2026):** con Gateway, RabbitMQ, Auth y Entradas reales en `plataforma-eventos-net`, los 7 eventos del Panel quedaron en `inventario_evento` de Entradas ([sesión de integración, prueba B](docs/evidencias/pruebas-integracion/sesion-integracion-2026-11-17.md)).
- **Responsables:** Etienne Araya (integración y pruebas) · Joaquín Martínez (backend).

## I2 · Entradas consulta los datos del evento a Panel

- **Qué pasa:** Entradas llama al GET de Panel por el API Gateway, reenviando la cookie `jwt` del usuario, y usa los datos del evento (nombre, fecha, hora, cantidad y tipo de entrada) en su aplicación.
- **Código:** `backend/src/modules/integraciones/integration.routes.ts` y `backend/src/modules/auth/require-organizer.ts`.
- **Configuración:** el Gateway enruta `/api/organizador/*` a `ORGANIZADOR_SERVICE_URL=http://organizador-service:3000`; Panel valida la sesión con `AUTH_SERVICE_URL`.
- **Manejo de errores:** id con formato inválido → 400, sin sesión → 401, rol no permitido → 403, evento inexistente → 404, Auth no disponible → 503 (fail-secure).
- **Evidencia en datos:** la respuesta del GET coincide con el documento del evento en la colección `eventos`.
- **Pruebas:** `backend/tests/integraciones.test.ts`, `backend/tests/gateway-prefix.test.ts` y carpetas «03 Entradas» y «04 Check-in» de la colección Postman.
- **Prueba con el servicio real (17/11/2026):** las llamadas al Panel por el Gateway con sesiones reales de Auth responden según el contrato, incluido el staff en el GET compartido ([sesión de integración, prueba A](docs/evidencias/pruebas-integracion/sesion-integracion-2026-11-17.md)).
- **Responsables:** Joaquín Martínez (backend) · Etienne Araya (integración y pruebas).

---

## Además: lo que Panel consume de Entradas (no declarado como I1/I2)

- **Consulta de stock antes de eliminar (HU-03, INT-05):** `GET /api/v1/entradas/eventos/{id_evento}/stock` en `entradas-service:3000`. Sin ventas el evento se elimina, con ventas pasa a CANCELADO y, si Entradas no responde, no se toca (503) ([ADR-0016](docs/adr/0016-eliminacion-de-eventos-y-consulta-de-stock.md)). Probado con el Entradas real el 17/11 (prueba C de la sesión).
- **Aviso de stock agotado:** Panel escucha `entradas.evento.stock.v1` en su cola durable `panel-organizador.entradas.stock`, marca el evento AGOTADO y se lo comunica a Catálogo ([ADR-0018](docs/adr/0018-consumo-stock-entradas-y-disponibilidad.md)). El lado del Panel quedó verificado con el código de Entradas; Entradas todavía no lo publica en la compra gratuita (hallazgo H1).
- **Pendiente del lado de Entradas:** los hallazgos H1–H6 de la sesión del 17/11, en especial que `evento_actualizado` no reinicie `stock_actual` (H2).
