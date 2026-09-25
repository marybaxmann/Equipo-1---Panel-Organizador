# Contrato de interfaz: Panel Organizador ↔ Catálogo de Eventos

**Versión:** 1.1  
**Proveedor:** Panel Organizador  
**Consumidor:** Catálogo de Eventos

---

## 1. Propósito

Definir la comunicación entre **Panel Organizador** y **Catálogo de Eventos** para consultar y actualizar la información pública de los eventos.

Panel Organizador mantiene los datos del evento y Catálogo los consume para mostrarlos en la aplicación.

---

## 2. Acuerdos confirmados

### 2.1 Responsabilidades

| Información | Responsable |
|---|---|
| Datos generales del evento | Panel Organizador |
| Estado de gestión | Panel Organizador |
| Disponibilidad del evento | Panel Organizador, a partir de la información disponible |
| Visualización y filtros | Catálogo de Eventos |

### 2.2 Consultas REST

Ambos equipos contemplan:

```http
GET /api/v1/organizador/eventos/proximos
POST /api/v1/organizador/eventos/buscar
GET /api/v1/organizador/eventos/{id_evento}
```

SLA propuesto para las consultas:

```text
< 500 ms
```

---

## 3. Propuestas de Panel pendientes de confirmación

### 3.1 Campos utilizados por Panel


| Campo | Tipo | Uso |
|---|---|---|
| `id_evento` | string | Identificador del evento |
| `nombre_evento` | string | Nombre público |
| `descripcion` | string | Descripción del evento |
| `direccion_evento` | string | Ubicación |
| `fecha_evento` | ISO 8601 | Fecha |
| `hora_evento` | string | Hora |
| `imagen` | URL | Imagen |
| `categoria` | string | Categoría |
| `precio` | number | Precio definido para el evento |
| `tipo_entrada` | string | `GRATUITA` o `PAGADA` |
| `estado_gestion` | string | Estado administrativo |
| `estado_disponibilidad` | string | Disponibilidad para el usuario |

Panel mantiene:

```text
estado_gestion:
BORRADOR
PUBLICADO
FINALIZADO
CANCELADO
```

y separadamente:

```text
estado_disponibilidad:
DISPONIBLE
AGOTADO
PASADO
```

`AGOTADO` se establece en Panel cuando la información proveniente de Entradas indica que no quedan entradas disponibles.

**Pendiente de confirmación por Catálogo:** aceptar estos nombres y valores como estructura común.

---

### 3.2 Respuesta de listado y detalle

**Panel** no cuenta con el campo `stock` para enviar Catálogo, ya que ese dato pertenece a Entradas / Inventario.

Ejemplo:

```json
{
  "id_evento": "evt-101",
  "nombre_evento": "Feria de Innovación TITEC",
  "descripcion": "Muestra anual de proyectos.",
  "direccion_evento": "Auditorio Principal",
  "fecha_evento": "2026-09-25",
  "hora_evento": "10:00",
  "imagen": "https://ticketu.cl/img/evt-101.jpg",
  "categoria": "academico",
  "precio": 0,
  "tipo_entrada": "GRATUITA",
  "estado_gestion": "PUBLICADO",
  "estado_disponibilidad": "DISPONIBLE"
}
```

Catálogo podrá utilizar `estado_disponibilidad` para habilitar o impedir nuevas compras.

---

### 3.3 Actualización mediante broker

**Panel propone** utilizar:

```text
Panel Organizador → Broker → Catálogo de Eventos
```

Tópico:

```text
panel.evento.catalogo.v1
```

Panel publicará el mensaje cuando un evento sea publicado o actualizado y el cambio deba reflejarse en Catálogo.

El mensaje utilizará los mismos nombres de campos definidos en este contrato.

**Pendiente de confirmación:**

- aceptación del broker;
- tópico `panel.evento.catalogo.v1`;
- política de ACK y reintentos.

---

## 4. Pendientes de confirmación

1. Aceptación de los nombres de campos definidos por Panel.
2. Valores de `estado_disponibilidad`.
3. Uso de broker para actualizaciones y tópico `panel.evento.catalogo.v1`.
4. Política de ACK y reintentos.
5. SLA de consultas REST `< 500 ms`.
