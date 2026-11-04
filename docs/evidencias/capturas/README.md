# Capturas de Evidencia

Este directorio contiene las capturas de respaldo visual para las evaluaciones del proyecto Panel Organizador (TicketU).

---

## Evaluación 2 — Interoperabilidad y Calidad (04/11/2026)

Las siguientes 4 capturas respaldan formalmente el cumplimiento de los ítems **BD1 (Base de Datos)** y **CA (Control y Aseguramiento de Calidad)** según la rúbrica:

### 1. `bd-01-outbox-mensajes-salientes.png` (Ítem BD1 d — Integración I1)
* **Colección:** `mensajes_salientes` en MongoDB Compass.
* **Propósito:** Demuestra el patrón **Transactional Outbox** implementado (ADR-0003, ADR-0013). Al gestionar y publicar un evento (`Festival Primavera 2026`, ID `6aeaaf54f0c7265e669a3270`), se generaron los mensajes dirigidos a los tópicos de integración (`panel.evento.entradas.v1`, `panel.evento.catalogo.v1`, `panel.evento.checkin.v1`, `panel.evento.notificaciones.v1`, `panel.evento.promociones.v1`).
* **Verificación de diseño:** El mensaje en estado `PENDIENTE` muestra el `payload` completo con fecha `2026-11-04`, conteniendo únicamente identificadores y atributos mínimos necesarios para evitar duplicidad de datos con otros squads.

### 2. `bd-02-cambios-estado-publicado.png` (Ítem BD1 d — Integración I1)
* **Colección:** `cambios_estado_evento` en MongoDB Compass.
* **Propósito:** Demuestra la trazabilidad de auditoría de transiciones de estado de un evento (HU-01, HU-04, HU-07).
* **Detalle:** Se observan las 2 transiciones históricas registradas el día **4 de noviembre de 2026**:
  1. `null → BORRADOR` (creación del borrador inicial).
  2. `BORRADOR → PUBLICADO` (publicación formal del evento).
  Registra la fecha y hora exacta (`ISODate 2026-11-04`) y el `id_usuario_responsable` (`3f1e2c1a-...`, correspondiente a la Organizadora A).

### 3. `bd-03-consistencia-get-entradas.png` (Ítem BD1 c — Integración I2)
* **Vista:** Pantalla dividida lado a lado.
* **Izquierda (Swagger UI):** Ejecución del endpoint REST del microservicio devolviendo HTTP 200 con el payload serializado.
* **Derecha (MongoDB Compass):** Documento crudo almacenado en la colección `eventos` de MongoDB.
* **Propósito:** Demuestra la **consistencia 1:1 de los datos** expuestos hacia otros microservicios (Entradas / Check-in / Catálogo). Los valores de `nombre_evento` ("Festival Primavera 2026"), `cantidad_entradas` (500), `precio` (10.000), `tipo_entrada` ("PAGADA"), `hora_evento`, `hora_fin_evento` y estados coinciden exactamente.

### 4. `qa-01-newman-sprint2-exitoso.png` (Ítem CA1 y CA2 — Pruebas de Integración)
* **Herramienta:** Newman (CLI runner de Postman).
* **Colección ejecutada:** `postman/panel-organizador.postman_collection.json` con ambiente `postman/local.postman_environment.json`.
* **Resultado:**
  * **29 requests** ejecutadas en 8 grupos temáticos.
  * **50 aserciones ejecutadas con 0 fallos (100% éxito)**.
  * Valida en vivo el ciclo completo del Sprint 2: matriz de seguridad y control de acceso (401 sin sesión, 403 organizador ajeno, 400 validaciones), publicación de eventos y transición no permitida (409 Conflict ante re-publicación).

---

## Evaluación 1 — Funcionalidades Básicas (Histórico)
- `bd cambios estado evento.png`
- `bd eventos.png`
- `Estado Borrador.jpeg`
- `Estado Creando Eventos.jpeg`
- `estado de error de auth.jpeg`
- `Estado Publicado.jpeg`
- `Estado sin eventos.jpeg`
