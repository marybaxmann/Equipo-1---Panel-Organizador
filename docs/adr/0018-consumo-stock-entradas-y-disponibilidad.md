# ADR-0018 — Consumo del aviso de stock de Entradas (`entradas.evento.stock.v1`) y disponibilidad AGOTADO

- **Estado:** Propuesta · implementado (Sprint 4)
- **Fecha:** 2026-11-17
- **Responsables:** Integración (Etienne) · Backend (Joaquín) · Base de Datos (Christopher)
- **Afecta a:** `backend/src/modules/mensajeria/stock.consumer.ts`, `evento.notifier.ts`, `evento.mapper.ts`, `database/schema/01-eventos.json`, contrato Entradas §3.4, contrato Catálogo §3.1

---

## 1. Contexto

Hasta ahora el Panel sólo **publicaba** en el broker. Pero el contrato con Entradas (§3.4) define un dato que el Panel **recibe**: cuando el stock de un evento llega a 0, Entradas lo avisa por `entradas.evento.stock.v1` y el Panel debe marcar el evento como `AGOTADO` y comunicarlo a quien consume la disponibilidad (Catálogo, contrato Catálogo §3.1). Según la minuta del 28/10, Entradas ya publica ese aviso.

El mapper calculaba `estado_disponibilidad` sólo como `PASADO` o `DISPONIBLE`: el valor `AGOTADO` del contrato con Catálogo nunca salía.

## 2. Opciones consideradas

1. **Consultar el stock a Entradas en cada GET de Catálogo.** Descartada: suma la latencia de Entradas al SLA de Catálogo (< 500 ms) y hace caer el catálogo si Entradas no responde.
2. **Guardar el stock en el Panel.** Descartada: el stock es de Entradas (ADR-0007) y el validador de `eventos` lo prohíbe.
3. **Escuchar el aviso y guardar sólo la disponibilidad (elegida).**

## 3. Decisión

- El Panel declara una **cola durable propia**, `panel-organizador.entradas.stock` (`BROKER_COLA_STOCK`), enlazada al exchange `ticketu.events` con la routing key `entradas.evento.stock.v1` (`TOPIC_STOCK_ENTRADAS`). Arranca junto al relay del outbox sólo si hay `BROKER_URL`, y reconecta solo si el broker se cae.
- Cuerpo aceptado: el sobre estándar de TicketU con que Entradas publica (`{ eventId, eventName, occurredAt, source, data }`, `publish_event` de su `broker_service.py`), donde `data` es `{ "id_evento": "...", "stock": 0 }`. También el cuerpo plano del contrato y `{ envelope, payload }` (ADR-0017).
- Nuevo campo opcional `eventos.estado_disponibilidad` con valores `DISPONIBLE | AGOTADO`. Si falta, vale `DISPONIBLE`. `PASADO` no se guarda: se sigue calculando por fecha y tiene prioridad.

| Aviso de Entradas | Qué hace el Panel |
|---|---|
| `stock = 0` y el evento no estaba AGOTADO | Lo marca `AGOTADO` (sin tocar `estado_gestion`). Si está PUBLICADO, deja `evento_actualizado` para Catálogo en el outbox |
| `stock > 0` y el evento estaba AGOTADO | Vuelve a `DISPONIBLE` y avisa a Catálogo (por ejemplo, tras una devolución). El contrato sólo exige el 0, pero así el Panel no deja un evento agotado que ya no lo está |
| Mismo valor que ya tenía | Nada (idempotente: un mensaje repetido no genera otro aviso) |
| Evento que el Panel no tiene | ACK y log |
| Cuerpo inválido | Se descarta con log (reintentarlo no lo arregla) |
| Error al guardar (BD caída) | Hasta 3 reintentos con la cabecera `x-reintentos` (ADR-0014); después, se descarta con log |

- ACK **después** de guardar. `prefetch(1)`.
- Sólo Catálogo recibe el cambio de disponibilidad. Notificaciones preguntó si le sirve "agotado" (minuta 24/10), pero ese dato lo publica Entradas directamente; no se agrega al contrato de Notificaciones.

## 4. Lo que NO decide

- El nombre de la cola, si la plataforma define una convención (se cambia por variable de entorno).
- Si Entradas debe avisar también cuando el stock vuelve a subir: el Panel lo soporta, pero el contrato no lo exige.
- El aviso `stock.agotado` que la minuta menciona como otra clave de Entradas: el contrato nombra `entradas.evento.stock.v1` y es la única que se escucha.

## 5. Consecuencias

- `estado_disponibilidad` llega a Catálogo con los tres valores del contrato, por REST (`/organizador/eventos/*`) y por broker (`panel.evento.catalogo.v1`).
- Para verificar la integración: publicar `{ "id_evento": "<id>", "stock": 0 }` en `ticketu.events` con la routing key `entradas.evento.stock.v1` desde la consola de RabbitMQ, y comprobar que `GET /api/v1/organizador/eventos/<id>` responde `AGOTADO` y que en `mensajes_salientes` aparece `evento_actualizado` para Catálogo.

## 6. Cómo se revierte

No arrancar el consumidor (o quitar la cola) y borrar el campo del validador. Los eventos vuelven a mostrarse `DISPONIBLE` o `PASADO`, como antes.
