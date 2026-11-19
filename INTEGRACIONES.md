# Integraciones — Panel Organizador (Evaluación 3)

Declaración de las tres integraciones evaluables en el ambiente de pruebas (workstation), una por tipo. Las instrucciones de instalación, variables de entorno y usuarios de prueba están en [`INSTALACION.md`](INSTALACION.md).

> Los valores marcados `<completar>` se confirman en workstation durante la verificación en clase del 19/11. Direcciones en workstation: API Gateway `http://localhost:8080`, Frontend Unificado `http://localhost:3000`, consola de RabbitMQ `http://localhost:15672`.

| Integración | Tipo | Módulo contraparte | Servicio, ruta en el gateway o tópico | Cómo se evidencia | Dónde verificarlo |
|---|---|---|---|---|---|
| **I1** | A. Autenticación | Auth | `GET /internal/validar-sesion` (Auth), reenviando la cookie `jwt` en cada petición | Funcionalidad + trazas | Login en `http://localhost:3000/auth/admin/login` con `organizador1@ticketu.test` → `/organizador`; rechazo con `comprador1@ticketu.test` (403) y con jwt alterado (401); log del Panel |
| **I2** | B. API Gateway | Entradas / Inventario (también Check-in) | Servicio provisto: `GET /api/organizador/v1/panel/eventos/{id_evento}` en el API Gateway | Funcionalidad + trazas | `curl` al Gateway con sesión `staff1` u `organizador1`; logs del Gateway y del Panel |
| **I3** | C. Broker | Entradas / Inventario | Exchange `ticketu.events` (topic), routing key `panel.evento.entradas.v1` | Base de datos + consola del broker + trazas | `mensajes_salientes` (PENDIENTE → ENVIADO); consola de RabbitMQ; log `[outbox]` del Panel; `inventario_evento` de Entradas |

---

## I1 · Autenticación con Auth (tipo A)

**Qué hace:** antes de cualquier operación, Panel reenvía a Auth la cookie `jwt` del usuario, sin decodificarla, y usa el `usuario.rol` que Auth devuelve. Solo el rol `organizador` gestiona eventos, y solo los propios.

**Cómo verificarlo (usuarios de Auth en workstation):**

1. **Acceso permitido:** abrir `http://localhost:3000/auth/admin/login`, iniciar sesión con `organizador1@ticketu.test` → el sistema redirige a `http://localhost:3000/organizador` y la lista de eventos carga (200).
2. **Rechazo por rol:** iniciar sesión con `comprador1@ticketu.test` (rol `usuario`) y abrir `/organizador` → pantalla *Acceso restringido a organizadores* (403 `FORBIDDEN_ROLE`).
3. **Rechazo de token inválido:**
   ```bash
   curl -i http://localhost:8080/api/organizador/v1/panel/eventos/mios --cookie "jwt=token-alterado"
   ```
   Respuesta esperada: `401` con `{"error":{"codigo":"SESSION_INVALID",...}}`.
4. **Sin token:** el mismo `curl` sin `--cookie` → `401 SESSION_INVALID`.

**Transparencia:** el usuario inicia sesión una sola vez en Auth desde el Frontend Unificado; el navegador envía la cookie `jwt` automáticamente. Sin sesión, el Panel redirige a `/auth/admin/login`. No se copian tokens ni hay tokens fijos en el código.

**Configuración:** `AUTH_SERVICE_URL`, `AUTH_INTERNAL_API_KEY` y `AUTH_TIMEOUT_MS` por variables de entorno (`docker-compose.integracion.yml`). Valor en workstation: `AUTH_SERVICE_URL=http://auth-service:10000`.

**Trazas:** `docker compose -f docker-compose.integracion.yml logs organizador-service`. Si Auth rechaza la clave interna, el Panel registra `[auth] Auth rechazó la x-api-key (403)` y responde `502 AUTH_ERROR`.

**Código:** `backend/src/modules/auth/auth.client.ts` (validación, timeout y fail-secure) y `backend/src/modules/auth/require-organizer.ts` (rol y propiedad).

**Contrato:** [`docs/CONTRATO_PANEL_AUTH.md`](docs/CONTRATO_PANEL_AUTH.md) · `CONTRATO_INTEGRACION_AUTH.md` del repo `equipo-auth/arquitectura` (rama `main`).

---

## I2 · Servicio provisto por el API Gateway (tipo B)

**Qué hace:** Entradas (y Check-in como respaldo) consulta los datos de un evento a Panel **a través del API Gateway**. El Gateway enruta `/api/organizador/*` al contenedor `organizador-service:3000`. Panel valida la sesión con Auth y admite los roles `staff` y `organizador`.

**Ruta en el Gateway:** `GET http://localhost:8080/api/organizador/v1/panel/eventos/{id_evento}` → Panel `GET /api/v1/panel/eventos/{id_evento}`.

**Cómo verificarlo:**

1. Iniciar sesión en Auth con `staff1@ticketu.test` por el Gateway y conservar la cookie:
   ```bash
   curl -i -c cookies.txt -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" -d '<cuerpo de login de Auth con staff1@ticketu.test y su contraseña de QA>'
   ```
   El formato del cuerpo es el que define el contrato de Auth (`<completar>`). Auth responde con la cookie `jwt`, que queda en `cookies.txt`.
2. Consultar un evento publicado por el Gateway:
   ```bash
   curl -i -b cookies.txt http://localhost:8080/api/organizador/v1/panel/eventos/<id_evento_publicado>
   ```
   Respuesta esperada: `200` con `id_evento`, `id_usuario`, `nombre_evento`, `fecha_evento`, `hora_evento`, `hora_fin_evento`, `cantidad_entradas`, `tipo_entrada` y `estado_gestion`.
3. **Trazas del Gateway:** `docker logs ticketu-api-gateway` muestra la petición a `/api/organizador/v1/panel/eventos/...`. **Trazas del Panel:** `docker compose -f docker-compose.integracion.yml logs organizador-service`.

**Manejo de errores (en vivo):**

| Caso | Cómo provocarlo | Respuesta |
|---|---|---|
| Evento inexistente | id `66f000000000000000000000` | `404 EVENT_NOT_FOUND` |
| Id con formato inválido | id `no-es-id` | `400 INVALID_EVENT_ID` |
| Sin sesión | `curl` sin cookie | `401 SESSION_INVALID` |
| Rol no permitido | sesión de `comprador1` | `403 FORBIDDEN_ROLE` |

**Manejo de errores (en código):** si Auth no responde dentro de `AUTH_TIMEOUT_MS`, Panel aplica fail-secure y responde `503 AUTH_UNAVAILABLE` (`backend/src/modules/auth/auth.client.ts`). Todos los errores salen con el mismo formato `{ "error": { "codigo", "mensaje" } }` (`backend/src/core/middlewares/error-handler.ts`).

**Configuración:** la ruta `/api/organizador/*` y la dirección `ORGANIZADOR_SERVICE_URL=http://organizador-service:3000` se configuran en el Gateway (repo `FWizav/backendticketU`). Gateway en workstation: `http://localhost:8080` (host) · `http://ticketu-api-gateway:8080` (Docker).

**Contrato:** [`docs/api/openapi.yaml`](docs/api/openapi.yaml) (operación `getEventoIntegracion`, tags *Integración — Entradas* y *Integración — Check-in*) · [`docs/CONTRATO_PANEL_ENTRADAS.md`](docs/CONTRATO_PANEL_ENTRADAS.md) §2.3 · [`docs/CONTRATO_PANEL_CHECKIN.md`](docs/CONTRATO_PANEL_CHECKIN.md) §3.4. Corresponde a la tabla de dependencias TITEC 2026-2: Entradas recibe de Panel id usuario, nombre, hora, fecha, cantidad y tipo de entrada; Check-in recibe id, nombre, dirección, hora de inicio, hora de fin y fecha.

**Código:** `backend/src/modules/integraciones/integration.routes.ts` · prefijo del Gateway probado en `backend/tests/gateway-prefix.test.ts`.

---

## I3 · Publicación de eventos en el broker (tipo C)

**Qué hace:** cuando el organizador crea, publica, edita, cancela o elimina un evento, Panel guarda el cambio y deja el mensaje en su outbox (`mensajes_salientes`). Un proceso lo publica en RabbitMQ y Entradas lo consume para crear o actualizar el inventario del evento.

**Tópico y esquema:**

- Exchange `ticketu.events` (tipo topic, durable), routing key `panel.evento.entradas.v1`.
- Tipos de mensaje: `evento_creado`, `evento_publicado`, `evento_actualizado`, `evento_cancelado`, `evento_eliminado`.
- Cuerpo: `{ "envelope": { "version", "tipo", "fecha_cambio", "id_evento" }, "payload": { ...datos del evento } }`. Especificación completa en [`docs/CONTRATO_PANEL_ENTRADAS.md`](docs/CONTRATO_PANEL_ENTRADAS.md) §3.1 y [ADR-0017](docs/adr/0017-sobre-en-el-cuerpo-para-entradas.md).

**Cómo verificarlo:**

1. En `http://localhost:3000/organizador`, con la sesión de `organizador1@ticketu.test`, crear un evento y publicarlo.
2. **Base de datos del Panel** (antes y después):
   ```bash
   docker compose -f docker-compose.integracion.yml exec organizador-mongo mongosh panel_organizador --quiet --eval "db.mensajes_salientes.find({}, {topico:1, tipo:1, estado:1, fecha_envio:1}).sort({fecha_creacion:-1}).limit(5)"
   ```
   Esperado: mensajes `evento_creado` y `evento_publicado` con `topico: "panel.evento.entradas.v1"` y `estado: "ENVIADO"`, con `fecha_envio`.
3. **Trazas del Panel:** `docker compose -f docker-compose.integracion.yml logs organizador-service` muestra `[outbox] panel.evento.entradas.v1 → evento_publicado <id_evento>`.
4. **Consola de RabbitMQ:** `http://localhost:15672` → vhost `ticketu` → exchange `ticketu.events` → mensajes publicados y entregados a la cola de Entradas.
5. **Efecto en la contraparte:** el evento aparece en la colección `inventario_evento` de Entradas, con `stock_inicial` igual a `cantidad_entradas`.

**Manejo de errores (en código):** si el broker no está disponible, la operación del organizador responde igual y el mensaje queda `PENDIENTE`; se reintenta hasta `OUTBOX_MAX_INTENTOS` (10 por defecto) y luego queda `FALLIDO`. Cada error se registra con `[outbox] error al publicar ...` (`backend/src/modules/mensajeria/outbox.relay.ts`).

**Configuración:** `BROKER_URL`, `EVENT_EXCHANGE`, `TOPIC_ENTRADAS` y `BROKER_TOPICOS_CON_SOBRE` por variables de entorno. Valor en workstation: `BROKER_URL=<completar>`.

**Código:** `backend/src/modules/mensajeria/` (`evento.notifier.ts`, `outbox.publisher.ts`, `outbox.relay.ts`).

**Contrato:** [`docs/CONTRATO_PANEL_ENTRADAS.md`](docs/CONTRATO_PANEL_ENTRADAS.md) §3.1 · [ADR-0013](docs/adr/0013-publicacion-outbox-rabbitmq-plataforma.md). Corresponde a la tabla de dependencias: Entradas recibe de Panel los datos del evento.

---

## Si la contraparte no está disponible en workstation

- **I2:** se evidencia la parte propia: el servicio de Panel responde por el Gateway con la ruta y el formato del contrato (pasos 1 y 2 de I2).
- **I3:** se evidencia la parte propia: el mensaje se publica en `ticketu.events` con la routing key y el esquema acordados (`mensajes_salientes` en ENVIADO y log `[outbox]`).

## Responsables

Etienne Araya (integración y pruebas) · Joaquín Martínez (backend) · Mariajosé Baxmann (contratos).
