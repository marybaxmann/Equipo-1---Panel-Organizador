# Contrato de interfaz: Panel Organizador ↔ Notificaciones

**Versión:** 1.0

**Equipos consumidores/proveedores:** Panel Organizador y Notificaciones, según la operación.

**Basado en:** HU-04 Publicar evento; HU-07 Notificar cambios de estado.

---

## 1. Propósito

Panel Organizador debe comunicar a Notificaciones los cambios relevantes del ciclo de vida de un evento para que dicho servicio pueda generar los avisos que correspondan. La matriz de dependencias también registra una `Confirmación` desde Notificaciones hacia Panel, cuyo significado exacto aún debe acordarse.

---

## 2. Operación A: Notificar cambio de estado de un evento

### 2.1 Descripción

Panel Organizador publica los datos mínimos de un cambio de estado para que Notificaciones pueda procesar el aviso correspondiente.

### 2.2 Quién la expone

Equipo Panel Organizador.

### 2.3 Quién la consume

Equipo Notificaciones, cuando un evento tenga un cambio que deba generar una notificación.

### 2.4 Endpoint / canal propuesto

```text
Broker de eventos
Nombre exacto del evento/tópico: PENDIENTE DE ACUERDO
```

### 2.5 Request (mensaje que se envía)

| Campo | Tipo propuesto | Obligatorio | Descripción |
|---|---|:---:|---|
| `id_evento` | string | Sí | Identificador del evento. |
| `nuevo_estado` | string | Sí | Nuevo estado del evento. |
| `fecha_cambio` | fecha-hora | Sí | Fecha y hora del cambio. |
| `tipo_cambio` | string | Pendiente | Creación, edición, publicación, eliminación u otro cambio acordado. |

**Ejemplo ilustrativo:**

```json
{
  "id_evento": "evt-001",
  "nuevo_estado": "Publicado",
  "fecha_cambio": "2026-09-10T12:00:00",
  "tipo_cambio": "publicacion"
}
```

> **Nota de diseño:** la matriz reciente de Notificaciones identifica expresamente `id evento`, `nuevo estado` y `fecha cambio` provenientes de Panel. El documento previo añade `tipo de cambio` y también menciona cantidad/precio de entradas “según corresponda”; esos campos adicionales deben confirmarse antes de incorporarlos como obligatorios.

### 2.6 Response (lo que se recibe)

No hay respuesta síncrona de negocio para el evento asíncrono. Sin embargo, la matriz de dependencias registra `Confirmación (Auth, panel)` como dato enviado por Notificaciones.

| Campo | Tipo | Obligatorio | Descripción |
|---|---|:---:|---|
| `confirmacion` | Pendiente | Pendiente | Dato señalado en la matriz, pero sin definición semántica ni estructura. |

> **Nota:** no se inventa aquí la forma de la confirmación. Debe acordarse si es un ACK técnico del broker, un evento funcional o un dato distinto.

### 2.7 Códigos de error

No aplican códigos HTTP para el mensaje asíncrono. Manejo de errores pendiente con plataforma.

### 2.8 Tiempo de respuesta esperado (SLA)

**Pendiente de acordar.**

---

## 3. Operación B: Confirmación desde Notificaciones hacia Panel

### 3.1 Descripción

Representa la confirmación indicada en la matriz de dependencias desde Notificaciones hacia Panel Organizador.

### 3.2 Quién la expone

Equipo Notificaciones.

### 3.3 Quién la consume

Equipo Panel Organizador, si finalmente se determina que requiere una confirmación funcional.

### 3.4 Endpoint / canal propuesto

```text
PENDIENTE DE ACUERDO
```

### 3.5 Request (lo que se envía)

**Pendiente:** la documentación proporcionada no define estructura ni campos.

### 3.6 Response (lo que se recibe)

**Pendiente:** no definido.

### 3.7 Códigos de error

**Pendiente.**

### 3.8 Tiempo de respuesta esperado (SLA)

**Pendiente.**

---

## 4. Reglas de uso

1. Panel publica únicamente los cambios acordados con Notificaciones.
2. Notificaciones es responsable de crear/gestionar las notificaciones y su estado leído/no leído.
3. Panel no debe asumir el resultado del envío de una notificación mientras no se defina qué significa `Confirmación`.
4. Cualquier dato adicional de entradas debe incorporarse solo tras acuerdo entre los equipos.

---

## 5. Versionado y cambios

- Versionar cambios de esquema.
- Breaking changes requieren transición.
- La semántica de `Confirmación` debe quedar documentada antes de implementarse.

## 6. Dueños del contrato

| Rol | Equipo | Contacto |
|---|---|---|
| Dueño Operación A | Panel Organizador | Pendiente |
| Consumidor Operación A | Notificaciones | Pendiente |
| Dueño Operación B | Notificaciones | Pendiente |
| Consumidor Operación B | Panel Organizador | Pendiente |

---

## 7. Pendientes a acordar

- [ ] Confirmar nombre exacto del evento/tópico.
- [ ] Confirmar si `tipo_cambio` forma parte del contrato.
- [ ] Definir qué significa `Confirmación`.
- [ ] Confirmar si cantidad/precio de entradas deben llegar desde Panel.
- [ ] Confirmar reintentos, ACK y errores del broker.
- [ ] Confirmar SLA.
