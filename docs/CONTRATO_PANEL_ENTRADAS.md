# Contrato de interfaz: Panel Organizador ↔ Entradas / Inventario

**Versión:** 1.0

**Equipos consumidores/proveedores:** Panel Organizador y Entradas / Inventario, según la operación.

**Basado en:** HU-03 Eliminar evento; HU-04 Publicar evento; HU-07 Notificar cambios de estado.

---

## 1. Propósito

Panel Organizador debe entregar a Entradas / Inventario la información del evento necesaria para gestionar el stock/emisión de tickets. Además, para HU-03 Panel podría necesitar conocer si existen entradas asociadas o vendidas antes de eliminar/cancelar un evento.

La segunda necesidad aparece expresamente como pendiente de definición, por lo que se documenta sin inventar aún el protocolo definitivo.

---

## 2. Operación A: Entregar datos del evento a Entradas / Inventario

### 2.1 Descripción

Panel Organizador comunica a Entradas / Inventario los datos del evento necesarios para preparar o gestionar sus entradas.

### 2.2 Quién la expone

Equipo Panel Organizador.

### 2.3 Quién la consume

Equipo Entradas / Inventario, al publicarse o habilitarse un evento para emisión/reserva de entradas.

### 2.4 Endpoint / canal propuesto

```text
Broker de eventos
Nombre exacto del evento/tópico: PENDIENTE DE ACUERDO
```

### 2.5 Request (mensaje que se envía)

| Campo | Tipo propuesto | Obligatorio | Descripción |
|---|---|:---:|---|
| `id_evento` | string | Sí | Identificador del evento. |
| `id_usuario` | string | Pendiente | ID enviado desde Panel. Debe aclararse si corresponde al organizador/creador. |
| `nombre_evento` | string | Sí | Nombre del evento. |
| `horario` | string / estructura horaria | Sí | Horario del evento. |
| `fecha_evento` | fecha | Sí | Fecha del evento. |
| `cantidad_entradas` | integer | Sí | Cantidad de entradas definida para el evento. |
| `tipo_entrada` | enum/string | Sí | `pago` o `gratis`. |

**Ejemplo ilustrativo:**

```json
{
  "id_evento": "evt-001",
  "id_usuario": "usr-organizador-001",
  "nombre_evento": "Seminario universitario",
  "horario": "18:00",
  "fecha_evento": "2026-10-15",
  "cantidad_entradas": 300,
  "tipo_entrada": "gratis"
}
```

> **Nota de diseño:** el Excel advierte que falta diferenciar el `id usuario` que compra del `id usuario` que genera el evento. Este contrato no debe cerrarse hasta acordar el significado exacto del campo; se recomienda resolverlo semánticamente en el contrato final.

> **Pendiente de consistencia:** el documento previo del Panel menciona también `precio entradas` hacia Entradas. Sin embargo, la matriz más reciente no lo incluye como dato generado por Panel y la presentación asigna tipo/precio al dominio Catálogo. Se debe confirmar la propiedad de `precio`.

### 2.6 Response (lo que se recibe)

No se define una respuesta de negocio síncrona para esta publicación por broker.

| Campo | Tipo | Obligatorio | Descripción |
|---|---|:---:|---|
| — | — | — | No aplica. |

### 2.7 Códigos de error

No aplican códigos HTTP para el mensaje asíncrono. Política de reintentos/errores pendiente con plataforma.

### 2.8 Tiempo de respuesta esperado (SLA)

**Pendiente de acordar.**

---

## 3. Operación B: Consultar existencia de entradas asociadas/vendidas

### 3.1 Descripción

Permite a Panel Organizador saber si un evento posee entradas asociadas o vendidas antes de ejecutar la regla de eliminación/cancelación de HU-03.

### 3.2 Quién la expone

Equipo Entradas / Inventario.

### 3.3 Quién la consume

Equipo Panel Organizador, al intentar eliminar un evento cuando la regla de negocio requiera validar previamente la existencia de entradas.

### 3.4 Endpoint propuesto

```text
PENDIENTE DE ACUERDO
Protocolo por definir: REST vs evento asíncrono.
```

### 3.5 Request (lo que se envía)

| Campo | Tipo propuesto | Obligatorio | Descripción |
|---|---|:---:|---|
| `id_evento` | string | Sí | Evento cuya situación de entradas se desea consultar. |

**Ejemplo ilustrativo:**

```json
{
  "id_evento": "evt-001"
}
```

### 3.6 Response (lo que se recibe)

El documento de clase solo establece que Panel **podría recibir información sobre si existen entradas vendidas**. El esquema definitivo no está acordado.

| Campo | Tipo propuesto | Obligatorio | Descripción |
|---|---|:---:|---|
| `existen_entradas_vendidas` | boolean | Pendiente | Indicaría si existen ventas asociadas al evento. Campo propuesto, no definitivo. |

**Ejemplo propuesto:**

```json
{
  "existen_entradas_vendidas": true
}
```

> **Nota de diseño:** este response es una propuesta mínima para representar la necesidad debatida. Debe ser validado por ambos equipos antes de implementación.

### 3.7 Códigos de error

**Pendiente**, ya que el protocolo no está definido.

### 3.8 Tiempo de respuesta esperado (SLA)

**Pendiente de acordar.**

---

## 4. Reglas de uso

1. Panel no debe asumir por sí mismo el estado del inventario de entradas.
2. Entradas / Inventario es responsable de sus datos de stock, emisión y tickets.
3. Para HU-03, Panel debe aplicar la regla acordada una vez obtenida la información de Entradas.
4. Hasta que se defina la regla de negocio, HU-03 debe mantener este punto como dependencia pendiente.

---

## 5. Versionado y cambios

- Todo cambio de esquema debe versionarse.
- Breaking changes requieren transición acordada.
- Cualquier resolución sobre `id_usuario`, `precio` o eliminación con entradas debe reflejarse aquí.

## 6. Dueños del contrato

| Rol | Equipo | Contacto |
|---|---|---|
| Dueño Operación A | Panel Organizador | Pendiente |
| Consumidor Operación A | Entradas / Inventario | Pendiente |
| Dueño Operación B | Entradas / Inventario | Pendiente |
| Consumidor Operación B | Panel Organizador | Pendiente |

---

## 7. Pendientes a acordar

- [ ] Diferenciar semánticamente el ID del organizador y el ID del comprador.
- [ ] Confirmar nombre del evento/tópico usado en Operación A.
- [ ] Confirmar propiedad y necesidad del dato `precio`.
- [ ] Definir REST vs broker para consultar entradas en HU-03.
- [ ] Definir respuesta exacta de la consulta.
- [ ] Definir qué ocurre si ya existen entradas: impedir eliminación, cancelar u otra regla.
- [ ] Confirmar SLA y manejo de errores.
