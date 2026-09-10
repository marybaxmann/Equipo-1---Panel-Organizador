# Contrato de interfaz: Panel Organizador ↔ Promociones

**Versión:** 1.0

**Equipo consumidor:** Promociones

**Equipo proveedor:** Panel Organizador

**Basado en:** Dependencia de datos definida en clase para asociación de promociones a eventos.

---

## 1. Propósito

Promociones necesita conocer el identificador del evento para asociar códigos o descuentos al evento correspondiente. La matriz de dependencias indica que `id evento` llega a Promociones desde Panel Organizador.

La generación y gestión de promociones pertenece al microservicio Promociones, no a Panel Organizador.

---

## 2. Operación: Comunicar identificación del evento

### 2.1 Descripción

Panel Organizador comunica a Promociones el identificador de un evento para permitir que el servicio de Promociones lo utilice como referencia.

### 2.2 Quién la expone

Equipo Panel Organizador.

### 2.3 Quién la consume

Equipo Promociones, cuando necesite asociar una promoción/código a un evento.

### 2.4 Endpoint / canal propuesto

```text
Broker de eventos o mecanismo de consulta: PENDIENTE DE ACUERDO
```

La documentación entregada no define aún si este dato será enviado proactivamente por broker o consultado mediante una API.

### 2.5 Request (lo que se envía)

| Campo | Tipo propuesto | Obligatorio | Descripción |
|---|---|:---:|---|
| `id_evento` | string | Sí | Identificador del evento generado por Panel Organizador. |

**Ejemplo ilustrativo:**

```json
{
  "id_evento": "evt-001"
}
```

> **Nota de diseño:** el contrato se mantiene mínimo porque la matriz solo identifica `id evento (panel)` como dato recibido por Promociones desde este microservicio.

### 2.6 Response (lo que se recibe)

No se identifica en los documentos proporcionados un dato que Promociones deba devolver directamente a Panel Organizador.

| Campo | Tipo | Obligatorio | Descripción |
|---|---|:---:|---|
| — | — | — | No aplica según la información disponible. |

> Promociones genera porcentaje de descuento, fechas de vigencia, cantidad de códigos y nombre del código, pero la matriz no indica que esos datos sean recibidos directamente por Panel Organizador.

### 2.7 Códigos de error

**Pendiente**, ya que el protocolo exacto no está acordado.

### 2.8 Tiempo de respuesta esperado (SLA)

**Pendiente de acordar.**

---

## 3. Reglas de uso (lado consumidor)

1. Promociones utiliza `id_evento` para asociar la promoción al evento correcto.
2. Panel no genera el porcentaje de descuento ni los códigos de promoción.
3. No se deben añadir campos no acordados al contrato.
4. Si se elige broker, el manejo de reintentos/errores se coordinará con plataforma.

---

## 4. Versionado y cambios

- Versionar cualquier cambio.
- Breaking changes requieren transición acordada.
- El protocolo definitivo debe registrarse antes de implementación.

## 5. Dueños del contrato

| Rol | Equipo | Contacto |
|---|---|---|
| Dueño del contrato | Panel Organizador | Pendiente |
| Consumidor principal | Promociones | Pendiente |

---

## 6. Pendientes a acordar

- [ ] Confirmar protocolo: broker o REST.
- [ ] Confirmar nombre de evento/tópico o endpoint.
- [ ] Confirmar momento en que se comparte `id_evento`.
- [ ] Confirmar SLA y manejo de errores.
