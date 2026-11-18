# Contrato de interfaz: Panel Organizador ↔ Notificaciones

**Versión:** 1.4  
**Proveedor:** Panel Organizador  
**Consumidor:** Notificaciones  
**Basado en:** Contrato Panel ↔ Notificaciones v1.2 (Panel) y contrato Panel ↔ Notificaciones v1.0 (Notificaciones).

---

## 1. Propósito

Definir la comunicación entre **Panel Organizador** y **Notificaciones** cuando un cambio en un evento deba ser informado a los usuarios con entradas activas.

Panel comunica el cambio del evento. Notificaciones identifica a los usuarios afectados, envía las notificaciones e informa el resultado al organizador.

---

## 2. Acuerdos confirmados

### 2.1 Responsabilidades

| Información | Responsable |
|---|---|
| Datos y estado del evento | Panel Organizador |
| Publicación del mensaje en el broker | Panel Organizador |
| Identificación de usuarios con entradas activas | Notificaciones |
| Generación y envío de notificaciones | Notificaciones |
| Resultado del envío e informe al organizador | Notificaciones |

Panel no envía listas de asistentes. Notificaciones obtiene los usuarios con entradas activas a partir del `id_evento`.

### 2.2 Comunicación

```text
Panel Organizador → Broker → Notificaciones
```

Panel publica en el RabbitMQ compartido de la plataforma TicketU:

| Parámetro | Valor |
|---|---|
| Broker | RabbitMQ de la plataforma, `ticketu-rabbitmq:5672` en la red `plataforma-eventos-net` |
| Vhost | `ticketu` |
| **Exchange** | **`panel.evento.notificaciones.v1`** (tipo `topic`, durable), el acordado en la versión 1.3 |
| Routing key | `panel.evento.notificaciones.v1` |
| Cola | Propia de Notificaciones, durable, ligada al exchange `panel.evento.notificaciones.v1` (con la routing key anterior o con `#`) |
| Cuerpo | JSON plano en UTF-8 (`content-type: application/json`), mensaje persistente |

El mismo mensaje se publica además en el exchange común de la plataforma, `ticketu.events`, con la misma routing key, igual que los mensajes para los demás squads (ADR-0013, ADR-0014). Notificaciones puede consumir de cualquiera de los dos; el acordado es `panel.evento.notificaciones.v1` ([ADR-0019](adr/0019-exchange-propio-para-notificaciones.md)).

Panel publica dos tipos de mensaje: `evento_actualizado` y `evento_reprogramado`. El tipo viaja en las propiedades AMQP del mensaje, no en el cuerpo:

| Propiedad AMQP | Valor |
|---|---|
| `type` | `evento_actualizado` o `evento_reprogramado` |
| `message_id` | Identificador único y estable del mensaje (sirve para descartar duplicados) |
| `app_id` | `organizador-service` |
| `headers` | `version` (1), `tipo`, `id_evento`, `fecha_cambio` (fecha y hora ISO 8601 del cambio) |

Si Notificaciones prefiere leer el tipo dentro del cuerpo, Panel puede enviar `{ "envelope": { "tipo", "id_evento", "version", "fecha_cambio", ... }, "payload": { ... } }`, igual que a Entradas (ADR-0017). Se activa por configuración, sin cambios de código, y se acuerda antes de usarlo.

### 2.3 Mensaje `evento_actualizado`

Se publica cuando el evento pasa a **`CANCELADO`**. Hoy eso ocurre cuando el organizador elimina un evento publicado que ya tiene entradas vendidas (HU-03, ADR-0016).

No se publica al crear ni al publicar un evento: en ese momento no hay compradores a quienes avisar (acuerdo con Notificaciones del 24/10). Tampoco al eliminar un evento sin ventas.

| Campo | Tipo | Obligatorio | Descripción |
|---|---|:---:|---|
| `id_evento` | string | Sí | Identificador del evento modificado. |
| `id_usuario` | string | Sí | Identificador del usuario que realizó el cambio. |
| `nuevo_estado` | string | Sí | Nuevo estado del evento. Hoy siempre `CANCELADO`. |

```json
{
  "id_evento": "evt-001",
  "id_usuario": "usr-001",
  "nuevo_estado": "CANCELADO"
}
```

### 2.4 Mensaje `evento_reprogramado`

Se publica cuando un evento **`PUBLICADO`** cambia su fecha, su hora de inicio o su hora de término.

| Campo | Tipo | Obligatorio | Descripción |
|---|---|:---:|---|
| `id_evento` | string | Sí | Identificador del evento modificado. |
| `id_usuario` | string | Sí | Identificador del usuario que realizó el cambio. |
| `nuevo_estado` | string | Sí | Estado actual del evento. |
| `fecha_cambio` | string `YYYY-MM-DD` | Sí | Nueva fecha del evento. |
| `hora_cambio` | string `HH:MM:SS` | Sí | Nueva hora de inicio del evento (los segundos siempre son `00`). |

```json
{
  "id_evento": "evt-001",
  "id_usuario": "usr-001",
  "nuevo_estado": "PUBLICADO",
  "fecha_cambio": "2026-12-13",
  "hora_cambio": "20:00:00"
}
```

> **Nota:** en este mensaje, `fecha_cambio` y `hora_cambio` corresponden a la **nueva fecha y hora del evento**. Equivalen a `fecha_evento` y `hora_evento` en los demás contratos de Panel.

Los estados se envían en **mayúsculas**, igual que en el resto de los contratos de Panel.

### 2.5 Resultado del envío

Notificaciones informa el resultado **directamente al organizador**, mediante su propio sistema de notificaciones. No existe comunicación Notificaciones → Panel.

Campos utilizados por Notificaciones para el resultado:

| Campo | Tipo | Descripción |
|---|---|---|
| `id_evento` | string | Evento afectado. |
| `id_usuario` | string | Usuario que realizó el cambio. |
| `nuevo_estado` | string | Resultado del envío: `exitoso` o `error`. |
| `usuarios_notificados` | integer | Usuarios notificados correctamente. |
| `usuarios_faltantes` | integer | Usuarios que no pudieron ser notificados. |
| `fecha_envio` | timestamptz | Fecha y hora de finalización del envío. |

Ejemplo de notificación al organizador:

```text
Evento actualizado
El estado del evento ha sido actualizado correctamente.
Usuarios notificados: 150
Usuarios no notificados: 0
Fecha de envío: 1 de octubre de 2026, 13:30
```

### 2.6 Errores y reintentos

Al ser comunicación asíncrona, no se utilizan códigos HTTP.

Los errores de procesamiento o envío son registrados por Notificaciones, con **hasta 3 intentos** antes de registrar el error.

Del lado de Panel, cada mensaje se guarda primero en su outbox (`mensajes_salientes`) y se reintenta si el broker no está disponible, así que no se pierde. Por lo mismo, un mensaje puede llegar más de una vez: Notificaciones debe descartar los repetidos usando `message_id`.

### 2.7 Tiempo de respuesta (SLA)

| Responsable | Compromiso |
|---|---|
| Panel Organizador | Publica el mensaje en el broker en **≤ 5 segundos** después de guardar correctamente el cambio del evento. |
| Notificaciones | El procesamiento del mensaje, el envío a los usuarios y el informe al organizador dependen de Notificaciones. |

Panel no es responsable del tiempo de envío de las notificaciones.

---

## 3. Reglas de uso (lado consumidor)

1. Notificaciones declara su propia cola durable en el vhost `ticketu`, la liga al exchange `panel.evento.notificaciones.v1` y permanece suscrita a ella.
2. Distingue el tipo de mensaje con la propiedad AMQP `type` (o el header `tipo`) y descarta los mensajes repetidos por su `message_id`.
3. Al recibir un mensaje, identifica el evento mediante `id_evento` y obtiene los usuarios con entradas activas.
4. Genera y almacena una notificación para cada usuario afectado.
5. Envía las notificaciones, con hasta 3 intentos en caso de error.
6. Informa el resultado al organizador mediante su sistema de notificaciones.

---

## 4. Versionado y cambios

- Cualquier cambio en la estructura de los mensajes debe ser versionado y comunicado con anticipación.
- Un cambio incompatible genera un nuevo exchange y una nueva routing key (por ejemplo, `panel.evento.notificaciones.v2`).
- Los cambios incompatibles requieren un período de transición acordado entre ambos equipos.

### Historial

| Versión | Cambio |
|---|---|
| 1.0 | Propuesta inicial de Notificaciones. |
| 1.1 | Propuesta de Panel: mensaje con `tipo` y `tipo_cambio`, resultado Notificaciones → Panel pendiente. |
| 1.2 | Propuesta de Panel: incluir `id_usuario` y que el resultado se informe directamente al organizador. |
| 1.3 | Se aceptan los atributos de Notificaciones: mensajes `evento_actualizado` y `evento_reprogramado`, sin campo `tipo`; resultado informado al organizador; SLA separado por equipo. |
| 1.4 | Precisión (18/11/2026): Panel publica en el exchange acordado `panel.evento.notificaciones.v1` (topic, vhost `ticketu`) y además en `ticketu.events`, con la misma routing key (ADR-0019). Se documentan las propiedades AMQP (`type`, `message_id`, headers), cuándo se publica cada mensaje y el formato de `fecha_cambio` y `hora_cambio`. Los campos del cuerpo no cambian. |

---

## 5. Dueños del contrato

| Rol | Equipo | Contacto |
|---|---|---|
| Dueño del contrato | Panel Organizador | Mariajosé Baxmann |
| Consumidor principal | Notificaciones | Gabriela Herrera |

