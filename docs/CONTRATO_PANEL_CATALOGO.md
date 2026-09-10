# Contrato de interfaz: Panel Organizador ↔ Catálogo de eventos

**Versión:** 1.0

**Equipo consumidor:** Catálogo de eventos

**Equipo proveedor:** Panel Organizador

**Basado en:** HU-02 Editar evento; HU-04 Publicar evento; HU-07 Notificar cambios de estado.

---

## 1. Propósito

Catálogo necesita recibir desde Panel Organizador los datos descriptivos de los eventos que deben mostrarse públicamente. Panel Organizador es la fuente de los datos de gestión del evento y comunica su publicación o actualización.

La arquitectura del proyecto establece que la coordinación por eventos entre microservicios debe realizarse mediante el broker.

---

## 2. Operación: Publicar o actualizar datos de un evento

### 2.1 Descripción

Panel Organizador publica en el broker los datos de un evento que ha sido publicado o actualizado para que Catálogo pueda reflejarlo en la cartelera pública.

### 2.2 Quién la expone

Equipo Panel Organizador.

### 2.3 Quién la consume

Equipo Catálogo de eventos, cuando Panel Organizador publica o actualiza un evento que deba verse en el catálogo.

### 2.4 Endpoint / canal propuesto

```text
Broker de eventos
Nombre exacto del evento/tópico: PENDIENTE DE ACUERDO
```

No se propone una llamada REST directa entre Panel y Catálogo para esta notificación.

### 2.5 Request (mensaje que se envía)

| Campo | Tipo propuesto | Obligatorio | Descripción |
|---|---|:---:|---|
| `id_evento` | string | Sí | Identificador del evento generado por Panel Organizador. |
| `nombre_evento` | string | Sí | Nombre del evento. |
| `horario` | string / estructura horaria | Sí | Horario del evento. Formato exacto pendiente. |
| `fecha_evento` | fecha | Sí | Fecha del evento. |
| `direccion_evento` | string | Sí | Dirección/ubicación del evento. |
| `descripcion` | string | Sí | Descripción pública del evento. |
| `nuevo_estado` | string | Sí para cambios de estado | Estado vigente del evento. |
| `fecha_cambio` | fecha-hora | Sí para actualizaciones | Fecha del cambio comunicado. |

**Ejemplo ilustrativo del mensaje:**

```json
{
  "id_evento": "evt-001",
  "nombre_evento": "Seminario universitario",
  "horario": "18:00",
  "fecha_evento": "2026-10-15",
  "direccion_evento": "Campus universitario",
  "descripcion": "Descripción del evento",
  "nuevo_estado": "Publicado",
  "fecha_cambio": "2026-09-10T12:00:00"
}
```

> **Nota de diseño:** el Excel de dependencias identifica como datos recibidos por Catálogo desde Panel: nombre, horario, fecha, dirección y descripción. El documento previo de Panel también menciona ID, estado y fecha/tipo de cambio para eventos publicados o actualizados.

> **Pendiente de consistencia:** el documento previo también menciona precio de entradas hacia Catálogo, mientras que la presentación del proyecto asigna a Catálogo la gestión de tipo (gratis/pago) y precio. La propiedad y dirección definitiva de `precio` debe acordarse antes de añadirlo a este contrato.

### 2.6 Response (lo que se recibe)

No existe una respuesta funcional síncrona de Catálogo a Panel Organizador en el flujo definido por broker.

| Campo | Tipo | Obligatorio | Descripción |
|---|---|:---:|---|
| — | — | — | No aplica como response de negocio síncrona. |

> La política de ACK/reintentos del broker debe definirse con el equipo de plataforma.

### 2.7 Códigos de error

No aplican códigos HTTP entre Panel y Catálogo para el mensaje asíncrono.

| Situación | Manejo |
|---|---|
| Mensaje inválido | Pendiente definir validación/rechazo. |
| Catálogo temporalmente no disponible | Debe resolverse mediante la política del broker. |
| Error de procesamiento | Pendiente definir reintentos y dead-letter queue, si corresponde. |

### 2.8 Tiempo de respuesta esperado (SLA)

**Pendiente de acordar.**

---

## 3. Reglas de uso (lado consumidor)

1. Catálogo consume únicamente eventos/mensajes acordados provenientes de Panel Organizador.
2. Usa los datos recibidos para mantener actualizada la información pública del evento.
3. No modifica la fuente de verdad del ciclo de vida del evento en Panel Organizador.
4. Si el mensaje no cumple el esquema acordado, debe aplicar el manejo de errores definido con plataforma.
5. Los cambios de contrato deben coordinarse antes de integración.

---

## 4. Versionado y cambios

- Versionar cualquier cambio de esquema.
- Los breaking changes requieren período de transición.
- El nombre del evento/tópico y su versión deben quedar documentados una vez acordados.

## 5. Dueños del contrato

| Rol | Equipo | Contacto |
|---|---|---|
| Dueño del contrato | Panel Organizador | Pendiente |
| Consumidor principal | Catálogo de eventos | Pendiente |

---

## 6. Pendientes a acordar

- [ ] Confirmar nombre exacto del evento/tópico.
- [ ] Confirmar formato de `horario` y `fecha_evento`.
- [ ] Confirmar si `nuevo_estado` y `fecha_cambio` viajan en el mismo mensaje o en uno separado.
- [ ] Resolver propiedad/dirección del dato `precio`.
- [ ] Confirmar política de ACK, reintentos y errores del broker.
- [ ] Confirmar SLA.
