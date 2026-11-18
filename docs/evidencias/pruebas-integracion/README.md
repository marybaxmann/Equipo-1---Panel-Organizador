# Evidencias de Pruebas de Integración (Evaluación 2 — Interoperabilidad)

Este directorio reúne las evidencias oficiales con fecha de las pruebas de integración e interoperabilidad del **Panel Organizador** con el ecosistema de la plataforma TicketU, cubriendo tanto el canal asíncrono (Broker RabbitMQ) como el canal síncrono (API Gateway).

---

## 1. Integración Asíncrona (I1 — RabbitMQ Broker)

* **Carpeta de evidencia:** [`broker-2026-11-04/`](broker-2026-11-04/README.md)
* **Fecha de ejecución:** 04/11/2026 (00:14–00:17 UTC-3)
* **Componente evaluado:** Componente emisor de Panel Organizador hacia el exchange durable `ticketu.events` con routing key `panel.evento.entradas.v1` (ADR-0013, ADR-0014).
* **Alcance:** Validación del patrón Outbox Relay, serialización de cabeceras AMQP, tolerancia a caídas forzadas del broker (desacoplamiento total, cero pérdida de datos y 17/17 mensajes despachados en `ENVIADO`) verificado contra la cola de control `demo.panel.entradas`.

---

## 2. Integración Síncrona y Ecosistema Completo (I2 — API Gateway :8080)

* **Documento de verificación punto a punto:** [`verificacion-gateway-2026-11-04.md`](verificacion-gateway-2026-11-04.md)
* **Fecha de ejecución:** 04/11/2026
* **Alcance comprobado vía Gateway (:8080):**
  - Healthcheck del Gateway (`GET /health` -> 200).
  - Consulta pública de catálogo (`GET /api/organizador/v1/organizador/eventos/proximos` -> 200).
  - Control de seguridad y autorización (`GET /api/organizador/v1/panel/eventos/{id}` sin cookie -> 401 `SESSION_INVALID`).
  - Validación de sesión staff y directiva **Fail-Secure** ante indisponibilidad de Auth (`503 AUTH_UNAVAILABLE`), y respuesta nominal (`200 OK`) con Auth simulado (`tools/mock-auth` en `auth-service:10000`).
  - Creación (HTTP 201) y publicación (HTTP 200) de evento a través del Gateway, con persistencia transaccional y despacho de 6 mensajes en `mensajes_salientes` hacia RabbitMQ en la red compartida `plataforma-eventos-net`.

---

## 3. Suite Automatizada Newman vía API Gateway (:8080)

* **Colección Postman:** `postman/panel-organizador.postman_collection.json` (regenerada vía `node postman/generate-collection.mjs`).
* **Ambiente Gateway:** `postman/gateway.postman_environment.json`.
* **Casos incorporados de contrato:** TC-ENT-01 (GET por ID), TC-ENT-03 (creación notifica a Entradas), TC-ENT-04 (publicación notifica a Entradas) y caso de error (404 `EVENT_NOT_FOUND`).
* **Salida CLI (32 requests, 56 assertions, 0 fallos):** [`newman-gateway-2026-11-04-cli.txt`](newman-gateway-2026-11-04-cli.txt)
* **Reporte JUnit XML:** [`newman-gateway-2026-11-04-junit.xml`](newman-gateway-2026-11-04-junit.xml)

---

## 4. Registro Visual de Evidencias (Capturas)

* **Carpeta de capturas:** [`capturas/`](capturas/README.md)
* **Capturas disponibles:**
  - [`01-gateway-health.png`](capturas/01-gateway-health.png): Healthcheck del Gateway respondiendo HTTP 200 en puerto 8080.
  - [`02-gateway-catalogo-proximos.png`](capturas/02-gateway-catalogo-proximos.png): Consulta pública de catálogo a través del Gateway.
  - [`03-rabbitmq-exchange.png`](capturas/03-rabbitmq-exchange.png): Consola web de RabbitMQ mostrando el exchange `ticketu.events`.
  - [`04-mongo-outbox-enviado.png`](capturas/04-mongo-outbox-enviado.png): Mensajes en colección `mensajes_salientes` con estado `ENVIADO`.
  - [`05-newman-gateway-32-passed.png`](capturas/05-newman-gateway-32-passed.png): Ejecución de Newman con 32 tests ejecutados y 0 fallos (100% éxito).

---

## 5. Integración con Auth real (17/11/2026)

* **Documento de verificación:** [`auth-real-2026-11-17.md`](auth-real-2026-11-17.md)
* **Fecha de ejecución:** 17/11/2026
* **Componente evaluado:** cliente de Auth del Panel (`GET /internal/validar-sesion` con cookie `jwt` y `x-api-key`) contra el **microservicio real de Auth** (`equipo-auth/arquitectura`, commit `742b338`), con su Keycloak, PostgreSQL y usuarios QA, sin modificar su repositorio.
* **Alcance comprobado con jwt reales emitidos por Auth:**
  - Organizador válido → 200; sin sesión y jwt inventado → 401; comprador y staff en el panel → 403 `FORBIDDEN_ROLE`; staff en el GET compartido con Check-in → 200.
  - `x-api-key` incorrecta → Auth responde 403 y el Panel 502 `AUTH_ERROR`; sesión revocada por Auth (HU-B8) → 401; Auth apagado → 503 `AUTH_UNAVAILABLE` (fail-secure).
  - Identidad: el `id_organizador` guardado es el `id_usuario` que entrega Auth.
  - El jwt que recibe Auth es idéntico (misma huella SHA-256) al que Auth emitió: el Panel lo reenvía sin decodificarlo ni modificarlo.
* **Hallazgos para el equipo de Auth:** realm de Keycloak sin el atributo `rut` en instalaciones nuevas, script `iniciar-integracion.ps1` incompatible con Windows PowerShell 5.1 y logout que sólo borra la cookie (comportamiento definido en HU-B3).

---

> [!NOTE] Alcance de componentes reales vs. simulados
> Las pruebas de integración se ejecutaron a través de los componentes compartidos reales de la plataforma TicketU (**API Gateway** en puerto 8080 y **RabbitMQ** en `ticketu-rabbitmq:5672` con exchange `ticketu.events`). En las pruebas del 04/11, por restricciones de ambiente de las contrapartes, la autenticación fue validada mediante el mock de desarrollo (`tools/mock-auth`) y el consumo de eventos AMQP por parte de Entradas fue monitoreado mediante cola de control y persistencia en Outbox. **Desde el 17/11 la integración con Auth está verificada contra el servicio real de Auth** (sección 5); queda repetirla en la red compartida `plataforma-eventos-net`.

---

## 6. Corrida local del Sprint 4 (18/11/2026, sin Gateway)

* **Salida CLI:** [`newman-cli.txt`](newman-cli.txt)
* **Reporte JUnit XML:** [`newman-junit.xml`](newman-junit.xml)

### Resultados
- **Fecha de ejecución**: 2026-11-18
- **Comando ejecutado**: `npm run test:integration | tee docs/evidencias/pruebas-integracion/newman-cli.txt` (con la API en el puerto 3100: `-- --env-var baseUrl=http://localhost:3100/api/v1`)
- **Resumen**: 32 requests, 56 aserciones, **0 fallos**.
- **Carpetas ejecutadas**: 01 Auth (servicio consumido) · 02 Catálogo · 03 Entradas · 04 Check-in · 05 Notificaciones · 06 Promociones · 07 Flujo HU-01→HU-05 · 08 Sprint 2. La carpeta de HU-03 está pendiente.

## 7. HU-03 Eliminar y mensajes de HU-07 contra un RabbitMQ real (16/11/2026)

* **Salida completa:** [`hu03-eliminar-broker-2026-11-16.txt`](hu03-eliminar-broker-2026-11-16.txt)
* **Ambiente:** API del Panel + MongoDB 7 + `tools/mock-auth` + `tools/mock-entradas` (stock simulado) + RabbitMQ 3 con el exchange `ticketu.events`. Una cola de control ligada a `panel.#` muestra lo que publica el relay del outbox.
* **Resultado:** BORRADOR y Feria (sin ventas) eliminados (200 `ELIMINADO`); Charla (25 entradas vendidas) pasa a CANCELADO (200), con `PUBLICADO → CANCELADO` en `cambios_estado_evento`; FINALIZADO → 409; evento ajeno → 403; con Entradas detenido → 503 y el evento sigue PUBLICADO.
* **Broker:** los 9 mensajes quedaron `ENVIADO`. Sólo `panel.evento.entradas.v1` lleva el cuerpo `{ envelope, payload }` que lee Entradas (ADR-0017); los demás tópicos van con su cuerpo plano.
* **Límite:** Entradas y Auth son simulados. Auth ya se probó contra el servicio real (sección 5); Entradas real queda para la prueba en la red compartida.

### Cómo reproducir
1. Asegurarse de tener la infraestructura y base de datos de demo inicializada:
   ```bash
   npm run infra:up
   npm run db:init && npm run db:seed
   ```
2. Levantar la API en modo desarrollo:
   ```bash
   npm run dev:api
   ```
3. En otra terminal, ejecutar las pruebas:
   ```bash
   npm run test:integration
   ```
