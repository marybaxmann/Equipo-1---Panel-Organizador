# Contrato de interfaz: Panel Organizador ↔ Check-in

**Versión:** 1.2  
**Proveedor:** Panel Organizador  
**Consumidor:** Check-in  
**Basado en:** Matriz de dependencia de datos (TITECT 2026-2), propuesta de Check-in v1.0 (`consultar_evento`) y contrato Panel ↔ Check-in v1.1.

---

## 1. Propósito

Definir la información del evento que **Panel Organizador** entrega a **Check-in** para que el staff valide el ingreso de asistentes: identificación, ubicación, fecha, horario y estado del evento.

Panel entrega la información del evento. **Check-in decide** si una entrada se acepta.

Quedan fuera de este contrato:

- la generación, contenido y estructura del código QR (Entradas / Inventario ↔ Check-in);
- la obtención del `id_evento` a partir de la entrada escaneada (Entradas / Inventario ↔ Check-in);
- la lista de asistencia y hora de llegada (datos propios de Check-in).

---

## 2. Acuerdos confirmados

Puntos en los que la propuesta de Check-in (v1.0) y el contrato de Panel (v1.1) ya coinciden.

### 2.1 Responsabilidades

| Información | Responsable |
|---|---|
| Datos generales, horario y estado de gestión del evento | Panel Organizador |
| Generación del `id_evento` | Panel Organizador |
| Generación y contenido del QR | Entradas / Inventario |
| Relación entrada → `id_evento` | Entradas / Inventario |
| Validación de la entrada y decisión de ingreso | Check-in |
| Lista de asistencia y hora de llegada | Check-in |

Panel **sí genera y expone** `id_evento` (la matriz de dependencias lo lista solo como dato recibido por Check-in, pero es Panel quien lo crea).

### 2.2 Campos comunes

| Campo | Tipo | Descripción |
|---|---|---|
| `id_evento` | string | Identificador único del evento. |
| `nombre_evento` | string | Nombre del evento. |
| `direccion_evento` | string | Dirección o lugar del evento. |
| `fecha_evento` | string (`AAAA-MM-DD`) | Fecha de inicio del evento. |

### 2.3 Reglas generales

1. Check-in no accede a la base de datos de Panel.
2. Check-in no modifica datos del evento y utiliza solo los campos que necesita.
3. Los identificadores se tratan como `string`.
4. Los atributos siguen la nomenclatura `atributo_categoría`.
5. Las llamadas REST se realizan a través del API Gateway y Panel publica su especificación OpenAPI antes de la integración.

### 2.4 Autenticación de la consulta REST

Propuesta de Check-in, aceptada por Panel y confirmada por Auth (29/09/2026), de acuerdo con el contrato de integración de Auth:

```text
Check-in reenvía intacta la cookie de sesión del staff (jwt=...)
→ Panel valida la sesión con Auth en cada consulta (GET /internal/validar-sesion)
→ Panel autoriza la lectura a los roles staff y organizador.
```

- Panel utiliza el `usuario.rol` vigente que retorna Auth, no el rol contenido en el JWT.
- Panel no decodifica ni valida el JWT localmente.
- Si Auth no responde (timeout o caída), Panel aplica **Fail-Secure** y responde `503`. En ese caso, Check-in continúa con su copia local recibida por broker (3.1).
- Los mensajes del broker no utilizan la cookie de sesión.

---

## 3. Propuestas de Panel pendientes de confirmación

### 3.1 Mecanismo: broker como principal y REST como respaldo

Se unifican ambas propuestas (Panel proponía solo broker; Check-in proponía solo REST), siguiendo el mismo patrón acordado con Entradas / Inventario:

```text
Principal:  Panel Organizador → Broker (RabbitMQ) → Check-in
Respaldo:   Check-in → API Gateway → GET Panel Organizador
```

- **Broker:** Check-in mantiene una copia local de los eventos que debe validar y no consulta a Panel en cada escaneo.
- **GET:** Check-in consulta a Panel cuando no tiene el evento en su copia local, sospecha desincronización o necesita confirmar el estado.

Esto responde al pendiente de Check-in sobre almacenamiento temporal y disponibilidad: si Panel no responde, Check-in puede seguir validando con su última copia recibida por broker.

---

### 3.2 Campos del evento para Check-in

| Campo | Tipo | Obligatorio | Descripción |
|---|---|:---:|---|
| `id_evento` | string | Sí | Identificador único del evento. |
| `nombre_evento` | string | Sí | Nombre del evento. |
| `direccion_evento` | string | Sí | Dirección o lugar del evento. |
| `fecha_evento` | string (`AAAA-MM-DD`) | Sí | Fecha de inicio. |
| `hora_evento` | string (`HH:mm`, 24 h) | Sí | Hora de inicio. |
| `hora_fin_evento` | string (`HH:mm`, 24 h) | Sí | Hora de término. |
| `estado_gestion` | string | Sí | `PUBLICADO`, `CANCELADO` o `FINALIZADO`. |
| `cantidad_entradas` | integer | No | **Pendiente:** solo si Check-in la necesita como aforo (ver 3.5). |

#### Horario

Panel **incorporará `hora_fin_evento`** a su modelo, ya que Check-in lo necesita para validar el horario de ingreso.

Panel mantiene **`hora_evento` como hora de inicio**, nombre ya acordado con Catálogo, Entradas y Notificaciones. Se agrega `hora_fin_evento` para indicar el término. De este modo, el campo que Check-in propuso como `hora_inicio_evento` corresponde a `hora_evento`, y los demás contratos no requieren cambios.

**Eventos que terminan después de medianoche:**

```text
hora_fin_evento <= hora_evento
→ el evento termina el día siguiente a fecha_evento.

Ejemplo: fecha_evento = 2026-11-14, 21:00 → 03:00
→ termina el 2026-11-15 a las 03:00.
```

**Zona horaria:** todas las fechas y horas se expresan en hora local de Chile (`America/Santiago`).

#### Estado

Panel propone mantener **`estado_gestion`** (no `estado_evento`), igual que en los contratos con Catálogo, Entradas y Notificaciones.

Check-in solo recibe los estados relevantes para validar ingresos:

| `estado_gestion` | Significado para Check-in |
|---|---|
| `PUBLICADO` | El evento se realiza. Se pueden validar entradas. |
| `CANCELADO` | El evento no se realiza. Check-in debe rechazar las entradas. |
| `FINALIZADO` | El evento terminó. Check-in cierra la validación. |

`BORRADOR` no se comunica a Check-in, ya que un evento en borrador no tiene entradas emitidas.

---

### 3.3 Publicación mediante broker

**Tópico propuesto:**

```text
panel.evento.checkin.v1
```

Panel publica el mensaje **después de guardar correctamente** la operación, cuando:

| `tipo_cambio` | Disparador |
|---|---|
| `PUBLICADO` | El evento pasa a `PUBLICADO`. |
| `ACTUALIZADO` | Un evento `PUBLICADO` cambia nombre, dirección, fecha u horario (incluye reprogramación). |
| `CANCELADO` | El evento pasa a `CANCELADO`. |
| `FINALIZADO` | El evento pasa a `FINALIZADO`. |

`ACTUALIZADO` se agrega a los tres estados indicados originalmente: sin él, si un evento publicado se reprograma, Check-in validaría con fecha u horario desactualizados.

#### Mensaje propuesto

```json
{
  "tipo_cambio": "PUBLICADO",
  "id_evento": "evt-001",
  "nombre_evento": "Fiesta de generación 2026",
  "direccion_evento": "Gimnasio Central, Campus Principal",
  "fecha_evento": "2026-11-14",
  "hora_evento": "21:00",
  "hora_fin_evento": "03:00",
  "estado_gestion": "PUBLICADO",
  "fecha_cambio": "2026-10-01T15:30:00-03:00"
}
```

| Campo | Uso |
|---|---|
| `tipo_cambio` | Motivo de la publicación del mensaje. |
| `fecha_cambio` | Fecha y hora del cambio (ISO 8601). Check-in descarta un mensaje si ya tiene una versión con `fecha_cambio` más reciente. |

El mensaje siempre incluye el **estado completo del evento** (no solo el campo modificado), para que Check-in pueda reemplazar su copia local sin combinar datos.

#### ACK y reintentos

**Panel propone:**

- Cola durable: los mensajes no se pierden si Check-in está desconectado.
- Check-in confirma el mensaje (ACK) **después** de guardarlo en su copia local.
- Si el procesamiento falla, el mensaje se reintenta hasta **3 veces**; luego se registra el error.
- Check-in puede recibir el mismo mensaje más de una vez sin efectos, ya que descarta los mensajes con `fecha_cambio` igual o anterior a la que ya tiene.

---

### 3.4 Consulta de respaldo mediante REST

Se utiliza el **mismo endpoint** definido en el contrato con Entradas / Inventario, que coincide con el propuesto por Check-in (`consultar_evento`):

```http
GET /api/v1/panel/eventos/{id_evento}
```

#### Request

| Campo | Ubicación | Tipo | Obligatorio | Descripción |
|---|---|---|:---:|---|
| `id_evento` | path | string | Sí | Obtenido a partir de la entrada validada con Entradas / Inventario. |

#### Response `200`

```json
{
  "id_evento": "evt-001",
  "nombre_evento": "Fiesta de generación 2026",
  "direccion_evento": "Gimnasio Central, Campus Principal",
  "fecha_evento": "2026-11-14",
  "hora_evento": "21:00",
  "hora_fin_evento": "03:00",
  "estado_gestion": "PUBLICADO"
}
```


#### Errores

| Código | `error` | Situación |
|---|---|---|
| `400` | `ID_EVENTO_INVALIDO` | `id_evento` con formato inválido. |
| `401` | `SESION_INVALIDA` | Auth indica sesión ausente, inválida, expirada o revocada. |
| `403` | `ROL_NO_AUTORIZADO` | El rol vigente no es `staff` ni `organizador`, o Auth responde `403`. |
| `404` | `EVENTO_NO_ENCONTRADO` | Evento no encontrado. |
| `500` | `ERROR_INTERNO` | Error interno de Panel Organizador o de Auth. |
| `503` | `SERVICIO_NO_DISPONIBLE` | Panel Organizador o Auth no disponible (Fail-Secure). |

#### Estructura de la respuesta de error

Se utiliza el mismo formato de error definido por Auth:

```json
{
  "codigo_http": 404,
  "error": "EVENTO_NO_ENCONTRADO",
  "mensaje": "No existe un evento con id_evento evt-001."
}
```

| Campo | Tipo | Descripción |
|---|---|---|
| `codigo_http` | integer | Código HTTP. |
| `error` | string | Identificador del error, para que Check-in lo procese. |
| `mensaje` | string | Descripción legible del error. |

**SLA propuesto:**

```text
< 300 ms
```

(mismo SLA que la consulta de Entradas sobre este endpoint).

El SLA **incluye la validación de sesión con Auth** (2.4), ya que Panel consulta a Auth en cada petición. Su cumplimiento depende del SLA de Auth, aún pendiente de confirmación en el contrato Auth ↔ Panel.

---

### 3.5 Aforo (`cantidad_entradas`)

`cantidad_entradas` en Panel representa la **cantidad inicial de entradas habilitadas**, no necesariamente la capacidad física del lugar.

**Pendiente por Check-in:** indicar si necesita este dato (por ejemplo, para un contador de ingresos). Si lo necesita, se agrega como campo opcional al mensaje y al GET; si no, queda fuera.

---

### 3.6 Evento en curso del staff

Panel no administra asignaciones de staff a eventos. **Check-in define el evento en curso** del staff.

Para ello, Check-in puede utilizar los eventos con `estado_gestion = PUBLICADO` recibidos mediante `panel.evento.checkin.v1` como lista de selección, sin requerir un endpoint adicional en Panel.

---

## 4. Reglas de uso (lado consumidor)

1. Check-in obtiene el `id_evento` desde la entrada administrada por Entradas / Inventario, no desde un dato sin verificar.
2. Check-in compara el `id_evento` de la entrada con el evento en curso del staff.
3. Check-in busca el evento en su copia local (alimentada por `panel.evento.checkin.v1`). Si no lo tiene, consulta `GET /api/v1/panel/eventos/{id_evento}`.
4. Si `estado_gestion` es `CANCELADO` o `FINALIZADO`, Check-in rechaza la entrada.
5. Check-in verifica fecha y horario con `fecha_evento`, `hora_evento` y `hora_fin_evento`.
6. La decisión de aceptar o rechazar la entrada corresponde exclusivamente a Check-in.

---

## 5. Versionado y cambios

- El sufijo `v1` del tópico identifica la versión del mensaje. Un cambio incompatible genera un nuevo tópico (`v2`).
- Cambios en campos, estados o mecanismo requieren revisión y acuerdo entre ambos equipos.
- Cambios incompatibles requieren un período de transición acordado.

### Historial

| Versión | Cambio |
|---|---|
| 1.0 | Propuesta inicial de Check-in: `GET` `consultar_evento`. |
| 1.1 | Propuesta de Panel: solo broker, sin hora de término. |
| 1.2 | Unificación: broker principal + `GET` de respaldo, `hora_fin_evento`, `estado_gestion`, `tipo_cambio`, estructura de error alineada con Auth, ACK/reintentos, autenticación confirmada por Auth y QR fuera del contrato. |

---

## 6. Dueños del contrato

| Rol | Equipo | Contacto |
|---|---|---|
| Dueño del contrato | Panel Organizador | Mariajosé Baxmann (Scrum Master) |
| Consumidor principal | Check-in | [Representante de Check-in] |

---

## 7. Pendientes de confirmación

**Check-in debe confirmar:**

1. Mecanismo mixto: broker principal + `GET` de respaldo.
2. Tópico `panel.evento.checkin.v1` y valores de `tipo_cambio` (`PUBLICADO`, `ACTUALIZADO`, `CANCELADO`, `FINALIZADO`).
3. Uso de `hora_evento` como hora de inicio (en lugar de `hora_inicio_evento`), `hora_fin_evento` como hora de término y `estado_gestion`.
4. Regla de eventos que terminan después de medianoche y zona horaria `America/Santiago`.
5. Si necesita `cantidad_entradas` como aforo.
6. Política de ACK y reintentos propuesta (3.3).
7. Estructura de la respuesta de error (3.4).
8. SLA `< 300 ms` del `GET`.
9. Definición del evento en curso del staff por parte de Check-in (3.6).
10. Contacto responsable.

**Con otros equipos:**

1. Entradas / Inventario ↔ Check-in: contenido del QR y obtención del `id_evento` (fuera de este contrato).
