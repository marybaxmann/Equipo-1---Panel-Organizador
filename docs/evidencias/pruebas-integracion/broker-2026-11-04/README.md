# Evidencia: Publicación de Panel Organizador en RabbitMQ (Integración I1)

- **Fecha de ejecución:** 04/11/2026, entre 00:14 y 00:17 (hora de Chile, UTC-3)
- **Repositorio y versión:** `main` @ `6ba020b`
- **Ejecutado por:** Joaquín Martínez (Backend) en entorno local de pruebas
- **Componente evaluado:** Componente emisor de la integración asíncrona I1 (Panel Organizador → RabbitMQ)

---

## 1. Arquitectura y Componentes de la Prueba

| Componente | Configuración | Rol en la prueba |
|---|---|---|
| **MongoDB 7 y Auth simulado** | `mongo:7`, `tools/mock-auth` en puerto 4001 | Base de datos interna del Panel y autenticación de desarrollo |
| **RabbitMQ** | `rabbitmq:3.13-management-alpine` con credenciales de plataforma (`ticketu:ticketu_dev`, vhost `ticketu`) en red `plataforma-eventos-net` | Broker de mensajería configurado idéntico al repo compartido `FWizav/backendticketU` |
| **API del Panel Organizador** | `backend` con `BROKER_URL=amqp://ticketu:ticketu_dev@localhost:5672/ticketu` y `EVENT_EXCHANGE=ticketu.events` | Emisor de eventos mediante Outbox Relay (ADR-0013) |
| **Consumidor de verificación** | Cola de prueba `demo.panel.entradas` enlazada a `ticketu.events` con routing key `panel.evento.entradas.v1` | **Simulación de consumidor.** Verifica la recepción efectiva en el broker |

---

## 2. Escenarios Comprobados

1. **Vaciado de mensajes pendientes al iniciar:**
   * Al establecerse la conexión con el broker, el Outbox Relay identificó los mensajes acumulados en estado `PENDIENTE` y los despachó inmediatamente, marcándolos en `ENVIADO`.
2. **Ciclo de vida exitoso (Creación y Publicación):**
   * Se creó y publicó el evento `6aeaa3798d062fe094096cce` (*"Demo broker Evaluación 2"*).
   * Sus 6 mensajes asociados pasaron de `PENDIENTE` a `ENVIADO` en menos de 1 segundo.
   * Los mensajes destinados a Entradas llegaron a la cola con todas las propiedades AMQP requeridas por ADR-0013: `app_id: "organizador-service"`, `message_id`, `type` y cabeceras (`id_evento`, `tipo`, `version`, `fecha_cambio`).
3. **Resiliencia ante caída del Broker (Tolerancia a fallos):**
   * Con RabbitMQ detenido forzosamente, se intentó la creación del evento `6aeaa38b8d062fe094096cd7`.
   * **Comportamiento desacoplado:** La API respondió HTTP 201 en 29 ms sin bloquear al cliente.
   * El mensaje quedó registrado en la colección `mensajes_salientes` como `PENDIENTE` y el log registró `broker no disponible: read ECONNRESET`.
   * Tras reiniciar RabbitMQ, el Outbox Relay reconectó automáticamente y entregó el mensaje 8 segundos después, completando el estado `ENVIADO` con **cero pérdida de datos**.

**Resultado consolidado:** 17 de 17 mensajes en estado `ENVIADO`.

---

## 3. Registro de Archivos de Evidencia

| Archivo | Contenido |
|---|---|
| [`mensajes_salientes.json`](mensajes_salientes.json) | Colección completa de outbox: tópico, tipo, estado (`ENVIADO`), intentos, `fecha_creacion` y `fecha_envio`. |
| [`cambios_estado_evento.json`](cambios_estado_evento.json) | Registro de auditoría de transiciones (`BORRADOR` → `PUBLICADO`) de los eventos de prueba. |
| [`cola-demo.panel.entradas.json`](cola-demo.panel.entradas.json) | Inspección de mensajes en la cola: routing key, propiedades de sobre AMQP y payload JSON. |
| [`exchange-ticketu.events.json`](exchange-ticketu.events.json) | Configuración del exchange en RabbitMQ: tipo `topic`, durable, vhost `ticketu`. |
| [`api-outbox.log`](api-outbox.log) | Trazabilidad del log de backend: ciclo de vida de conexión, envíos, captura del error `ECONNRESET` y reconexión exitosa. |

---

## 4. Alcance y Limitaciones de esta Evidencia

* **Consumidor:** Esta prueba valida el **100% del componente emisor de Panel Organizador y la persistencia en RabbitMQ**. El receptor fue una cola de prueba (`demo.panel.entradas`) y no el servicio consumidor real de Entradas.
* **Autenticación:** Se utilizó el mock local de Auth (`tools/mock-auth`).
* **Tránsito de red:** La invocación no pasó a través del API Gateway de la plataforma (fue conexión directa al broker).
