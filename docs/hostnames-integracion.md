# Hostnames y Conectividad de Integración — Plataforma TicketU

**Módulo:** Panel Organizador  
**Responsable de Integración:** Etienne Araya (`maikfeouWu`)  
**Fecha de actualización:** 03/11/2026  

Este documento consolida los hostnames, puertos, variables de entorno y protocolos de comunicación acordados para las integraciones de **Panel Organizador** con los demás microservicios de la plataforma TicketU, enfocado principalmente en **Auth**, **Entradas / Inventario**, el **API Gateway** y el **Broker de Eventos (RabbitMQ)**.

---

## 1. Integración con Auth (Autenticación e Identidad)

Panel Organizador actúa como **consumidor** de Auth. Antes de ejecutar operaciones protegidas, Panel reenvía la cookie `jwt` a Auth para validar la identidad y rol del usuario (`GET /internal/validar-sesion`).

| Ambiente | Hostname / URL base | Puerto | Variable de entorno | Notas |
|---|---|---|---|---|
| **Local (Mock de Auth)** | `http://localhost:4001` | `4001` | `AUTH_SERVICE_URL=http://localhost:4001` | Servidor simulado en `tools/mock-auth` |
| **Docker (Red compartida)** | `http://auth-service:10000` (o `http://auth-service:3000`) | `10000` / `3000` | `AUTH_SERVICE_URL=http://auth-service:10000` | Dentro de la red `plataforma-eventos-net` |
| **Integración directa en host** | `http://localhost:10000` | `10000` | `AUTH_SERVICE_URL=http://localhost:10000` | Puerto confirmado del servicio real de Auth |

### Endpoints y configuración:
* **Endpoint de validación:** `GET /internal/validar-sesion`
* **Cabecera obligatoria:** `Cookie: jwt=<token>`
* **Timeout configurado:** `1000 ms` (`AUTH_TIMEOUT_MS=1000`)
* **Comportamiento ante falla:** Fail-Secure (HTTP `503 AUTH_UNAVAILABLE`). Máximo 1 reintento ante caída o timeout.
* **Referencia contractual:** [`docs/CONTRATO_PANEL_AUTH.md`](CONTRATO_PANEL_AUTH.md) y [`docs/api/auth-consumido.yaml`](api/auth-consumido.yaml).

---

## 2. Integración con Entradas / Inventario

La integración entre Panel Organizador y Entradas/Inventario se compone de dos vías: **Asíncrona (Broker)** para eventos del ciclo de vida y **Síncrona (REST)** para consultas de respaldo y validaciones.

### A. Vía Asíncrona — Broker RabbitMQ (Canal Principal)
Panel publica cada cambio en el estado de los eventos en el exchange central de TicketU:

* **Exchange:** `ticketu.events` (tipo *topic*, durable)
* **Tópico / Routing Key (Panel → Entradas):** `panel.evento.entradas.v1`
* **Tópico / Routing Key de retorno (Entradas → Panel cuando stock = 0):** `entradas.evento.stock.v1`
* **Parámetros de conexión del Broker:**
  * **En Docker (`plataforma-eventos-net`):** `amqp://ticketu:ticketu_dev@ticketu-rabbitmq:5672/ticketu`
  * **En Local:** `amqp://ticketu:ticketu_dev@localhost:5672/ticketu`
  * **Variable de entorno:** `BROKER_URL` y `EVENT_EXCHANGE=ticketu.events`

### B. Vía Síncrona — REST
1. **Entradas consulta a Panel (Implementado):**
   * **Endpoint:** `GET /api/v1/panel/eventos/{id_evento}`
   * **Vía Gateway:** `GET http://localhost:8080/api/organizador/v1/panel/eventos/{id_evento}`
   * **Directo a Panel en Docker:** `GET http://organizador-service:3000/api/v1/panel/eventos/{id_evento}`
   * **Autenticación requerida:** Rol `staff` u `organizador` validado por Auth.
2. **Panel consulta stock a Entradas (Propuesta pendiente de confirmación por Entradas):**
   * **Endpoint propuesto:** `GET /api/v1/entradas/eventos/{id_evento}/stock`
   * **Hostname del servicio de Entradas:** *Pendiente de entrega por el squad de Entradas*.
   * **Referencia contractual:** [`docs/CONTRATO_PANEL_ENTRADAS.md`](CONTRATO_PANEL_ENTRADAS.md).

---

## 3. API Gateway de la Plataforma TicketU

El API Gateway unifica el acceso a todos los microservicios del ecosistema bajo un mismo host:

* **Hostname en Host:** `http://localhost:8080`
* **Hostname en Docker (`plataforma-eventos-net`):** `http://ticketu-api-gateway:8080` (en `api-gateway/docker-compose.yml` el contenedor se llama `ticketu-api-gateway` y el servicio `gateway`; `api-gateway` no resuelve en el DNS de la red)
* **Enrutamiento hacia Panel Organizador:**
  * Prefijo mapeado: `/api/organizador/` → reenvía a `http://organizador-service:3000`
  * Variable de entorno requerida en el Gateway: `ORGANIZADOR_SERVICE_URL=http://organizador-service:3000`
* **Preservación de Cookies:** El proxy del Gateway está configurado para reenviar de forma transparente la cabecera `Cookie: jwt` hacia Panel y Auth.

---

## 4. Resumen de Variables de Entorno (`.env`)

```ini
# Configuración del servidor Panel
PORT=3000
MONGO_URI=mongodb://organizador-mongo:27017/panel_organizador
CORS_ORIGIN=http://localhost:5173

# Integración con Auth
AUTH_SERVICE_URL=http://auth-service:10000
AUTH_TIMEOUT_MS=1000

# Integración con Broker RabbitMQ (Entradas, Catálogo, Check-in, Notificaciones)
BROKER_URL=amqp://ticketu:ticketu_dev@ticketu-rabbitmq:5672/ticketu
EVENT_EXCHANGE=ticketu.events
TOPIC_ENTRADAS=panel.evento.entradas.v1
TOPIC_CATALOGO=panel.evento.catalogo.v1
TOPIC_NOTIFICACIONES=panel.evento.notificaciones.v1
TOPIC_CHECKIN=panel.evento.checkin.v1
TOPIC_PROMOCIONES=panel.evento.promociones.v1
```
