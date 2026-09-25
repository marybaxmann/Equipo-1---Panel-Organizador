# Contrato de interfaz: Panel Organizador ↔ Promociones

**Versión:** 1.1  
**Proveedor:** Panel Organizador  
**Consumidor:** Promociones

---

## 1. Propósito

Definir la comunicación mediante la cual **Panel Organizador** entrega a **Promociones** el identificador necesario para asociar promociones a un evento.

La creación y gestión de promociones corresponde exclusivamente a Promociones.

---

## 2. Base definida por Panel

Panel dispone del siguiente dato para esta integración:

| Campo | Tipo | Fuente de verdad | Uso |
|---|---|---|---|
| `id_evento` | string | Panel Organizador | Asociar la promoción al evento correspondiente |

Ejemplo:

```json
{
  "id_evento": "evt-001"
}
```

Panel no genera ni administra:

- códigos promocionales;
- porcentajes de descuento;
- vigencia de promociones;
- cantidad de códigos;
- precio resultante de promociones.

---

## 3. Propuestas de Panel pendientes de confirmación

### 3.1 Comunicación Panel → Promociones

**Panel propone:** compartir `id_evento` cuando el evento esté disponible para que Promociones pueda asociar sus promociones.

El mecanismo definitivo queda pendiente:

```text
Broker o REST
```

**Pendiente de confirmación por Promociones:**

- mecanismo de comunicación;
- momento exacto en que necesita recibir `id_evento`;
- tópico o endpoint correspondiente.

### 3.2 Comunicación Promociones → Panel

Con la información disponible, no se identifica actualmente ningún dato que Promociones deba devolver directamente a Panel.

Por lo tanto, no se define por ahora una comunicación Promociones → Panel.

---

## 4. Pendientes de confirmación

1. Mecanismo de comunicación: broker o REST.
2. Tópico o endpoint.
3. Momento en que Promociones necesita recibir `id_evento`.
4. Si Promociones requiere algún dato adicional del evento.
5. Si Panel debe recibir algún dato desde Promociones.
6. SLA y manejo de errores.
7. Contactos responsables de ambos equipos.
