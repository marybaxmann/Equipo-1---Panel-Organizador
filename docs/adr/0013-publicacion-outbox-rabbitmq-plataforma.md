# ADR-0013 — Publicación del outbox en el RabbitMQ de la plataforma TicketU

- **Estado:** Propuesta · implementado (Sprint 3)
- **Fecha:** 2026-10-27
- **Responsables:** Backend (Joaquín). La negociación de tópicos con los otros squads es de Mariajosé, y la actualización de los contratos, de Etienne.
- **Completa a:** ADR-0003, que decidió el outbox y dejó pendientes la tecnología del broker y el publicador
- **Afecta a:** HU-07, HU-03, INT-02, TASK-01 · contratos Catálogo, Entradas, Check-in, Notificaciones y Promociones

---

## 1. Contexto

El ADR-0003 dejó dos preguntas abiertas: qué broker usa el curso y quién publica los mensajes que quedan `PENDIENTE` en `mensajes_salientes`.

El equipo de plataforma del curso publicó el backend compartido de TicketU (repo `FWizav/backendticketU`). Trae:

- un **API Gateway** (puerto 8080) que reenvía `/api/organizador/*` a este servicio;
- un **RabbitMQ** compartido por los 9 grupos;
- una red Docker común, `plataforma-eventos-net`.

Las reglas del broker son:

- un único exchange `ticketu.events` de tipo `topic`;
- el nombre del evento se usa como *routing key*;
- cada consumidor tiene **su propia cola durable**.

La tabla de nombres de evento de la plataforma (`evento.creado`, `pago.realizado`, …) es una **propuesta por validar**, no un contrato.

## 2. Decisión

1. **Broker:** el RabbitMQ de la plataforma (`BROKER_URL`), exchange `EVENT_EXCHANGE` (por defecto `ticketu.events`), declarado como `topic` y `durable`.
2. **Routing key = el tópico que ya guarda el outbox.** Hoy son `panel.evento.{catalogo,entradas,checkin,notificaciones,promociones}.v1` (variables `TOPIC_*`).
   - Un exchange `topic` acepta cualquier *routing key*, así que **no hace falta renegociar los contratos** para conectarse.
   - Si se acuerda la convención de la plataforma, se cambia el `.env`, sin tocar código.
   - Cada squad consumidor enlaza su cola a nuestra *routing key*; por ejemplo, Catálogo enlaza a `panel.evento.catalogo.v1`.
3. **Cuerpo = el `payload` exacto del contrato de cada squad.** El sobre del ADR-0003 viaja en las **propiedades AMQP**:

   | Propiedad | Valor |
   |---|---|
   | `messageId` | `_id` del documento en `mensajes_salientes`: estable, sirve para deduplicar |
   | `type` | `tipo` (`evento_creado`, `evento_publicado`, …) |
   | `appId` | `organizador-service` |
   | `timestamp` | Creación del mensaje (segundos) |
   | `contentType` | `application/json`, persistente |
   | `headers` | `{ version, tipo, id_evento, fecha_cambio }` |

4. **Publicador (`backend/src/modules/mensajeria/outbox.relay.ts`)**, en el mismo proceso que la API, que **nunca lo espera**:
   - Reserva el `PENDIENTE` más antiguo con `findOneAndUpdate` y lo pasa a `ENVIANDO`. Dos instancias nunca toman el mismo mensaje y se respeta el orden de creación.
   - Publica en un **ConfirmChannel** y espera la confirmación del broker. Si llega: `ENVIADO` + `fecha_envio`.
   - Si el broker rechaza o falla: `intentos + 1`, `ultimo_error` y vuelve a `PENDIENTE`. Con `OUTBOX_MAX_INTENTOS` (por defecto 10) queda `FALLIDO`, se conserva para revisión y no bloquea a los siguientes.
   - Si el broker está **caído**, no se toca ningún mensaje ni se gastan intentos. La espera entre vueltas crece al doble (desde `OUTBOX_POLL_MS`, por defecto 1000 ms, hasta 30 s) y se reconecta solo.
   - Al arrancar, los `ENVIANDO` que quedaron de una caída vuelven a `PENDIENTE`. La entrega es **al menos una vez**: un consumidor puede recibir un mensaje repetido y lo reconoce por `messageId`.
   - Sin `BROKER_URL`, el publicador no arranca y la API funciona igual (los mensajes se acumulan).
5. **Base de datos:** el `enum` de `mensajes_salientes.estado` suma `ENVIANDO`. El índice `{ estado, fecha_creacion }` ya existía.

## 3. Consecuencias

- HU-07 queda cubierta del lado de Panel. Falta que cada squad cree su cola y la enlace a nuestra *routing key*. Esa coordinación, y en qué sprint entra cada uno, la lleva la Scrum Master.
- El organizador nunca espera al broker. Probado de punta a punta: con RabbitMQ detenido, crear un evento responde 201 en ~20 ms; el mensaje queda `PENDIENTE` y sale solo cuando RabbitMQ vuelve.
- Los mensajes `FALLIDO` necesitan revisión manual (consulta en `mensajes_salientes`). Una cola de mensajes muertos (DLQ) queda para cuando la plataforma la defina.
- Consumir eventos de otros squads (por ejemplo, "stock agotado" de Entradas) es otro trabajo, con su propia cola `organizador.*`, y queda pendiente de que Entradas confirme el nombre del evento.

## 4. Variables de entorno

| Variable | Por defecto | Uso |
|---|---|---|
| `BROKER_URL` | — (sin ella no se publica) | `amqp://usuario:clave@host:5672/vhost`. Dentro de Docker: `ticketu-rabbitmq`, nunca `localhost` |
| `EVENT_EXCHANGE` | `ticketu.events` | Exchange compartido de la plataforma |
| `OUTBOX_POLL_MS` | `1000` | Espera entre vueltas sin errores |
| `OUTBOX_MAX_INTENTOS` | `10` | Intentos antes de marcar `FALLIDO` |
