# Contrato de interfaz: Panel Organizador ↔ Entradas / Inventario

**Versión:** 1.2
**Proveedor:** Panel Organizador
**Consumidor:** Entradas / Inventario

## 1. Propósito

Definir la comunicación entre **Panel Organizador** y **Entradas / Inventario** para mantener sincronizada la información de los eventos y permitir que Entradas valide el estado actual de un evento.

El **Panel Organizador es la fuente de verdad de la información y estado del evento**.

Entradas / Inventario es responsable de la gestión de entradas, inventario, reservas, ventas y emisiones.

---

## 2. Sincronización de información del evento

### 2.1 Panel → Entradas: notificación Push

Se acuerda utilizar una comunicación **Push** para notificar a Entradas los cambios realizados sobre un evento.

La notificación se enviará cuando ocurra alguno de los siguientes cambios:

* Creación de un evento.
* Edición de un evento.
* Publicación de un evento.
* Cancelación de un evento.
* Eliminación de un evento.

El mecanismo de transporte propuesto por Panel es utilizar un **broker de mensajes**, de forma que:

```text
Panel Organizador → Broker → Entradas / Inventario
```

Panel publicará la notificación después de guardar correctamente el cambio del evento.

### Campos propuestos para el mensaje

| Campo               | Tipo    | Obligatorio |
| ------------------- | ------- | ----------- |
| `id_evento`         | string  | Sí          |
| `id_usuario`        | string  | Sí          |
| `nombre_evento`     | string  | Sí          |
| `fecha_evento`      | string  | Sí          |
| `hora_evento`       | string  | Sí          |
| `cantidad_entradas` | integer | Sí          |
| `tipo_entrada`      | string  | Sí          |
| `estado_evento`     | string  | Sí          |

**Propuesta de tópico:** `panel.eventos.v1`

### Pendiente de confirmación por Entradas

* Aceptación del uso del broker como mecanismo de Push.
* Confirmación del tópico `panel.eventos.v1`.
* Confirmación de los campos necesarios para el mensaje.
* Confirmación del mapeo interno de los datos recibidos.

> El uso de Push como mecanismo principal de sincronización está acordado. Lo pendiente corresponde a su implementación concreta mediante broker, tópico y estructura definitiva del mensaje.

---

## 2.2 Entradas → Panel: consulta Pull

Panel acepta el siguiente endpoint para que Entradas pueda consultar la información actual de un evento:

```http
GET /api/v1/panel/eventos/{id_evento}
```

Esta consulta funcionará como mecanismo de **validación, respaldo y recuperación** cuando Entradas necesite comprobar la información del evento o recuperar datos después de una posible desincronización.

La comunicación principal seguirá siendo:

```text
Panel → Broker → Entradas
```

mientras que la consulta Pull funcionará como respaldo:

```text
Entradas → GET → Panel
```

### Parámetro

| Parámetro   | Tipo   | Obligatorio |
| ----------- | ------ | ----------- |
| `id_evento` | string | Sí          |

### Datos del evento

La información entregada por Panel deberá permitir a Entradas validar, como mínimo:

* `id_usuario`
* `nombre_evento`
* `fecha_evento`
* `hora_evento`
* `cantidad_entradas`
* `tipo_entrada`
* `estado_evento`

### Respuestas de error

| Código | Descripción             |
| ------ | ----------------------- |
| `400`  | ID de evento inválido   |
| `404`  | Evento no encontrado    |
| `500`  | Error interno del Panel |

### SLA

La respuesta del endpoint deberá ser inferior a **300 ms**.

### Comportamiento de Entradas

Como consumidor del endpoint:

* Ante un `404`, Entradas deberá considerar que el evento fue eliminado o no fue creado correctamente y **invalidar temporalmente las ventas para dicho evento**.
* Si los datos obtenidos desde Panel difieren de los almacenados localmente, Entradas deberá **actualizar su información local**.

Estos comportamientos corresponden a reglas propuestas por Entradas y aceptadas para este contrato.

---

## 2.3 Versionado

Los cambios que sean **incompatibles** con la versión actual de la interfaz deberán generar una nueva versión del endpoint.

Por ejemplo:

```text
/api/v1/panel/eventos/{id_evento}
```

podría evolucionar a:

```text
/api/v2/panel/eventos/{id_evento}
```

cuando exista un cambio que rompa la compatibilidad con la versión anterior.

Panel deberá notificar a Entradas antes de utilizar la nueva versión.

Los cambios compatibles podrán mantenerse dentro de la versión actual.

---

# 3. Consulta de operaciones antes de eliminar un evento

Panel propone consultar a Entradas antes de realizar una eliminación física de un evento.

Se propone el siguiente endpoint:

```http
GET /api/v1/entradas/eventos/{id_evento}/resumen
```

El objetivo es determinar si el evento posee operaciones asociadas, por ejemplo:

* Reservas.
* Ventas.
* Emisiones.


### Regla propuesta

* Si el evento **no posee reservas, ventas ni emisiones**, Panel podrá eliminarlo físicamente.
* Si el evento **posee alguna de estas operaciones**, Panel no deberá eliminarlo físicamente y deberá cambiar su estado a `CANCELADO`.

### Pendiente de confirmación por Entradas

* Aceptación del endpoint.
* Estructura de la respuesta.
* Campos necesarios para determinar si existen operaciones.
* Códigos de error.
* SLA de respuesta.

---

# 4. Cancelación de eventos

Cuando un evento no pueda ser eliminado físicamente debido a que posee operaciones asociadas, Panel cambiará su estado a:

```text
CANCELADO
```

Una vez que Entradas reciba este estado, se propone que **bloquee nuevas operaciones** relacionadas con el evento, incluyendo:

* Nuevas reservas.
* Nuevas ventas.
* Nuevas emisiones.

El tratamiento de **devoluciones o reembolsos** queda fuera de este contrato y deberá definirse con el microservicio de **Pagos**.

### Pendiente de confirmación por Entradas

* Aceptación de la regla de cancelación.
* Confirmación del comportamiento esperado cuando el evento pasa a `CANCELADO`.

---

# 5. Estados del evento

Panel propone los siguientes estados:

| Estado       | Descripción                                     |
| ------------ | ----------------------------------------------- |
| `BORRADOR`   | Evento creado pero todavía no publicado.        |
| `PUBLICADO`  | Evento disponible para operaciones de entradas. |
| `FINALIZADO` | Evento realizado y cerrado.                     |
| `CANCELADO`  | Evento cancelado por el organizador.            |

### Consideraciones

* Un evento en estado `BORRADOR` no debería requerir operaciones de Entradas.
* `PUBLICADO` corresponde al estado en que Entradas puede comenzar a gestionar operaciones.
* `CANCELADO` debe impedir nuevas operaciones.
* Se debe confirmar si Entradas necesita recibir explícitamente la transición a `FINALIZADO`.

### Pendiente de confirmación por Entradas

* Aceptación de estos estados.
* Correspondencia con sus estados internos.
* Necesidad de recibir el estado `FINALIZADO`.
* Comportamiento esperado para `BORRADOR`.

---

# 6. Resumen de acuerdos

## Acuerdos confirmados

* Panel Organizador es la fuente de verdad de la información del evento.
* Se utilizará **Push** como mecanismo principal de sincronización.
* Entradas podrá utilizar **Pull** mediante `GET /api/v1/panel/eventos/{id_evento}` como respaldo, validación y recuperación.
* El endpoint Pull utilizará los códigos `400`, `404` y `500`.
* El SLA propuesto para el endpoint Pull es menor a `300 ms`.
* Ante un `404`, Entradas deberá invalidar temporalmente las ventas del evento.
* Entradas deberá actualizar su información local cuando los datos obtenidos desde Panel sean diferentes.
* Los cambios incompatibles deberán utilizar una nueva versión de la interfaz y ser notificados a Entradas.
* El tratamiento de pagos, devoluciones y reembolsos corresponde al microservicio de **Pagos**.

## Pendiente de confirmación por Entradas

* Uso del broker para implementar el Push.
* Tópico `panel.eventos.v1`.
* Campos definitivos del mensaje Push.
* Mapeo de los datos recibidos.
* Endpoint para consultar operaciones antes de eliminar un evento.
* Respuesta del endpoint de operaciones.
* Errores y SLA del endpoint de operaciones.
* Regla de eliminación física versus `CANCELADO`.
* Bloqueo de nuevas operaciones para eventos `CANCELADO`.
* Estados `BORRADOR`, `PUBLICADO`, `FINALIZADO` y `CANCELADO`.
* Correspondencia entre los estados de Panel y los estados internos de Entradas.
* Necesidad de recibir `FINALIZADO`.
* Comportamiento de Entradas frente a eventos en `BORRADOR`.
