# Contrato de interfaz: Panel Organizador ↔ Notificaciones

**Versión:** 1.1  
**Proveedor:** Panel Organizador  
**Consumidor:** Notificaciones

---

## 1. Propósito

Definir la comunicación entre **Panel Organizador** y **Notificaciones** cuando una modificación relevante de un evento deba ser informada a los usuarios afectados.

Panel comunica el cambio del evento. Notificaciones identifica a los usuarios correspondientes y gestiona el envío de las notificaciones.

---

## 2. Acuerdos confirmados

### 2.1 Responsabilidades

| Información | Responsable |
|---|---|
| Datos y estado de gestión del evento | Panel Organizador |
| Identificación de usuarios afectados | Notificaciones |
| Generación y envío de notificaciones | Notificaciones |
| Resultado del proceso de envío | Notificaciones |

Panel no envía listas de asistentes. Notificaciones obtiene los usuarios que poseen entradas activas a partir del `id_evento`.

### 2.2 Comunicación

Ambos equipos contemplan comunicación asíncrona mediante broker:

```text
Panel Organizador → Broker → Notificaciones
```

Panel envía:

| Campo | Tipo | Descripción |
|---|---|---|
| `tipo` | string | Tipo de mensaje. Actualmente `evento_actualizado`. |
| `id_evento` | string | Identificador del evento afectado. |
| `nuevo_estado` | string | Estado de gestión actual del evento. |
| `fecha_cambio` | datetime | Fecha y hora en que ocurrió el cambio. |

---

## 3. Propuestas de Panel pendientes de confirmación

### 3.1 Mensaje Panel → Notificaciones

**Panel propone** utilizar:

```text
panel.evento.notificaciones.v1
```

Mensaje:

```json
{
  "tipo": "evento_actualizado",
  "id_evento": "evt-001",
  "nuevo_estado": "CANCELADO",
  "fecha_cambio": "2026-09-13T20:00:00"
}
```

Panel mantiene como estados de gestión:

```text
BORRADOR
PUBLICADO
FINALIZADO
CANCELADO
```

**Pendiente de confirmación:**

- tópico `panel.evento.notificaciones.v1`;
- necesidad del campo `tipo`.

---

### 3.2 Reprogramación

Notificaciones propone `REPROGRAMADO`.

**Panel propone:** tratar `REPROGRAMADO` como un **tipo de cambio del evento**, no como un nuevo valor de `estado_gestion`.

El evento puede continuar, por ejemplo:

```text
estado_gestion = PUBLICADO
```

aunque haya sido reprogramado.

Cuando ocurra una reprogramación, Panel propone enviar:

```json
{
  "tipo": "evento_actualizado",
  "id_evento": "evt-001",
  "tipo_cambio": "REPROGRAMADO",
  "nuevo_estado": "PUBLICADO",
  "fecha_evento": "2026-10-20",
  "hora_evento": "21:00",
  "fecha_cambio": "2026-09-13T20:00:00"
}
```

Donde:

| Campo | Uso |
|---|---|
| `tipo_cambio` | Indica que el evento fue reprogramado. |
| `fecha_evento` | Nueva fecha del evento. |
| `hora_evento` | Nueva hora del evento. |

**Pendiente de confirmación por Notificaciones:** aceptar esta interpretación y los datos propuestos para una reprogramación.

---

### 3.3 Resultado Notificaciones → Panel

Notificaciones propone informar posteriormente el resultado del envío.

**Panel propone:**

```json
{
  "id_evento": "evt-001",
  "estado_envio": "EXITOSO",
  "usuarios_notificados": 155,
  "usuarios_faltantes": 0,
  "fecha_envio": "2026-09-13T20:05:00",
  "mensaje": "Envío realizado correctamente"
}
```

| Campo | Tipo | Descripción |
|---|---|---|
| `id_evento` | string | Evento asociado al resultado. |
| `estado_envio` | string | Resultado general: `EXITOSO` o `ERROR`. |
| `usuarios_notificados` | integer | Usuarios notificados correctamente. |
| `usuarios_faltantes` | integer | Usuarios que no pudieron ser notificados. |
| `fecha_envio` | datetime | Finalización del proceso. |
| `mensaje` | string | Información adicional. |

No se utiliza `PARCIAL`, ya que cualquier envío incompleto puede identificarse mediante `usuarios_faltantes`.

**Pendiente de confirmación:** definir si esta comunicación se enviará a Panel y mediante qué mecanismo o tópico.

---
