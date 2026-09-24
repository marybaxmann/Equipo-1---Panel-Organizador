# Contrato de interfaz: Panel Organizador ↔ Entradas / Inventario

**Versión:** 1.1

**Equipos participantes:** Panel Organizador y Entradas / Inventario

**Basado en:** HU-03, HU-04, HU-07, Matriz de Dependencia de Datos y contrato `Contrato_Entradas_Panel.docx`.

---

## 1. Propósito

Definir cómo Panel Organizador y Entradas / Inventario intercambian información sobre los eventos.

- **Panel Organizador** es responsable de los datos maestros y del ciclo de vida del evento.
- **Entradas / Inventario** es responsable del stock, emisión y entradas vendidas.

---

## 2. Panel → Entradas: datos del evento

Panel entrega a Entradas la información necesaria para gestionar tickets.

### Datos

| Campo | Tipo | Obligatorio | Descripción |
|---|---|:---:|---|
| `id_evento` | string | Sí | Identificador del evento. |
| `id_usuario` | string | Sí | ID del organizador dueño del evento. |
| `nombre_evento` | string | Sí | Nombre del evento. |
| `fecha_evento` | string | Sí | Fecha del evento. |
| `hora_evento` | string | Sí | Hora de inicio. |
| `cantidad_entradas` | integer | Sí | Aforo/cantidad de entradas. |
| `tipo_entrada` | string | Sí | `pago` o `gratis`. |
| `estado_evento` | string | Sí | Estado vigente del evento. |
| `precio` | number | Según corresponda | Precio del evento pagado. |

### Pendiente

- Confirmar el mecanismo técnico del **Push Panel → Entradas**.
- Confirmar si Entradas necesita recibir `precio`.
- Alinear los valores válidos de `estado_evento`.

---

## 3. Entradas → Panel: consultar detalles del evento

Entradas puede consultar al Panel para validar o recuperar los datos actuales de un evento.

### Endpoint

```http
GET /api/v1/panel/eventos/{id_evento}
```

### Request

`id_evento` se envía en la URL.

**Ejemplo:**

```http
GET /api/v1/panel/eventos/evt-77889
```

### Response

```json
{
  "id_usuario": "org-4455",
  "nombre_evento": "Fiesta Mechona Info",
  "fecha_evento": "2026-11-20",
  "hora_evento": "22:00",
  "cantidad_entradas": 500,
  "tipo_entrada": "pago",
  "estado_evento": "ACTIVO"
}
```

### Errores

| Código | Significado |
|---|---|
| `400` | `id_evento` inválido. |
| `404` | Evento no encontrado. |
| `500` | Error interno del Panel. |

### SLA

```text
< 300 ms
```

Panel acepta este SLA para esta operación de lectura simple.

---

## 4. Panel → Entradas: consultar entradas vendidas para HU-03

Antes de eliminar o cancelar un evento, Panel necesita saber si existen entradas vendidas o emitidas.

### Request mínimo

```json
{
  "id_evento": "evt-001"
}
```

### Response propuesto

```json
{
  "id_evento": "evt-001",
  "existen_entradas_vendidas": true,
  "cantidad_vendida": 42
}
```

### Regla propuesta

- Si **no existen entradas vendidas o emitidas**, el evento puede eliminarse.
- Si **existen entradas vendidas o emitidas**, el evento no se elimina y pasa a estado `Cancelado`.

### Pendiente

- Confirmar qué operación expondrá Entradas para esta consulta.
- Confirmar el response definitivo.
- Confirmar la regla de eliminación/cancelación.
- Confirmar SLA y manejo de errores para esta consulta.

---

## 5. Acuerdos actuales

- [x] `id_usuario` corresponde al **organizador dueño del evento**.
- [x] Panel acepta `GET /api/v1/panel/eventos/{id_evento}` como consulta de validación/fallback.
- [x] Panel acepta los campos definidos por Entradas para ese GET.
- [x] Panel acepta los códigos `400`, `404` y `500`.
- [x] Panel acepta SLA `< 300 ms` para ese GET.
- [x] Panel propone ser la fuente de verdad del `precio`.

## 6. Pendientes por confirmar con Entradas

### 6.1 Precio

**Propuesta de Panel:**  
Panel Organizador será la fuente de verdad del precio y enviará el campo `precio`
cuando el evento sea pagado.

**Pendiente:**  
Confirmar si Entradas necesita consumir este campo.

---

### 6.2 Estado del evento

**Propuesta de Panel:**  
Los valores enviados en `estado_evento` serán:

- `Borrador`
- `Publicado`
- `Finalizado`
- `Cancelado`

**Pendiente:**  
Confirmar si Entradas utilizará estos mismos valores o realizará un mapeo interno.

---

### 6.3 Consulta de entradas vendidas — HU-03

**Necesidad de Panel:**  
Antes de eliminar un evento, Panel necesita consultar a Entradas si existen
entradas vendidas o emitidas asociadas al `id_evento`.

**Propuesta de Panel:**  
Entradas expone una operación de consulta utilizando `id_evento`.

**Pendiente:**  
Entradas debe confirmar el endpoint u operación exacta.

---

### 6.4 Response de la consulta HU-03

**Propuesta de Panel:**

```json
{
  "id_evento": "evt-001",
  "existen_entradas_vendidas": true,
  "cantidad_vendida": 42
}

---

## 7. Dueños del contrato

| Rol | Equipo | Contacto |
|---|---|---|
| Panel Organizador | Panel Organizador | Pendiente |
| Entradas / Inventario | Entradas / Inventario | Sebastián Fuentes (Scrum Master) |
