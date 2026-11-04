# Integraciones — Panel Organizador (Evaluación 2)

Declaración de las dos integraciones que se evalúan. Ambas son con **Entradas / Inventario** y son de tipos distintos (C y B), como exige la especificación.

| Integración | Tipo (A, B o C) | Módulo contraparte | Servicio, endpoint o tópico | Contrato (ruta en el repo) | Ítem en GitHub |
|---|---|---|---|---|---|
| **I1** | **C** · Mensajería por broker | Entradas / Inventario | RabbitMQ de la plataforma: exchange `ticketu.events` (topic), routing key `panel.evento.entradas.v1`. Mensajes `evento_creado`, `evento_publicado` y `evento_actualizado` | [`docs/CONTRATO_PANEL_ENTRADAS.md`](docs/CONTRATO_PANEL_ENTRADAS.md) §3.1 · [ADR-0013](docs/adr/0013-publicacion-outbox-rabbitmq-plataforma.md) · [ADR-0014](docs/adr/0014-politica-consumo-broker-y-responsabilidades-plataforma.md) | INT-09 (#30) |
| **I2** | **B** · Servicio ofrecido | Entradas / Inventario | `GET /api/organizador/v1/panel/eventos/{id_evento}` por el API Gateway (`GET /api/v1/panel/eventos/{id_evento}` directo), con sesión `staff` u `organizador` validada con Auth | [`docs/api/openapi.yaml`](docs/api/openapi.yaml) · [`docs/CONTRATO_PANEL_ENTRADAS.md`](docs/CONTRATO_PANEL_ENTRADAS.md) §2.3 | INT-10 (#31) |

---

## I1 · Panel publica el ciclo de vida del evento y Entradas lo consume

- **Qué pasa:** cuando el organizador crea, publica o edita un evento, Panel guarda el cambio y deja un mensaje en su outbox (`mensajes_salientes`). Un proceso lo publica en RabbitMQ y Entradas lo consume para crear o actualizar su inventario del evento.
- **Código:** `backend/src/modules/mensajeria/` (`evento.notifier.ts`, `outbox.publisher.ts`, `outbox.relay.ts`) y `backend/src/modules/eventos/evento.mapper.ts`.
- **Configuración:** `BROKER_URL`, `EVENT_EXCHANGE` y `TOPIC_ENTRADAS` por variables de entorno (`.env` y `docker-compose.integracion.yml`).
- **Manejo de errores:** si el broker no está disponible, el organizador no espera; el mensaje queda `PENDIENTE` y se reintenta hasta `OUTBOX_MAX_INTENTOS`.
- **Evidencia en datos:** `cambios_estado_evento` (BORRADOR → PUBLICADO, con fecha) y `mensajes_salientes` (pasa de `PENDIENTE` a `ENVIADO`).
- **Pruebas:** `backend/tests/int02-mensajeria.test.ts`, `backend/tests/outbox-relay.test.ts` y evidencias en `docs/evidencias/`.
- **Responsables:** Etienne Araya (integración y pruebas) · Joaquín Martínez (backend).

## I2 · Entradas consulta los datos del evento a Panel

- **Qué pasa:** Entradas llama al GET de Panel por el API Gateway, reenviando la cookie `jwt` del usuario, y usa los datos del evento (nombre, fecha, hora, cantidad y tipo de entrada) en su aplicación.
- **Código:** `backend/src/modules/integraciones/integration.routes.ts` y `backend/src/modules/auth/require-organizer.ts`.
- **Configuración:** el Gateway enruta `/api/organizador/*` a `ORGANIZADOR_SERVICE_URL=http://organizador-service:3000`; Panel valida la sesión con `AUTH_SERVICE_URL`.
- **Manejo de errores:** id con formato inválido → 400, sin sesión → 401, rol no permitido → 403, evento inexistente → 404, Auth no disponible → 503 (fail-secure).
- **Evidencia en datos:** la respuesta del GET coincide con el documento del evento en la colección `eventos`.
- **Pruebas:** `backend/tests/integraciones.test.ts`, `backend/tests/gateway-prefix.test.ts` y carpetas «03 Entradas» y «04 Check-in» de la colección Postman.
- **Responsables:** Joaquín Martínez (backend) · Etienne Araya (integración y pruebas).
