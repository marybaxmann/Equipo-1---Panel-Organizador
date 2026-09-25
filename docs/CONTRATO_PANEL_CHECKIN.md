# Contrato de interfaz: Panel Organizador ↔ Check-in

**Versión:** 1.1  
**Proveedor:** Panel Organizador  
**Consumidor:** Check-in

---

## 1. Propósito

Definir la comunicación mediante la cual **Panel Organizador** entrega a **Check-in** los datos básicos necesarios para identificar el evento asociado a la validación de entradas mediante QR.

Check-in utiliza esta información únicamente como referencia del evento. La gestión de tickets o códigos QR corresponde a Entradas / Inventario.

---

## 2. Base definida por Panel

### 2.1 Datos disponibles

Panel utiliza los siguientes campos:

| Campo | Tipo | Descripción |
|---|---|---|
| `id_evento` | string | Identificador único del evento. |
| `nombre_evento` | string | Nombre del evento. |
| `direccion_evento` | string | Dirección o ubicación. |
| `fecha_evento` | string (ISO 8601) | Fecha del evento. |
| `hora_evento` | string | Hora de inicio del evento. |

Panel no mantiene actualmente un campo `hora_fin`, por lo que no se incorpora a este contrato mientras no exista un acuerdo específico.

---

## 3. Propuestas de Panel pendientes de confirmación

### 3.1 Comunicación mediante broker

**Panel propone:**

```text
Panel Organizador → Broker → Check-in
```

Tópico:

```text
panel.evento.checkin.v1
```

### Mensaje propuesto

```json
{
  "id_evento": "evt-001",
  "nombre_evento": "Seminario universitario",
  "direccion_evento": "Campus universitario",
  "fecha_evento": "2026-10-15",
  "hora_evento": "18:00"
}
```

Panel propone publicar este mensaje cuando el evento sea creado o cuando cambien datos que Check-in necesite mantener actualizados.

**Pendiente de confirmación por Check-in:**

- aceptar el tópico `panel.evento.checkin.v1`;
- confirmar si estos campos son suficientes;
- confirmar en qué cambios necesita recibir una actualización.

---

### 3.2 Respuesta Check-in → Panel

Con la información disponible, no se identifica actualmente ningún dato de negocio que Check-in deba devolver a Panel para esta integración.

No se define por ahora una comunicación Check-in → Panel.

---

### 3.3 Errores y SLA

Al utilizar broker, no aplican códigos HTTP a este flujo.

La política de ACK, reintentos, errores y SLA queda pendiente de definición conjunta.

---

## 4. Pendientes de confirmación

1. Tópico `panel.evento.checkin.v1`.
2. Confirmar si los campos propuestos son suficientes.
3. Cambios del evento que Check-in necesita recibir.
4. Política de ACK, reintentos y manejo de errores.
5. SLA.
6. Contactos responsables de ambos equipos.
