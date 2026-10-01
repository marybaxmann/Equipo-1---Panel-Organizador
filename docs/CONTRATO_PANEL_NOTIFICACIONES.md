# Contrato de interfaz: Panel Organizador ↔ Notificaciones

**Versión:** 1.3  
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

**Exchange:**

```text
panel.evento.notificaciones.v1
```

Panel publica dos tipos de mensaje: `evento_actualizado` y `evento_reprogramado`.

### 2.3 Mensaje `evento_actualizado`

Se publica cuando cambia el estado del evento.

| Campo | Tipo | Obligatorio | Descripción |
|---|---|:---:|---|
| `id_evento` | string | Sí | Identificador del evento modificado. |
| `id_usuario` | string | Sí | Identificador del usuario que realizó el cambio. |
| `nuevo_estado` | string | Sí | Nuevo estado del evento: `BORRADOR`, `PUBLICADO`, `FINALIZADO` o `CANCELADO`. |

```json
{
  "id_evento": "evt-001",
  "id_usuario": "usr-001",
  "nuevo_estado": "CANCELADO"
}
```

### 2.4 Mensaje `evento_reprogramado`

Se publica cuando cambia la fecha u hora del evento.

| Campo | Tipo | Obligatorio | Descripción |
|---|---|:---:|---|
| `id_evento` | string | Sí | Identificador del evento modificado. |
| `id_usuario` | string | Sí | Identificador del usuario que realizó el cambio. |
| `nuevo_estado` | string | Sí | Estado actual del evento. |
| `fecha_cambio` | timestamptz | Sí | Nueva fecha del evento. |
| `hora_cambio` | timestamptz | Sí | Nueva hora del evento. |

```json
{
  "id_evento": "evt-001",
  "id_usuario": "usr-001",
  "nuevo_estado": "PUBLICADO",
  "fecha_cambio": "2026-09-13",
  "hora_cambio": "00:00:00"
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

### 2.7 Tiempo de respuesta (SLA)

| Responsable | Compromiso |
|---|---|
| Panel Organizador | Publica el mensaje en el broker en **≤ 5 segundos** después de guardar correctamente el cambio del evento. |
| Notificaciones | El procesamiento del mensaje, el envío a los usuarios y el informe al organizador dependen de Notificaciones. |

Panel no es responsable del tiempo de envío de las notificaciones.

---

## 3. Reglas de uso (lado consumidor)

1. Notificaciones permanece suscrito a `panel.evento.notificaciones.v1`.
2. Al recibir un mensaje, identifica el evento mediante `id_evento` y obtiene los usuarios con entradas activas.
3. Genera y almacena una notificación para cada usuario afectado.
4. Envía las notificaciones, con hasta 3 intentos en caso de error.
5. Informa el resultado al organizador mediante su sistema de notificaciones.

---

## 4. Versionado y cambios

- Cualquier cambio en la estructura de los mensajes debe ser versionado y comunicado con anticipación.
- Un cambio incompatible genera un nuevo exchange (por ejemplo, `panel.evento.notificaciones.v2`).
- Los cambios incompatibles requieren un período de transición acordado entre ambos equipos.

### Historial

| Versión | Cambio |
|---|---|
| 1.0 | Propuesta inicial de Notificaciones. |
| 1.1 | Propuesta de Panel: mensaje con `tipo` y `tipo_cambio`, resultado Notificaciones → Panel pendiente. |
| 1.2 | Propuesta de Panel: incluir `id_usuario` y que el resultado se informe directamente al organizador. |
| 1.3 | Se aceptan los atributos de Notificaciones: mensajes `evento_actualizado` y `evento_reprogramado`, sin campo `tipo`; resultado informado al organizador; SLA separado por equipo. |

---

## 5. Dueños del contrato

| Rol | Equipo | Contacto |
|---|---|---|
| Dueño del contrato | Panel Organizador | Mariajosé Baxmann |
| Consumidor principal | Notificaciones | Gabriela Herrera |

