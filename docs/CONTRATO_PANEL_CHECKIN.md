# Contrato de interfaz: Panel Organizador ↔ Check-in

**Versión:** 1.0

**Equipo consumidor:** Check-in

**Equipo proveedor:** Panel Organizador

**Basado en:** Publicación/actualización de eventos y dependencia de datos acordada en clase.

---

## 1. Propósito

Check-in necesita información básica del evento para identificar correctamente el evento sobre el que realizará la validación de entradas mediante QR. La matriz de dependencias indica que esos datos provienen de Panel Organizador.

---

## 2. Operación: Entregar datos de identificación del evento

### 2.1 Descripción

Panel Organizador comunica a Check-in los datos básicos de un evento necesarios para asociar posteriormente la validación de entradas y asistencia.

### 2.2 Quién la expone

Equipo Panel Organizador.

### 2.3 Quién la consume

Equipo Check-in, cuando necesite registrar o actualizar la información del evento que será utilizada durante la validación de entradas.

### 2.4 Endpoint / canal propuesto

```text
Broker de eventos
Nombre exacto del evento/tópico: PENDIENTE DE ACUERDO
```

### 2.5 Request (mensaje que se envía)

| Campo | Tipo propuesto | Obligatorio | Descripción |
|---|---|:---:|---|
| `id_evento` | string | Sí | Identificador del evento. |
| `nombre_evento` | string | Sí | Nombre del evento. |
| `direccion_evento` | string | Sí | Dirección/ubicación del evento. |
| `fecha_evento` | fecha | Sí | Fecha del evento. |
| `hora_inicio` | hora/string | Pendiente | Hora de inicio. |
| `hora_fin` | hora/string | Pendiente | Hora de término. |

**Ejemplo ilustrativo:**

```json
{
  "id_evento": "evt-001",
  "nombre_evento": "Seminario universitario",
  "direccion_evento": "Campus universitario",
  "fecha_evento": "2026-10-15",
  "hora_inicio": "18:00",
  "hora_fin": "20:00"
}
```

> **Nota de diseño:** en la fila de Panel Organizador el dato aparece como `horario`, mientras que en la fila de Check-in se desglosa como `hora inicio` y `hora fin`. El formato y descomposición definitivos deben acordarse entre los equipos.

### 2.6 Response (lo que se recibe)

No se identifica en los documentos proporcionados un dato de negocio que Check-in deba devolver directamente a Panel Organizador para esta operación.

| Campo | Tipo | Obligatorio | Descripción |
|---|---|:---:|---|
| — | — | — | No aplica según la información disponible. |

### 2.7 Códigos de error

No aplican códigos HTTP si el intercambio se realiza por broker. Manejo de reintentos/errores pendiente con plataforma.

### 2.8 Tiempo de respuesta esperado (SLA)

**Pendiente de acordar.**

---

## 3. Reglas de uso (lado consumidor)

1. Check-in utiliza `id_evento` como referencia del evento.
2. Conserva los datos necesarios para identificar el evento durante el proceso de validación.
3. No utiliza este contrato para obtener el QR o ticket; esos datos corresponden a Entradas / Inventario.
4. Cambios en horario, fecha o dirección deben propagarse conforme al evento/tópico acordado.

---

## 4. Versionado y cambios

- Todo cambio en el esquema debe versionarse.
- Breaking changes requieren transición acordada.
- El formato temporal debe mantenerse consistente entre ambos equipos.

## 5. Dueños del contrato

| Rol | Equipo | Contacto |
|---|---|---|
| Dueño del contrato | Panel Organizador | Pendiente |
| Consumidor principal | Check-in | Pendiente |

---

## 6. Pendientes a acordar

- [ ] Confirmar nombre exacto del evento/tópico.
- [ ] Confirmar si `horario` se envía como un solo campo o como `hora_inicio` y `hora_fin`.
- [ ] Confirmar formatos de fecha/hora.
- [ ] Confirmar cuándo Check-in debe recibir actualizaciones.
- [ ] Confirmar SLA y política del broker.
