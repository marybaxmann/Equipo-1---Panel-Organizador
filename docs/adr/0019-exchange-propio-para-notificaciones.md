# ADR-0019 — Exchange propio para Notificaciones (`panel.evento.notificaciones.v1`)

- **Estado:** Propuesta · implementado (Sprint 4)
- **Fecha:** 2026-11-18
- **Responsables:** Backend (Joaquín) · Integración (Etienne) · Contrato (Mariajosé)
- **Reemplaza en parte a:** ADR-0013, sólo para el tópico de Notificaciones
- **Afecta a:** `outbox.relay.ts`, variable `BROKER_EXCHANGES_ADICIONALES`, contrato Notificaciones v1.4 §2.2

---

## 1. Contexto

ADR-0013 y ADR-0014 dejaron un solo exchange para todos los mensajes del Panel: `ticketu.events` (topic), con una routing key por squad. El contrato con Notificaciones v1.3 §2.2, en cambio, dice «**Exchange:** `panel.evento.notificaciones.v1`», y Notificaciones armó su consumidor sobre ese exchange en el vhost `ticketu`. El 18/11 nos avisaron que no recibían nada porque el Panel publicaba en otro exchange.

## 2. Decisión

- El relay del outbox acepta una lista de exchanges adicionales por tópico (`BROKER_EXCHANGES_ADICIONALES`, `topico=exchange` separados por coma).
- Para un tópico de la lista, el mismo mensaje (cuerpo, propiedades y `message_id`) se publica en `ticketu.events` **y** en el exchange adicional, con la misma routing key. Queda `ENVIADO` sólo si el broker confirma las dos publicaciones.
- Los exchanges adicionales se declaran `topic` y durables al conectar.
- Hoy la lista es `panel.evento.notificaciones.v1=panel.evento.notificaciones.v1` (`.env.example` y `docker-compose.integracion.yml`).

Se cumple lo firmado en el contrato sin pedirle a Notificaciones que cambie su consumidor, y el resto de la plataforma sigue viendo todos los mensajes del Panel en `ticketu.events`.

## 3. Consecuencias

- Verificado con un RabbitMQ real: una cola ligada sólo a `panel.evento.notificaciones.v1` recibe `evento_actualizado` (cancelación) y `evento_reprogramado` con el cuerpo plano del contrato.
- Si Notificaciones en algún momento consume de `ticketu.events`, basta con vaciar la variable: no cambia el código.
