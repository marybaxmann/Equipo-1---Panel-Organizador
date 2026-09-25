# Contrato de interfaz: Panel Organizador ↔ Entradas / Inventario

**Versión:** 1.2
**Proveedor:** Panel Organizador  
**Consumidor:** Entradas / Inventario

---

## 1. Propósito

Definir la comunicación entre **Panel Organizador** y **Entradas / Inventario** para intercambiar la información necesaria de los eventos.

**Panel Organizador** administra los datos generales del evento, su estado de gestión y la disponibilidad que comunica a otros microservicios.

**Entradas / Inventario** administra las entradas asociadas al evento y su stock disponible.

---

## 2. Acuerdos confirmados

### 2.1 Responsabilidad sobre los datos

Ambos contratos coinciden en que **Panel Organizador es la fuente de los datos generales del evento** que Entradas necesita para operar.

| Dato | Responsable |
|---|---|
| Datos generales del evento | Panel Organizador |
| Estado de gestión del evento | Panel Organizador |
| Cantidad inicial de entradas habilitadas | Panel Organizador |
| Gestión de las entradas | Entradas / Inventario |
| Stock disponible | Entradas / Inventario |
| Disponibilidad comunicada a otros microservicios | Panel Organizador, a partir del stock informado por Entradas |

---

### 2.2 Datos del evento compartidos

Ambos contratos consideran los siguientes datos dentro de la integración:

| Campo | Tipo | Descripción |
|---|---|---|
| `id_evento` | string | Identificador único del evento. |
| `id_usuario` | string | Identificador del usuario u organizador asociado al evento. |
| `nombre_evento` | string | Nombre del evento. |
| `fecha_evento` | string | Fecha del evento. |
| `hora_evento` | string | Hora de inicio del evento. |
| `cantidad_entradas` | integer | Cantidad inicial de entradas habilitadas para el evento. |
| `tipo_entrada` | string | Indica si la entrada es gratuita o pagada. |
| Estado del evento | string | Estado administrativo definido por Panel. |

La denominación y los valores definitivos de `tipo_entrada` y del estado se indican como propuestas en la sección 3.

---

### 2.3 Consulta de información del evento

Entradas podrá consultar la información actual del evento directamente en Panel mediante:

```http
GET /api/v1/panel/eventos/{id_evento}
```

Esta consulta permite validar o recuperar la información del evento ante una posible desincronización.

### Respuesta

```json
{
  "id_evento": "evt-001",
  "id_usuario": "usr-001",
  "nombre_evento": "Evento de ejemplo",
  "fecha_evento": "2026-10-15",
  "hora_evento": "20:00",
  "cantidad_entradas": 500,
  "tipo_entrada": "PAGADA",
  "estado_gestion": "PUBLICADO"
}
```

### Errores

| Código | Situación |
|---|---|
| `400` | ID de evento inválido. |
| `404` | Evento no encontrado. |
| `500` | Error interno de Panel Organizador. |

**SLA:**

```text
< 300 ms
```

---

## 3. Propuestas de Panel pendientes de confirmación

### 3.1 Sincronización Panel → Entradas mediante broker

**Panel propone:** utilizar **Push mediante broker** como mecanismo principal para comunicar cambios del evento a Entradas.

```text
Panel Organizador → Broker → Entradas / Inventario
```

El mensaje se publicará después de que Panel guarde correctamente la operación.

Se propone comunicar:

- creación;
- edición;
- publicación;
- cancelación;
- eliminación.

**Tópico propuesto:**

```text
panel.evento.entradas.v1
```

El sufijo `v1` identifica la versión del contrato. Un cambio incompatible generará una nueva versión, por ejemplo `v2`.

### Mensaje propuesto

```json
{
  "id_evento": "evt-001",
  "id_usuario": "usr-001",
  "nombre_evento": "Evento de ejemplo",
  "fecha_evento": "2026-10-15",
  "hora_evento": "20:00",
  "cantidad_entradas": 500,
  "tipo_entrada": "PAGADA",
  "estado_gestion": "PUBLICADO"
}
```

**Pendiente de confirmación por Entradas:**

- aceptar broker como mecanismo principal;
- aceptar el tópico `panel.evento.entradas.v1`;
- confirmar qué operaciones necesita recibir;
- acordar política de ACK y reintentos.

---

### 3.2 Tipo de entrada

Actualmente ambos contratos representan el mismo concepto, pero utilizan valores diferentes.

Entradas utiliza como ejemplo:

```text
pago
gratis
```

**Panel propone:** mantener:

```text
tipo_entrada
```

con los valores:

```text
PAGADA
GRATUITA
```

**Pendiente de confirmación por Entradas:** aceptar estos valores o acordar una equivalencia común.

---

### 3.3 Estado de gestión

Panel utiliza:

```text
estado_gestion
```

con los valores:

```text
BORRADOR
PUBLICADO
FINALIZADO
CANCELADO
```

Entradas utiliza en su contrato `estado_evento`, con ejemplos como `ACTIVO` y `CANCELADO`.

**Panel propone:** mantener `estado_gestion` como estado administrativo proveniente de Panel.

La disponibilidad de entradas es un concepto independiente. Por ejemplo:

```text
estado_gestion = PUBLICADO
disponibilidad = AGOTADO
```

indica que el evento continúa publicado, pero ya no dispone de entradas.

**Pendiente de confirmación por Entradas:** indicar si utilizará directamente los valores de `estado_gestion` o realizará una equivalencia interna.

---

### 3.4 Stock, disponibilidad y validación de eliminación

El stock es administrado por **Entradas / Inventario**.

Panel no necesita recibir cada modificación del stock. Se propone utilizar esta información:

- cuando Panel solicite conocer el stock actual;
- cuando el stock llegue a `0`.

#### Consulta de stock

**Panel propone:** consultar el stock actual mediante:

```http
GET /api/v1/entradas/eventos/{id_evento}/stock
```

### Respuesta propuesta

```json
{
  "id_evento": "evt-001",
  "stock": 37
}
```

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `id_evento` | string | Sí | Identificador único del evento. |
| `stock` | integer | Sí | Cantidad actual de entradas disponibles. |

### Errores propuestos

| Código | Situación |
|---|---|
| `400` | Formato de `id_evento` inválido. |
| `404` | Evento no encontrado en Entradas / Inventario. |
| `500` | Error interno de Entradas / Inventario. |

### SLA propuesto

```text
< 300 ms
```

#### Validación previa a eliminación

Antes de eliminar físicamente un evento, Panel podrá consultar este endpoint y comparar el stock actual con `cantidad_entradas`.

Se propone:

```text
stock = cantidad_entradas
→ No se registra consumo de entradas.
→ Panel puede eliminar físicamente el evento.

stock < cantidad_entradas
→ Existe actividad asociada a las entradas.
→ Panel no elimina físicamente el evento.
→ Panel establece estado_gestion = CANCELADO.
```

Esta validación utiliza la misma consulta de stock, evitando crear un endpoint adicional únicamente para verificar la eliminación.

#### Evento agotado

Cuando Entradas determine:

```text
stock = 0
```

**Panel propone:** que Entradas notifique inmediatamente esta condición mediante broker.

**Tópico propuesto:**

```text
entradas.evento.stock.v1
```

### Mensaje propuesto

```json
{
  "id_evento": "evt-001",
  "stock": 0
}
```

Al recibir la notificación:

```text
stock = 0
→ Panel establece disponibilidad = AGOTADO
→ Panel comunica posteriormente esta disponibilidad a los microservicios que la consumen.
```

Esto permite que Panel refleje el evento como **AGOTADO**, de acuerdo con la integración definida con **Catálogo de Eventos**, sin modificar su `estado_gestion`.

No se requiere que Entradas envíe un campo adicional `estado_disponibilidad`, ya que Panel puede determinar:

```text
stock = 0 → AGOTADO
```

a partir del dato del cual Entradas es responsable.

**Pendiente de confirmación por Entradas:**

- aceptar `GET /api/v1/entradas/eventos/{id_evento}/stock`;
- aceptar la estructura de respuesta, errores y SLA propuestos;
- confirmar que la comparación entre `stock` y `cantidad_entradas` puede utilizarse para validar la eliminación;
- aceptar la notificación mediante broker cuando `stock = 0`;
- aceptar el tópico `entradas.evento.stock.v1`.

---

### 3.5 Comportamiento ante cancelación

Panel comunicará:

```text
estado_gestion = CANCELADO
```

**Panel propone:** que Entradas impida nuevas operaciones sobre las entradas del evento después de recibir la cancelación.

Las devoluciones o reembolsos quedan fuera de este contrato y corresponden al microservicio responsable de Pagos.

**Pendiente de confirmación por Entradas:** definir el comportamiento interno que aplicará al recibir `CANCELADO`.

---

## 4. Pendientes de confirmación

Entradas / Inventario debe confirmar:

1. Broker como mecanismo principal Panel → Entradas, tópico `panel.evento.entradas.v1` y operaciones que necesita recibir.
2. Política de ACK y reintentos.
3. Valores de `tipo_entrada`.
4. Uso de `estado_gestion` y tratamiento de sus valores.
5. Consulta de stock mediante `GET /api/v1/entradas/eventos/{id_evento}/stock`, incluyendo respuesta, errores y SLA.
6. Uso de `stock` frente a `cantidad_entradas` para validar la eliminación física.
7. Notificación mediante `entradas.evento.stock.v1` cuando `stock = 0`.
8. Comportamiento de Entradas ante `estado_gestion = CANCELADO`.
