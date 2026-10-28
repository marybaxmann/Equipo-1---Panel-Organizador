# ADR-0014 — Política de consumo del broker y responsabilidades de la plataforma

- **Estado:** Propuesta · Sprint 3
- **Fecha:** 2026-10-27
- **Responsables:** Integración (Etienne) · Negociación (Mariajosé) · Backend (Joaquín)
- **Completa a:** ADR-0003 (aislamiento outbox) y ADR-0013 (publicación en RabbitMQ de TicketU)
- **Afecta a:** HU-07, TASK-01, TASK-02 · contratos bilaterales con Catálogo, Entradas, Check-in, Notificaciones y Promociones

---

## 1. Contexto

El ADR-0013 resolvió la publicación asíncrona desde Panel Organizador hacia el exchange `ticketu.events` de RabbitMQ usando el patrón outbox relay. Para completar la interoperabilidad del Sprint 3 entre Panel y los 5 squads consumidores (Catálogo, Entradas, Check-in, Notificaciones y Promociones), se requiere formalizar:

1. La **política de consumo recomendada** para los squads que reciben eventos de Panel (manejo de confirmaciones ACK, resiliencia ante caídas y prevención de pérdidas).
2. La delimitación clara de **responsabilidades entre la plataforma TicketU y el microservicio de Panel Organizador**.
3. El comportamiento real de persistencia en la base de datos (MongoDB standalone sin transacciones ACID distribuidas).
4. Los aspectos técnicos que continúan pendientes de acuerdo bilateral o de definición por la cátedra.

## 2. Opciones consideradas para la política de consumo

| Opción | A favor | En contra |
|---|---|---|
| **A. Panel gestiona colas y reintentos de los consumidores** | Centraliza la configuración en Panel | Rompe el principio de desacoplamiento de microservicios; Panel no debe conocer la topología interna ni el estado de las colas de otros squads |
| **B. Cada squad consumidor declara su cola durable y define su consumo (Adoptada como propuesta)** | Máximo desacoplamiento; RabbitMQ permite múltiples consumidores independientes sobre un exchange `topic`; cada squad escala y se recupera a su propio ritmo | Requiere acordar recomendaciones de ACK e idempotencia en los contratos bilaterales |

## 3. Decisión propuesta

### 3.1 Política de consumo recomendada a los squads consumidores (Propuesta de Panel)
Panel propone a los squads consumidores las siguientes directrices de resiliencia:

1. **Declaración de cola propia:** Cada squad consumidor debe crear y gestionar su propia cola **durable** en el RabbitMQ de la plataforma y enlazarla (*bind*) al exchange `ticketu.events` con la routing key que le corresponda:
   - Catálogo: `panel.evento.catalogo.v1`
   - Entradas: `panel.evento.entradas.v1`
   - Check-in: `panel.evento.checkin.v1`
   - Notificaciones: `panel.evento.notificaciones.v1`
   - Promociones: `panel.evento.promociones.v1`
2. **Procesamiento e Idempotencia:** La entrega en RabbitMQ es *at-least-once* (al menos una vez). Los consumidores deben deduplicar mensajes utilizando la propiedad estándar AMQP `messageId` (que contiene el `_id` inmutable de `mensajes_salientes`) o el campo `fecha_cambio` (ISO 8601) de las cabeceras AMQP.
3. **Confirmación manual (ACK):** Se recomienda a cada consumidor emitir `basicAck` **únicamente después** de haber procesado y persistido con éxito el evento en su propia base de datos. Si el servicio consumidor cae durante el procesamiento, el mensaje permanecerá seguro en el broker para cuando se reinicie.
4. **Reintentos y descarte (Propuesta):**
   - Ante errores transitorios (ej. timeout de BD local), se sugiere aplicar reintentos locales con backoff exponencial (hasta 3 intentos recomendados).
   - Ante errores irrecuperables o datos malformados, es responsabilidad de cada squad consumidor decidir si reenvía a una cola de mensajes no procesables (Dead Letter Queue - DLQ) propia o descarta con log de auditoría, para evitar bloquear el procesamiento de la cola.

### 3.2 Persistencia en Base de Datos (Mongo Standalone)
Tal como se definió en el ADR-0003, MongoDB standalone no posee transacciones atómicas distribuidas:
- El documento en la colección `mensajes_salientes` se escribe **inmediatamente después** de guardar el evento en la colección `eventos`.
- Si la escritura del mensaje en `mensajes_salientes` fallase, el sistema reintenta una vez y, si vuelve a fallar, el mensaje completo se imprime en el log (`[mensajeria] FALLO`) para posibilitar su reenvío manual. La operación principal del organizador no se revierte (fail-safe en favor de la disponibilidad del organizador, conforme a HU-07).

### 3.3 Delimitación de responsabilidades de Infraestructura y Despliegue
- **Cátedra / Equipo de Plataforma TicketU (`FWizav/backendticketU`):**
  - Provisión y mantenimiento del broker RabbitMQ compartido (`ticketu-rabbitmq:5672` sobre AMQP y `15672` para management) en la red compartida `plataforma-eventos-net`.
  - Creación del exchange común `ticketu.events` (tipo `topic`, `durable: true`).
  - Provisión y mantenimiento del API Gateway en `http://localhost:8080`, el cual reenvía peticiones bajo `/api/organizador/*` hacia `organizador-service:3000` preservando headers y cookies de sesión (`Cookie: jwt`).
- **Panel Organizador:**
  - Desplegar su contenedor conectado a la red `plataforma-eventos-net`.
  - Conectar el outbox relay a `BROKER_URL` y publicar en `ticketu.events` usando ConfirmChannel.
  - Exponer endpoints REST en `/api/v1` y `/api/organizador/v1` como canal síncrono y de respaldo.
- **Squads Consumidores:**
  - Declarar sus propias colas durables, enlazarlas con su routing key y gestionar su consumo de forma autónoma.

## 4. Lo que este ADR NO decide (Pendientes abiertos)

| Tema | Estado / Pendiente | Responsable |
|---|---|---|
| Dead Letter Exchange (DLX) central | Pendiente de que la cátedra/plataforma defina si existirá un exchange DLX común para toda la plataforma o si cada squad implementa el suyo propio | Cátedra / Plataforma |
| Política interna definitiva de reintentos | Los 3 reintentos y uso de DLQ son una **propuesta** de Panel; cada squad define soberanamente su política interna de consumo | Cada squad consumidor |
| Consumo de eventos de otros squads en Panel | El consumo de eventos de stock emitidos por Entradas (`entradas.evento.stock.v1`) se implementará en un ADR posterior una vez que Entradas estabilice su publicación (Sprint 3 / Sprint 4) | Backend (Joaquín) · Integración (Etienne) |
| Cronograma de integración conjunta | Cada squad posee hitos dispares (ej. Entradas entrega broker el 05/11 e integración E2E el 25/11) | Mariajosé con Scrum Masters |

## 5. Consecuencias

- Desacoplamiento arquitectural completo: Panel no asume responsabilidades sobre colas ni caídas de los consumidores.
- Contratos claros: los squads consumidores disponen de una guía técnica homogénea para conectarse al exchange `ticketu.events`.
- Idempotencia garantizada mediante propiedades nativas AMQP (`messageId` y `headers`).

## 6. Cómo se revierte

Si algún squad consumidor decide no utilizar RabbitMQ o presenta problemas con el broker, puede recurrir al canal REST de respaldo de Panel (`GET /api/organizador/v1/...`) para rehidratar o reconciliar sus datos maestros.
