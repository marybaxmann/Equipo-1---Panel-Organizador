# Plan de Pruebas de Contrato — Sprint 3 (TASK-02)

**Responsable:** Etienne Araya (Calidad / Integración · Panel Organizador)  
**Marco:** Evaluación 2 · Sprint 3 "Integración con la plataforma TicketU"  
**Objetivo:** Validar de forma exhaustiva los contratos de interfaz REST y Broker AMQP entre Panel Organizador y los 6 microservicios de la plataforma TicketU, asegurando el cumplimiento de esquemas, códigos de respuesta, manejo de errores, SLAs e idempotencia, sin acoplamiento temporal ni dependencias no confirmadas.

---

## 1. Alcance y Estrategia de Pruebas

El plan cubre las pruebas de contrato (Consumer-Driven Contracts y Provider Verification) para dos canales de comunicación:
1. **Canal Sincrónico (HTTP REST vía API Gateway):** Validación de endpoints bajo la ruta pública `/api/organizador/v1/*` (y `/internal/*`), validación de schemas JSON contra OpenAPI (`docs/api/openapi.yaml`), validación de autenticación y códigos de error (200, 201, 400, 401, 403, 404, 503). La regla del API Gateway es reemplazar `/api/v1` por `/api/organizador/v1` preservando intacto el resto del path.
2. **Canal Asíncrono (RabbitMQ Broker):** Validación de publicación hacia el exchange `ticketu.events` (topic), enrutamiento por routing keys `panel.evento.<squad>.v1`, verificación del sobre AMQP (propiedades `messageId`, `type`, `appId`, `headers`) y payload JSON correspondiente a cada contrato (ADR-0013 y ADR-0014).

### Herramientas de Ejecución
- **Newman / Postman:** Suite automatizada de pruebas de integración y contrato HTTP (`postman/panel-organizador.postman_collection.json`) con variables de entorno para API Gateway (`postman/gateway.postman_environment.json`) y ejecución local (`postman/local.postman_environment.json`).
- **Vitest (OpenAPI Schema Validator):** Pruebas automatizadas de contrato OpenAPI (`tests/contrato-openapi.test.ts`) que contrastan las respuestas reales contra la especificación YAML.
- **Consumer Mock Scripts / RabbitMQ CLI:** Verificación pasiva de colas durables de prueba vinculadas a `ticketu.events`.

---

## 2. Matriz de Pruebas de Contrato por Microservicio

### 2.1 Auth ↔ Panel Organizador (Contrato v1.1, propuesta v1.2)
*Panel actúa como consumidor de Auth (`GET /internal/validar-sesion`).*

| ID Test | Canal / Endpoint | Caso de Prueba | Entrada | Resultado Esperado | Criterio de Éxito |
|---|---|---|---|---|---|
| **TC-AUTH-01** | REST `/internal/validar-sesion` | Validación de organizador activo | Cookie `jwt=token-org-a` | HTTP 200, `valido: true`, `usuario.rol: "organizador"`, `id_usuario: UUID` | Sesión válida, identidad UUID canónica |
| **TC-AUTH-02** | REST `/internal/validar-sesion` | Validación de staff de Check-in | Cookie `jwt=token-staff` | HTTP 200, `valido: true`, `usuario.rol: "staff"` | Permite acceso a endpoints compartidos |
| **TC-AUTH-03** | REST `/internal/validar-sesion` | Sesión expirada o inválida | Cookie `jwt=token-expirado` | HTTP 401 | Panel rechaza operación y no procesa datos |
| **TC-AUTH-04** | REST `/internal/validar-sesion` | Rol asistente no autorizado | Cookie `jwt=token-asistente` | HTTP 200 de Auth, pero Panel deniega con HTTP 403 `FORBIDDEN_ROLE` | Panel aplica autorización de roles |
| **TC-AUTH-05** | REST `/internal/validar-sesion` | Indisponibilidad / Timeout de Auth | Token lento / Auth offline | Timeout tras 1 s (+ 1 reintento) → Panel responde HTTP 503 `AUTH_UNAVAILABLE` | Cumplimiento estricto de Fail-Secure |

---

### 2.2 Catálogo de Eventos ↔ Panel Organizador (Contrato v1.1, propuesta v1.2)
*Catálogo consume endpoints REST vía Gateway y se suscribe a eventos del broker.*

| ID Test | Canal / Endpoint | Caso de Prueba | Entrada | Resultado Esperado | Criterio de Éxito |
|---|---|---|---|---|---|
| **TC-CAT-01** | REST `GET /api/organizador/v1/organizador/eventos/proximos` | Listado de eventos próximos públicos | Sin sesión (público) | HTTP 200, array de eventos. Ningún evento en `BORRADOR`. Cada evento incluye `estado_disponibilidad` y `hora_fin_evento` | Cumple schema OpenAPI, sin borradores |
| **TC-CAT-02** | REST `POST /api/organizador/v1/organizador/eventos/buscar` | Búsqueda por texto libre | Body `{"texto": "feria"}` | HTTP 200, lista de eventos coincidentes en estado `PUBLICADO` | Coincidencia en nombre o descripción |
| **TC-CAT-03** | REST `GET /api/organizador/v1/organizador/eventos/{id}` | Consulta de detalle de evento publicado | `id_evento` de evento publicado | HTTP 200, objeto con datos maestros, `hora_fin_evento`, formato fecha `AAAA-MM-DD`, hora `HH:mm` | Schema de detalle validado |
| **TC-CAT-04** | REST `GET /api/organizador/v1/organizador/eventos/{id}` | Intento de consulta de un borrador | `id_evento` en estado `BORRADOR` | HTTP 404 `EVENT_NOT_FOUND` | Borrador inaccesible para Catálogo |
| **TC-CAT-05** | Broker `panel.evento.catalogo.v1` | Publicación de evento nuevo | Transición `BORRADOR` → `PUBLICADO` | Mensaje en cola con routing key `panel.evento.catalogo.v1`, `type: "evento_publicado"`, payload con campos de catálogo | Notificación asíncrona entregada |
| **TC-CAT-06** | Broker `panel.evento.catalogo.v1` | Edición de evento publicado | Modificación de fecha, ubicación o nombre | Mensaje con `type: "evento_actualizado"`, payload completo actualizado | Catálogo puede refrescar su índice |

---

### 2.3 Entradas / Inventario ↔ Panel Organizador (Contrato v1.2, propuesta v1.3)
*Entradas consume el GET de eventos y recibe eventos; Panel consume stock y alertas de stock.*

| ID Test | Canal / Endpoint | Caso de Prueba | Entrada | Resultado Esperado | Criterio de Éxito |
|---|---|---|---|---|---|
| **TC-ENT-01** | REST `GET /api/organizador/v1/panel/eventos/{id}` | Consulta de datos del evento con sesión staff | Cookie `jwt=token-staff` | HTTP 200, campos: `id_evento`, `id_usuario`, `nombre_evento`, `direccion_evento`, `fecha_evento`, `hora_evento`, `hora_fin_evento`, `cantidad_entradas`, `tipo_entrada`, `estado_gestion` | Retorna los 10 atributos de integración |
| **TC-ENT-02** | REST `GET /api/organizador/v1/panel/eventos/{id}` | Consulta sin credenciales de sesión | Sin cookie | HTTP 401 `SESSION_INVALID` | Endpoint protegido contra accesos anónimos |
| **TC-ENT-03** | Broker `panel.evento.entradas.v1` | Notificación de evento creado en borrador | Creación de evento (HU-01) | Mensaje con `type: "evento_creado"`, payload de Entradas con estado `BORRADOR` | Entradas conoce el `id_evento` inicial |
| **TC-ENT-04** | Broker `panel.evento.entradas.v1` | Notificación de publicación de evento | Publicación de evento (HU-04) | Mensaje con `type: "evento_publicado"` y datos maestros | Entradas habilita venta de entradas |
| **TC-ENT-05** | Broker `entradas.evento.stock.v1` | Notificación de stock agotado (Entradas → Panel) | Mensaje emitido por Entradas con `stock: 0` | Panel registra `estado_disponibilidad = AGOTADO` | Reflejo de agotado sin alterar `estado_gestion` |
| **TC-ENT-06** | REST `GET /api/v1/entradas/eventos/{id}/stock` | Consulta de stock previa a borrado (Panel → Entradas) | Solicitud de eliminación física | Respuesta con `stock: number`. Si `stock < cantidad_entradas`, Panel bloquea borrado físico | Prevención de eliminación con ventas |

---

### 2.4 Check-in ↔ Panel Organizador (Contrato v1.2, propuesta v1.3)
*Check-in recibe eventos por broker para su copia local y usa GET como respaldo.*

| ID Test | Canal / Endpoint | Caso de Prueba | Entrada | Resultado Esperado | Criterio de Éxito |
|---|---|---|---|---|---|
| **TC-CHK-01** | Broker `panel.evento.checkin.v1` | Recepción de evento publicado | Publicación de evento | Mensaje con `tipo_cambio: "PUBLICADO"`, payload completo incluyendo `hora_fin_evento` y `fecha_cambio` ISO 8601 | Check-in crea su copia local |
| **TC-CHK-02** | Broker `panel.evento.checkin.v1` | Reprogramación o cambio de recinto | Edición de fecha, hora o recinto | Mensaje con `tipo_cambio: "ACTUALIZADO"`, timestamp `fecha_cambio` reciente | Permite actualización idempotente |
| **TC-CHK-03** | Broker `panel.evento.checkin.v1` | Idempotencia y descarte de desfasados | Mensaje repetido o con `fecha_cambio` anterior a la copia local | Check-in descarta sin error | Sin duplicación de estado |
| **TC-CHK-04** | REST `GET /api/organizador/v1/panel/eventos/{id}` | Consulta de respaldo con sesión staff | Cookie `jwt=token-staff` | HTTP 200 con `hora_fin_evento` y `estado_gestion` (`PUBLICADO`, `FINALIZADO`, `CANCELADO`) | Respaldo operativo ante desincronización |
| **TC-CHK-05** | REST `GET /api/organizador/v1/panel/eventos/{id}` | Evento que termina después de medianoche | Evento con `hora_evento: "22:00"` y `hora_fin_evento: "04:00"` | HTTP 200, ambos horarios preservados | Válido conforme a ADR-0011 |
| **TC-CHK-06** | REST `GET /api/organizador/v1/panel/eventos/{id}` | Verificación de formato de error | Consulta con ID inexistente | Documentación y prueba de error HTTP 404 (formato Panel vs Auth) | Control de discrepancia de contrato |

---

### 2.5 Notificaciones ↔ Panel Organizador (Contrato v1.3, propuesta v1.4)
*Notificaciones recibe eventos de broker para alertar a usuarios y puede consultar historial REST.*

| ID Test | Canal / Endpoint | Caso de Prueba | Entrada | Resultado Esperado | Criterio de Éxito |
|---|---|---|---|---|---|
| **TC-NOT-01** | Broker `panel.evento.notificaciones.v1` | Notificación de cambio de estado | Evento pasa a `PUBLICADO` | Mensaje con `type: "evento_actualizado"`, payload `{ id_evento, id_usuario, nuevo_estado }` | Notificaciones recibe el cambio de estado |
| **TC-NOT-02** | Broker `panel.evento.notificaciones.v1` | Notificación de reprogramación | Edición de `fecha_evento` u `hora_evento` | Mensaje con `type: "evento_reprogramado"`, payload `{ id_evento, id_usuario, nuevo_estado, fecha_cambio: AAAA-MM-DD, hora_cambio: HH:mm:ss }` | Payload de reprogramación conforme a contrato |
| **TC-NOT-03** | REST `GET /api/organizador/v1/panel/eventos/{id}/cambios-estado` | Consulta histórica de cambios de estado | ID de evento con transiciones | HTTP 200, array de transiciones de estado ordenado del más reciente al más antiguo (cronológico descendente) | Endpoint de respaldo funcional |
| **TC-NOT-04** | Broker / Outbox | Resiliencia y SLA de emisión | Publicación de cambio en Panel | Mensaje registrado en `mensajes_salientes` y publicado en ≤ 5 s | SLA de emisión cumplido |

---

### 2.6 Promociones ↔ Panel Organizador (Contrato v1.1, propuesta v1.2)
*Promociones recibe eventos publicados para asociar códigos de descuento.*

| ID Test | Canal / Endpoint | Caso de Prueba | Entrada | Resultado Esperado | Criterio de Éxito |
|---|---|---|---|---|---|
| **TC-PRO-01** | Broker `panel.evento.promociones.v1` | Recepción de evento publicado | Transición a `PUBLICADO` | Mensaje en `panel.evento.promociones.v1` con `{ id_evento, nombre_evento, fecha_evento }` | Promociones recibe el evento para habilitar cupones |
| **TC-PRO-02** | Broker `panel.evento.promociones.v1` | No emisión sobre borradores | Creación o edición de `BORRADOR` | No se emite mensaje a `panel.evento.promociones.v1` | No se asocian descuentos a borradores |
| **TC-PRO-03** | REST `GET /api/organizador/v1/panel/eventos-disponibles` | Consulta REST de eventos disponibles | Consulta general | HTTP 200, array con los `id_evento` en estado `PUBLICADO` | Endpoint de respaldo operativo |

---

### 2.7 API Gateway y Broker RabbitMQ (Infraestructura de Plataforma)

| ID Test | Componente | Caso de Prueba | Entrada | Resultado Esperado | Criterio de Éxito |
|---|---|---|---|---|---|
| **TC-INF-01** | API Gateway (`:8080`) | Enrutamiento de prefijo `/api/organizador/v1/*` | `GET http://localhost:8080/api/organizador/v1/organizador/eventos/proximos` | Respuesta idéntica a la invocación interna | Gateway reenvía correctamente preservando path completo |
| **TC-INF-02** | API Gateway (`:8080`) | Traspaso de cabecera de autenticación | Petición con `Cookie: jwt=token-org-a` a través del Gateway | Panel recibe y valida la cookie contra Auth | Cookie preservada en tránsito |
| **TC-INF-03** | RabbitMQ Platform | Aislamiento y resiliencia del outbox ante caída del broker | RabbitMQ detenido (`docker stop ticketu-rabbitmq`) + creación de evento | API responde HTTP 201 en ~20 ms; mensaje queda `PENDIENTE` en outbox. Al reiniciar RabbitMQ, el mensaje pasa a `ENVIADO` | Zero pérdida de mensajes, desacoplamiento total |

---

## 3. Procedimiento de Ejecución de Pruebas

### Paso 1: Inicialización del entorno
```bash
# Levantar MongoDB y Auth simulado
npm run infra:up

# Cargar base de datos determinista
npm run db:init; npm run db:seed

# Iniciar la API en background o terminal separada
npm run dev:api
```

### Paso 2: Ejecución de pruebas de contrato OpenAPI
```bash
npm test -w backend -- tests/contrato-openapi.test.ts
```

### Paso 3: Ejecución de pruebas de integración HTTP vía Newman
```bash
# Prueba directa local (puerto 3000)
npx newman run postman/panel-organizador.postman_collection.json -e postman/local.postman_environment.json

# Prueba a través del API Gateway (puerto 8080)
npx newman run postman/panel-organizador.postman_collection.json -e postman/gateway.postman_environment.json
```

### Paso 4: Verificación del Outbox Relay y RabbitMQ
```bash
npm test -w backend -- tests/outbox-relay.test.ts
```

---

## 4. Criterios de Aceptación (Definition of Done de TASK-02)

1. **100 % de tests de contrato OpenAPI en verde:** Todas las respuestas de endpoints REST cumplen los esquemas de `openapi.yaml`.
2. **Suite Newman exitosa al 100 %:** Las 25 peticiones de integración pasan tanto contra el puerto 3000 como a través del Gateway en el puerto 8080.
3. **Outbox tolerante a caídas:** La creación y edición de eventos no se bloquea ni pierde mensajes cuando el broker no está disponible.
4. **Validación de seguridad y Fail-Secure:** Intentos no autorizados responden 401/403 y fallos de Auth responden 503 (`AUTH_UNAVAILABLE`) sin exponer datos ni continuar transacciones.
5. **Trazabilidad:** Toda discrepancia o respuesta pendiente de otros squads queda tipificada en `docs/mensajes-sprint-3.md` y en los contratos correspondientes.
