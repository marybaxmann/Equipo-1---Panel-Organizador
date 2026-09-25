# Contrato de interfaz: Panel Organizador ↔ Catálogo de Eventos

**Versión:** 1.0

**Equipo consumidor:** Catálogo de Eventos

**Equipo proveedor:** Panel Organizador

**Basado en:** HU-02 Editar evento; HU-04 Publicar evento; HU-07 Notificar cambios de estado.

---

## 1. Propósito

Catálogo de Eventos necesita consultar la información de los eventos para mostrarlos en la aplicación web/móvil, realizar búsquedas y filtros, y mostrar el detalle de cada evento.

Panel Organizador es responsable de crear y administrar la información principal del evento. Por lo tanto, Panel actúa como fuente de los datos descriptivos del evento y de su estado de gestión.

Para la comunicación entre ambos equipos se proponen dos mecanismos:

* **REST:** Catálogo consulta información a Panel cuando necesita cargar, buscar o visualizar eventos.
* **Broker:** Panel comunica a Catálogo cuando un evento es publicado o actualizado y el cambio debe reflejarse en el catálogo.

---

# 2. Operaciones de la interfaz

## Operación 1: Solicitar eventos próximos

### 2.1 Descripción

Obtiene el listado de los eventos próximos a realizarse para desplegarlos en la pantalla principal del catálogo.

### 2.2 Quién la expone

Equipo Panel Organizador.

### 2.3 Quién la consume

Equipo Catálogo de Eventos.

### 2.4 Endpoint propuesto

```text
GET /api/v1/organizador/eventos/proximos
```

### 2.5 Request

| Campo    | Tipo    | Obligatorio | Descripción                            |
| -------- | ------- | :---------: | -------------------------------------- |
| `limite` | integer |      No     | Cantidad máxima de eventos a retornar. |

Ejemplo:

```text
GET /api/v1/organizador/eventos/proximos?limite=6
```

### 2.6 Response

| Campo     | Tipo          | Obligatorio | Descripción                             |
| --------- | ------------- | :---------: | --------------------------------------- |
| `eventos` | array[object] |      Sí     | Lista de eventos próximos a realizarse. |

Cada evento contiene:

| Campo                   | Tipo              | Obligatorio | Descripción                                              |
| ----------------------- | ----------------- | :---------: | -------------------------------------------------------- |
| `id_evento`             | string            |      Sí     | Identificador único del evento.                          |
| `titulo`                | string            |      Sí     | Nombre del evento.                                       |
| `lugar`                 | string            |      Sí     | Ubicación o recinto del evento.                          |
| `fecha`                 | string (ISO 8601) |      Sí     | Fecha y hora de realización del evento.                  |
| `imagen`                | string (URL)      |      Sí     | URL de la imagen asociada al evento.                     |
| `stock`                 | integer           |      Sí     | Cantidad de entradas disponibles para el evento.         |
| `precio`                | number            |      Sí     | Precio de la entrada. `0` representa un evento gratuito. |
| `categoria`             | string            |      Sí     | Categoría del evento.                                    |
| `estado_disponibilidad` | string            |      Sí     | Estado de disponibilidad del evento.                     |

Los valores propuestos para `estado_disponibilidad` son:

```text
DISPONIBLE
AGOTADO
PASADO
```

Ejemplo:

```json
{
  "eventos": [
    {
      "id_evento": "evt-101",
      "titulo": "Feria de Innovación TITEC",
      "lugar": "Auditorio Principal",
      "fecha": "2026-09-25T10:00:00Z",
      "imagen": "https://ticketu.cl/img/evt-101.jpg",
      "stock": 150,
      "precio": 0,
      "categoria": "academico",
      "estado_disponibilidad": "DISPONIBLE"
    }
  ]
}
```

### 2.7 Códigos de error

| Código | Significado                          |
| ------ | ------------------------------------ |
| `400`  | Parámetro `limite` inválido.         |
| `500`  | Error interno del Panel Organizador. |

Si no existen eventos próximos, se retorna un arreglo vacío:

```json
{
  "eventos": []
}
```

### 2.8 Tiempo de respuesta esperado (SLA)

**< 500 ms**

---

# 3. Operación 2: Buscar eventos por filtro

### 3.1 Descripción

Permite buscar y filtrar eventos utilizando distintos criterios definidos por Catálogo.

### 3.2 Quién la expone

Equipo Panel Organizador.

### 3.3 Quién la consume

Equipo Catálogo de Eventos.

### 3.4 Endpoint propuesto

```text
POST /api/v1/organizador/eventos/buscar
```

### 3.5 Request

| Campo                   | Tipo              | Obligatorio | Descripción                                 |
| ----------------------- | ----------------- | :---------: | ------------------------------------------- |
| `criterio`              | string            |      No     | Texto de búsqueda por título o descripción. |
| `categoria`             | string            |      No     | Categoría del evento.                       |
| `fecha_inicio`          | string (ISO 8601) |      No     | Fecha inicial del rango de búsqueda.        |
| `fecha_fin`             | string (ISO 8601) |      No     | Fecha final del rango de búsqueda.          |
| `estado_disponibilidad` | string            |      No     | Filtro por disponibilidad del evento.       |

Valores propuestos:

```text
DISPONIBLE
AGOTADO
PASADO
```

Ejemplo:

```json
{
  "criterio": "Feria",
  "categoria": "academico",
  "estado_disponibilidad": "DISPONIBLE"
}
```

### 3.6 Response

| Campo     | Tipo          | Obligatorio | Descripción                                                   |
| --------- | ------------- | :---------: | ------------------------------------------------------------- |
| `eventos` | array[object] |      Sí     | Lista de eventos que coinciden con los criterios solicitados. |

Los elementos utilizan la misma estructura definida en la Operación 1.

Si no existen coincidencias:

```json
{
  "eventos": []
}
```

### 3.7 Códigos de error

| Código | Significado                          |
| ------ | ------------------------------------ |
| `400`  | Parámetros de búsqueda inválidos.    |
| `500`  | Error interno del Panel Organizador. |

### 3.8 Tiempo de respuesta esperado (SLA)

**< 500 ms**

---

# 4. Operación 3: Solicitar detalle de evento

### 4.1 Descripción

Entrega la información completa de un evento específico para mostrar su vista de detalle.

### 4.2 Quién la expone

Equipo Panel Organizador.

### 4.3 Quién la consume

Equipo Catálogo de Eventos.

### 4.4 Endpoint propuesto

```text
GET /api/v1/organizador/eventos/{id_evento}
```

### 4.5 Request

| Campo       | Tipo          | Obligatorio | Descripción                     |
| ----------- | ------------- | :---------: | ------------------------------- |
| `id_evento` | string (path) |      Sí     | Identificador único del evento. |

Ejemplo:

```text
GET /api/v1/organizador/eventos/evt-101
```

### 4.6 Response

| Campo                   | Tipo              | Obligatorio | Descripción                                              |
| ----------------------- | ----------------- | :---------: | -------------------------------------------------------- |
| `id_evento`             | string            |      Sí     | Identificador único del evento.                          |
| `titulo`                | string            |      Sí     | Nombre del evento.                                       |
| `descripcion`           | string            |      Sí     | Descripción extendida del evento.                        |
| `lugar`                 | string            |      Sí     | Recinto o ubicación del evento.                          |
| `fecha`                 | string (ISO 8601) |      Sí     | Fecha y hora de realización.                             |
| `imagen`                | string (URL)      |      Sí     | URL de la imagen asociada al evento.                     |
| `stock`                 | integer           |      Sí     | Cantidad de entradas disponibles.                        |
| `precio`                | number            |      Sí     | Precio de la entrada. `0` representa un evento gratuito. |
| `tipo_evento`           | string            |      Sí     | Tipo de evento: `gratuito` o `pagado`.                   |
| `categoria`             | string            |      Sí     | Categoría del evento.                                    |
| `estado_gestion`        | string            |      Sí     | Estado de gestión del evento en Panel.                   |
| `estado_disponibilidad` | string            |      Sí     | Estado de disponibilidad para el usuario.                |

### Estados de gestión

Los estados de gestión manejados por Panel son:

```text
BORRADOR
PUBLICADO
FINALIZADO
CANCELADO
```

### Estados de disponibilidad

Para la visualización en Catálogo se proponen:

```text
DISPONIBLE
AGOTADO
PASADO
```

Estos estados representan la disponibilidad del evento para el usuario y no reemplazan los estados internos de gestión de Panel.

Ejemplo:

```json
{
  "id_evento": "evt-101",
  "titulo": "Feria de Innovación TITEC",
  "descripcion": "Muestra anual de proyectos de ingeniería y tecnología.",
  "lugar": "Auditorio Principal",
  "fecha": "2026-09-25T10:00:00Z",
  "imagen": "https://ticketu.cl/img/evt-101.jpg",
  "stock": 150,
  "precio": 0,
  "tipo_evento": "gratuito",
  "categoria": "academico",
  "estado_gestion": "PUBLICADO",
  "estado_disponibilidad": "DISPONIBLE"
}
```

### 4.7 Códigos de error

| Código | Significado                          |
| ------ | ------------------------------------ |
| `400`  | `id_evento` ausente o inválido.      |
| `404`  | El evento solicitado no existe.      |
| `500`  | Error interno del Panel Organizador. |

### 4.8 Tiempo de respuesta esperado (SLA)

**< 500 ms**

---

# 5. Operación 4: Publicar o actualizar datos de un evento mediante broker

### 5.1 Descripción

Panel Organizador publica un mensaje en el broker cuando un evento es publicado o actualizado y el cambio debe reflejarse en Catálogo.

### 5.2 Quién publica

Equipo Panel Organizador.

### 5.3 Quién consume

Equipo Catálogo de Eventos.

### 5.4 Canal propuesto

```text
Broker de eventos
Tópico: panel.evento.catalogo.v1
```

**Nombre exacto del tópico: pendiente de confirmación con Catálogo.**

### 5.5 Mensaje propuesto

| Campo              | Tipo              | Obligatorio | Descripción                               |
| ------------------ | ----------------- | :---------: | ----------------------------------------- |
| `id_evento`        | string            |      Sí     | Identificador del evento.                 |
| `nombre_evento`    | string            |      Sí     | Nombre del evento.                        |
| `horario`          | string            |      Sí     | Hora de realización del evento.           |
| `fecha_evento`     | string (ISO 8601) |      Sí     | Fecha del evento.                         |
| `direccion_evento` | string            |      Sí     | Dirección o ubicación del evento.         |
| `descripcion`      | string            |      Sí     | Descripción pública del evento.           |
| `imagen`           | string (URL)      |      Sí     | URL de la imagen asociada al evento.      |
| `precio`           | number            |      Sí     | Precio de la entrada. `0` si es gratuito. |
| `categoria`        | string            |      Sí     | Categoría del evento.                     |
| `nuevo_estado`     | string            |      Sí     | Nuevo estado de gestión del evento.       |
| `fecha_cambio`     | string (ISO 8601) |      Sí     | Fecha y hora del cambio comunicado.       |

Ejemplo:

```json
{
  "id_evento": "evt-001",
  "nombre_evento": "Seminario universitario",
  "horario": "18:00",
  "fecha_evento": "2026-10-15T18:00:00Z",
  "direccion_evento": "Campus universitario",
  "descripcion": "Descripción del evento",
  "imagen": "https://ticketu.cl/img/evt-001.jpg",
  "precio": 5000,
  "categoria": "academico",
  "nuevo_estado": "PUBLICADO",
  "fecha_cambio": "2026-09-25T12:00:00"
}
```

### 5.6 Response

No existe una respuesta funcional síncrona de Catálogo a Panel para este flujo.

La confirmación de recepción, ACK, reintentos y manejo de errores se realizará según la política definida para el broker.

### 5.7 Códigos de error

No aplican códigos HTTP al flujo asíncrono.

Queda pendiente definir:

* validación de mensajes inválidos;
* política de reintentos;
* manejo de mensajes no procesables;
* dead-letter queue, si corresponde.

---

# 6. Reglas de uso

### Consultas REST

1. Al cargar la pantalla principal, Catálogo solicita los eventos próximos mediante `GET /api/v1/organizador/eventos/proximos`.
2. Al utilizar el buscador o filtros, Catálogo utiliza `POST /api/v1/organizador/eventos/buscar`.
3. Al seleccionar un evento, Catálogo consulta `GET /api/v1/organizador/eventos/{id_evento}`.
4. Si `estado_disponibilidad` es `AGOTADO` o `PASADO`, Catálogo debe impedir iniciar una nueva compra desde la interfaz.

### Comunicación mediante broker

5. Panel publica un mensaje cuando un evento es publicado o actualizado.
6. Catálogo consume el mensaje y actualiza la información correspondiente.
7. Catálogo no modifica la fuente de verdad del ciclo de vida del evento en Panel.
8. Los cambios de contrato deben coordinarse entre ambos equipos antes de la integración.

---

# 7. Versionado y cambios

* Los endpoints REST utilizan versionado mediante `/v1/`.
* Los mensajes del broker utilizan versionado mediante el nombre del tópico, por ejemplo `panel.evento.catalogo.v1`.
* Los cambios incompatibles en el request, response o mensaje requieren una nueva versión.
* Los breaking changes requieren un período de transición acordado entre ambos equipos.
* Los cambios deben ser comunicados al equipo consumidor antes de su implementación.


# 8. Pendientes a acordar

* [ ] Confirmar aceptación de REST para consultas.
* [ ] Confirmar aceptación del broker para actualizaciones.
* [ ] Confirmar nombre exacto del tópico.
* [ ] Confirmar formato definitivo de `fecha` y `horario`.
* [ ] Confirmar categorías disponibles para los eventos.
* [ ] Confirmar los estados de disponibilidad: `DISPONIBLE`, `AGOTADO`, `PASADO`.
* [ ] Confirmar la relación entre `estado_gestion` y `estado_disponibilidad`.
* [ ] Confirmar política de actualización de `stock` proveniente de Entradas.
* [ ] Confirmar política de ACK, reintentos y errores del broker.
* [ ] Confirmar SLA de los endpoints REST: **< 500 ms**.
