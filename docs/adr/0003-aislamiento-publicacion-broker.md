# ADR-0003 — Aislamiento de la publicación al broker (patrón outbox)

- **Estado:** Aceptada. **Outbox implementado en el Sprint 2** (INT-02, 20/10). El broker (RabbitMQ de la plataforma) y el publicador se deciden e implementan en el **ADR-0013** (Sprint 3)
- **Fecha:** 2026-09-30
- **Responsables:** Backend (Joaquín) · Integración (Etienne) para el acuerdo con los otros squads
- **Afecta a:** HU-02, HU-03, HU-04, HU-07 · contratos Catálogo, Notificaciones, Entradas, Check-in

---

## 1. Contexto

HU-07 exige que, ante cualquier cambio de estado, Panel emita un mensaje con `id_evento`, `nuevo_estado` y `fecha_cambio`:
- **de forma asíncrona**, sin bloquear la respuesta al organizador;
- y que, **si el destino no está disponible, el fallo se registre para reintento** y el mensaje no se pierda.

Los cinco contratos de broker siguen con el tópico **pendiente de acuerdo** (`panel.evento.catalogo.v1`,
`panel.evento.notificaciones.v1`, etc. son propuestas de Panel). Tampoco está definida la tecnología del broker.

Mientras tanto, en el Sprint 1 los consumidores leen el estado por REST (ver ADR-0007) y cada transición queda
registrada en `cambios_estado_evento`.

## 2. Opciones consideradas

| Opción | A favor | En contra |
|---|---|---|
| **A. Publicar directo al broker dentro del request** | Simple | Si el broker cae, o se bloquea al organizador o se pierde el mensaje: incumple HU-07 |
| **B. Publicar después de responder (fire-and-forget)** | No bloquea | Si el proceso cae entre la escritura y la publicación, el mensaje se pierde |
| **C. Outbox: guardar el mensaje en la BD junto con el cambio y publicarlo desde un proceso aparte** | No bloquea, no se pierde, permite reintentos con backoff; el tópico queda como configuración | Una colección y un proceso más |

## 3. Decisión propuesta

**Opción C.**
- Cada transición de estado escribe, además de `cambios_estado_evento`, un documento en la colección nueva
  **`mensajes_salientes`**: `_id`, `id_evento` (FK), `topico`, `payload`, `estado` (`PENDIENTE` | `ENVIADO` | `FALLIDO`), `intentos`,
  `ultimo_error`, `fecha_creacion` y `fecha_envio`, con un índice `{estado, fecha_creacion}`.
- Un publicador (`backend/src/modules/mensajeria/`) toma los `PENDIENTE`, publica y marca `ENVIADO`. Si falla, incrementa `intentos` y reintenta con backoff.
- El código de dominio sólo conoce una interfaz `EventPublisher`. La tecnología del broker y los nombres de tópico son **configuración**.

## 4. Lo que este ADR NO decide

| Tema | Quién decide |
|---|---|
| Tecnología de broker (RabbitMQ, Kafka, otra) | Todos los squads / cátedra |
| Nombres definitivos de tópicos y política de ACK | Etienne con cada squad consumidor (plazo sugerido: 15/10) |
| Formato AsyncAPI de los mensajes | `docs/api/asyncapi.yaml`, a crear en Sprint 3 |

## 5. Consecuencias

- El Sprint 2 puede implementar HU-02 y HU-04 **sin esperar el broker**: basta con escribir en el outbox.
- La nueva colección exige ampliar ADR-0002: schema JSON, diccionario regenerado y tests.
- Los consumidores pueden seguir usando REST como respaldo o para reconciliar datos.

## 6. Implementación (Sprint 2, INT-02)

- `backend/src/modules/mensajeria/`: interfaz `EventPublisher` (`publish(topic, message)`), `OutboxEventPublisher` (escribe en
  `mensajes_salientes` con `estado: PENDIENTE`) e `InMemoryEventPublisher` (tests y desarrollo).
- Los tópicos salen de `TOPIC_CATALOGO`, `TOPIC_ENTRADAS`, `TOPIC_NOTIFICACIONES`, `TOPIC_CHECKIN` y `TOPIC_PROMOCIONES` (`.env.example`).
  Por defecto son las propuestas `panel.evento.*.v1`.
- **Sobre:** `{ version, tipo, fecha_cambio, id_evento }` se guarda aparte del cuerpo y viajará como cabecera del mensaje. Así el
  cuerpo es exactamente el de cada contrato (en `evento_reprogramado`, `fecha_cambio` es la nueva fecha del evento, Notificaciones §2.4).
- **Quién recibe qué** (`evento.notifier.ts`):

| Cambio | Entradas | Catálogo | Check-in | Notificaciones | Promociones |
|---|---|---|---|---|---|
| Crear (BORRADOR) | `evento_creado` | — | — | — | — |
| Publicar | `evento_publicado` | `evento_publicado` | `PUBLICADO` | `evento_actualizado` | `evento_publicado` |
| Editar un BORRADOR | `evento_actualizado` | — | — | — | — |
| Editar un PUBLICADO | `evento_actualizado` | `evento_actualizado` | `ACTUALIZADO` si cambian nombre, dirección, fecha u horario | `evento_reprogramado` si cambian fecha u horario | — |

- Una edición que no cambia ningún valor no genera mensajes.
- Mongo standalone no tiene transacciones: el mensaje se escribe **después** de guardar el evento. Si la escritura falla, se reintenta
  una vez y, si vuelve a fallar, el mensaje completo queda en el log (`[mensajeria] FALLO …`) para reenviarlo; la operación del
  organizador no se revierte (HU-07).
- Falta (Sprint 3): el proceso que toma los `PENDIENTE`, publica, marca `ENVIADO` y reintenta con backoff.

## 7. Cómo se revierte

Si el curso define que no habrá broker, se elimina el publicador. Los consumidores quedan con REST
(`/cambios-estado` para Notificaciones, ya implementado) y `mensajes_salientes` queda como bitácora de auditoría.
