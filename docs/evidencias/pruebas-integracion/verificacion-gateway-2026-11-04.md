# Evidencia de Verificación vía API Gateway y Broker — Sprint 3 (Evaluación 2)

- **Fecha y Hora de Ejecución:** 2026-11-04T04:08:20.928Z (04/11/2026)
- **Responsable:** Etienne Araya (`maikfeouWu`) — Calidad y Gestión de Integración (CA1 / CA2)
- **Componentes del Ecosistema TicketU:**
  - Red Docker: `plataforma-eventos-net` (externa)
  - API Gateway: `ticketu-api-gateway` (puerto 8080)
  - Broker RabbitMQ: `ticketu-rabbitmq` (puerto 5672, exchange `ticketu.events`, vhost `ticketu`)
  - Panel Organizador API: `panel-organizador-integracion-organizador-service-1` (puerto 3000 interno)
  - Panel Organizador MongoDB: `panel-organizador-integracion-organizador-mongo-1` (puerto 27017 interno)
  - Auth Service (Simulado): Servidor mock (`tools/mock-auth`) ejecutándose en contenedor dentro de la red `plataforma-eventos-net` bajo el alias `auth-service:10000` con tokens estáticos de desarrollo (`token-org-a`, `token-staff`)

---

## 1. Verificación de Healthcheck del API Gateway

```http
GET http://localhost:8080/health HTTP/1.1
Host: localhost:8080
```

**Respuesta (200 OK):**
```json
{
  "status": "ok",
  "service": "ticketu-api-gateway",
  "timestamp": "2026-11-04T04:08:21.090Z",
  "routes": [
    {
      "module": "auth",
      "prefix": "/api/auth",
      "env": "AUTH_SERVICE_URL",
      "configured": true
    },
    {
      "module": "catalogo",
      "prefix": "/api/catalogo",
      "env": "CATALOGO_SERVICE_URL",
      "configured": true
    },
    {
      "module": "entradas",
      "prefix": "/api/entradas",
      "env": "ENTRADAS_SERVICE_URL",
      "configured": true
    },
    {
      "module": "pagos",
      "prefix": "/api/pagos",
      "env": "PAGOS_SERVICE_URL",
      "configured": true
    },
    {
      "module": "checkin",
      "prefix": "/api/checkin",
      "env": "CHECKIN_SERVICE_URL",
      "configured": true
    },
    {
      "module": "resenas",
      "prefix": "/api/resenas",
      "env": "RESENAS_SERVICE_URL",
      "configured": true
    },
    {
      "module": "organizador",
      "prefix": "/api/organizador",
      "env": "ORGANIZADOR_SERVICE_URL",
      "configured": true
    },
    {
      "module": "notificaciones",
      "prefix": "/api/notificaciones",
      "env": "NOTIFICACIONES_SERVICE_URL",
      "configured": true
    },
    {
      "module": "promociones",
      "prefix": "/api/promociones",
      "env": "PROMOCIONES_SERVICE_URL",
      "configured": true
    }
  ]
}
```

---

## 2. Catálogo: Consulta de Eventos Próximos (Público)

```http
GET http://localhost:8080/api/organizador/v1/organizador/eventos/proximos HTTP/1.1
Host: localhost:8080
```

**Respuesta (200 OK):**
```json
[
  {
    "id_evento": "66f1b0000000000000000001",
    "nombre_evento": "Torneo Interuniversitario de Ajedrez",
    "descripcion": "Torneo abierto por equipos.",
    "direccion_evento": "Biblioteca Central",
    "fecha_evento": "2026-11-15",
    "hora_evento": "09:00",
    "hora_fin_evento": "18:00",
    "imagen": null,
    "categoria": "deportes",
    "precio": null,
    "tipo_entrada": "GRATUITA",
    "estado_gestion": "PUBLICADO",
    "estado_disponibilidad": "DISPONIBLE"
  },
  {
    "id_evento": "66f1a0000000000000000002",
    "nombre_evento": "Feria de Innovación TITEC",
    "descripcion": "Muestra anual de proyectos de integración tecnológica.",
    "direccion_evento": "Auditorio Principal",
    "fecha_evento": "2026-11-20",
    "hora_evento": "10:00",
    "hora_fin_evento": "18:00",
    "imagen": null,
    "categoria": "academico",
    "precio": null,
    "tipo_entrada": "GRATUITA",
    "estado_gestion": "PUBLICADO",
    "estado_disponibilidad": "DISPONIBLE"
  },
  {
    "id_evento": "66f1a0000000000000000003",
    "nombre_evento": "Charla de Ciberseguridad",
    "descripcion": "Buenas prácticas de seguridad en aplicaciones web.",
    "direccion_evento": "Sala Multiuso, Facultad de Ingeniería",
    "fecha_evento": "2026-12-03",
    "hora_evento": "17:00",
    "hora_fin_evento": "19:00",
    "imagen": null,
    "categoria": "tecnologia",
    "precio": null,
    "tipo_entrada": "GRATUITA",
    "estado_gestion": "PUBLICADO",
    "estado_disponibilidad": "DISPONIBLE"
  },
  {
    "id_evento": "6aeaae6ad5508898fe522dfa",
    "nombre_evento": "Evento Integracion Gateway",
    "descripcion": "Prueba E2E Gateway y RabbitMQ",
    "direccion_evento": "Auditorio Central",
    "fecha_evento": "2030-05-10",
    "hora_evento": "14:00",
    "hora_fin_evento": "16:00",
    "imagen": null,
    "categoria": null,
    "precio": null,
    "tipo_entrada": "GRATUITA",
    "estado_gestion": "PUBLICADO",
    "estado_disponibilidad": "DISPONIBLE"
  },
  {
    "id_evento": "6aeaaf48d5508898fe522e0f",
    "nombre_evento": "Evento Sprint 2 Editado",
    "descripcion": "Descripción inicial del evento Sprint 2",
    "direccion_evento": "Auditorio Principal",
    "fecha_evento": "2030-08-15",
    "hora_evento": "16:00",
    "hora_fin_evento": "12:00",
    "imagen": null,
    "categoria": null,
    "precio": null,
    "tipo_entrada": "GRATUITA",
    "estado_gestion": "PUBLICADO",
    "estado_disponibilidad": "DISPONIBLE"
  },
  {
    "id_evento": "6aeaaf72d5508898fe522e29",
    "nombre_evento": "Evento Sprint 2 Editado",
    "descripcion": "Descripción inicial del evento Sprint 2",
    "direccion_evento": "Auditorio Principal",
    "fecha_evento": "2030-08-15",
    "hora_evento": "16:00",
    "hora_fin_evento": "12:00",
    "imagen": null,
    "categoria": null,
    "precio": null,
    "tipo_entrada": "GRATUITA",
    "estado_gestion": "PUBLICADO",
    "estado_disponibilidad": "DISPONIBLE"
  },
  {
    "id_evento": "6aeaaf47d5508898fe522e03",
    "nombre_evento": "Evento Integración Entradas TC-ENT-03",
    "descripcion": "Evento para validar notificación asíncrona al broker de Entradas",
    "direccion_evento": "Teatro Municipal",
    "fecha_evento": "2030-09-20",
    "hora_evento": "11:00",
    "hora_fin_evento": "13:00",
    "imagen": null,
    "categoria": null,
    "precio": null,
    "tipo_entrada": "GRATUITA",
    "estado_gestion": "PUBLICADO",
    "estado_disponibilidad": "DISPONIBLE"
  },
  {
    "id_evento": "6aeaaf71d5508898fe522e1d",
    "nombre_evento": "Evento Integración Entradas TC-ENT-03",
    "descripcion": "Evento para validar notificación asíncrona al broker de Entradas",
    "direccion_evento": "Teatro Municipal",
    "fecha_evento": "2030-09-20",
    "hora_evento": "11:00",
    "hora_fin_evento": "13:00",
    "imagen": null,
    "categoria": null,
    "precio": null,
    "tipo_entrada": "GRATUITA",
    "estado_gestion": "PUBLICADO",
    "estado_disponibilidad": "DISPONIBLE"
  }
]
```

---

## 3. Entradas: Consulta de Evento por ID sin Cookie (Protección de Seguridad)

```http
GET http://localhost:8080/api/organizador/v1/panel/eventos/66f1a0000000000000000002 HTTP/1.1
Host: localhost:8080
```

**Respuesta (401 Unauthorized):**
```json
{
  "error": {
    "codigo": "SESSION_INVALID",
    "mensaje": "Debes iniciar sesión para continuar."
  }
}
```

---

## 4. Entradas: Consulta de Evento por ID con Sesión Staff (Integración I2)

### A. Modo Fail-Secure (Comportamiento ante Auth Offline)
Cuando el servicio de Auth de la contraparte no está disponible en `http://auth-service:10000`, el Panel Organizador aplica la directiva **Fail-Secure** definida en ADR-0014:
- Timeout estricto de 1000 ms con máximo 1 reintento.
- Rechazo seguro de la solicitud con código HTTP **503 SERVICE UNAVAILABLE**.
- Código de error estandarizado: `AUTH_UNAVAILABLE`.

```http
GET http://localhost:8080/api/organizador/v1/panel/eventos/66f1a0000000000000000002 HTTP/1.1
Host: localhost:8080
Cookie: jwt=token-staff
```

**Respuesta Fail-Secure (503 Service Unavailable):**
```json
{
  "error": {
    "codigo": "AUTH_UNAVAILABLE",
    "mensaje": "El servicio de autenticación no está disponible. Intenta más tarde."
  }
}
```

### B. Modo Nominal con Auth Simulado (Verificación de Flujo 200)
Para comprobar que el Panel Organizador procesa correctamente una validación de sesión exitosa y autoriza la consulta conforme al contrato, se levantó el servidor de pruebas (`tools/mock-auth`) en la red compartida `plataforma-eventos-net` resolviendo como `http://auth-service:10000` con el token de prueba `token-staff`:

```http
GET http://localhost:8080/api/organizador/v1/panel/eventos/66f1a0000000000000000002 HTTP/1.1
Host: localhost:8080
Cookie: jwt=token-staff
```

**Respuesta (200 OK):**
```json
{
  "id_evento": "66f1a0000000000000000002",
  "id_usuario": "3f1e2c1a-4b8d-4a2e-9c3f-7d1e2f9b2d4a",
  "nombre_evento": "Feria de Innovación TITEC",
  "direccion_evento": "Auditorio Principal",
  "fecha_evento": "2026-11-20",
  "hora_evento": "10:00",
  "hora_fin_evento": "18:00",
  "cantidad_entradas": 300,
  "tipo_entrada": "GRATUITA",
  "estado_gestion": "PUBLICADO"
}
```

---

## 5. Ciclo de Vida: Creación y Publicación de Evento (Vía API Gateway)

### A. Crear Evento en Borrador
```http
POST http://localhost:8080/api/organizador/v1/panel/eventos HTTP/1.1
Host: localhost:8080
Content-Type: application/json
Cookie: jwt=token-org-a

{
  "nombre_evento": "Conferencia Interoperabilidad TicketU 2026",
  "descripcion": "Validación de integración end-to-end a través de Gateway y RabbitMQ",
  "fecha_evento": "2030-10-15",
  "hora_evento": "10:00",
  "hora_fin_evento": "13:00",
  "direccion_evento": "Auditorio Central TITEC",
  "cantidad_entradas": 250,
  "tipo_entrada": "GRATUITA"
}
```

**Respuesta (201 Created):**
```json
{
  "id_evento": "6aeaafb5d5508898fe522e37",
  "nombre_evento": "Conferencia Interoperabilidad TicketU 2026",
  "fecha_evento": "2030-10-15",
  "hora_evento": "10:00",
  "direccion_evento": "Auditorio Central TITEC",
  "estado_gestion": "BORRADOR",
  "id_organizador": "3f1e2c1a-4b8d-4a2e-9c3f-7d1e2f9b2d4a",
  "descripcion": "Validación de integración end-to-end a través de Gateway y RabbitMQ",
  "hora_fin_evento": "13:00",
  "categoria": null,
  "imagen": null,
  "cantidad_entradas": 250,
  "tipo_entrada": "GRATUITA",
  "precio": null,
  "fecha_creacion": "2026-11-04T04:08:21.186Z",
  "fecha_actualizacion": "2026-11-04T04:08:21.186Z"
}
```

### B. Publicar Evento Creado
```http
POST http://localhost:8080/api/organizador/v1/panel/eventos/mios/6aeaafb5d5508898fe522e37/publicar HTTP/1.1
Host: localhost:8080
Cookie: jwt=token-org-a
```

**Respuesta (200 OK):**
```json
{
  "id_evento": "6aeaafb5d5508898fe522e37",
  "nombre_evento": "Conferencia Interoperabilidad TicketU 2026",
  "fecha_evento": "2030-10-15",
  "hora_evento": "10:00",
  "direccion_evento": "Auditorio Central TITEC",
  "estado_gestion": "PUBLICADO",
  "id_organizador": "3f1e2c1a-4b8d-4a2e-9c3f-7d1e2f9b2d4a",
  "descripcion": "Validación de integración end-to-end a través de Gateway y RabbitMQ",
  "hora_fin_evento": "13:00",
  "categoria": null,
  "imagen": null,
  "cantidad_entradas": 250,
  "tipo_entrada": "GRATUITA",
  "precio": null,
  "fecha_creacion": "2026-11-04T04:08:21.186Z",
  "fecha_actualizacion": "2026-11-04T04:08:21.213Z"
}
```

---

## 6. Verificación en Base de Datos: Outbox Relay (`mensajes_salientes`)

Se inspeccionó la colección `mensajes_salientes` en el contenedor MongoDB de integración (`panel-organizador-integracion-organizador-mongo-1`) para el evento creado (`6aeaafb5d5508898fe522e37`).

Comando ejecutado:
```bash
docker exec panel-organizador-integracion-organizador-mongo-1 mongosh panel_organizador --quiet --eval "db.mensajes_salientes.find({ id_evento: ObjectId('6aeaafb5d5508898fe522e37') }).pretty()"
```

Los mensajes generados por la creación y posterior publicación fueron persistidos transaccionalmente y despachados de inmediato al exchange durable `ticketu.events` en RabbitMQ:

```json
[
  {
    "_id": "6aeaafb5d5508898fe522e39",
    "id_evento": "6aeaafb5d5508898fe522e37",
    "topico": "panel.evento.entradas.v1",
    "tipo": "evento_creado",
    "version": 1,
    "fecha_cambio": "2026-11-04T04:08:21.186Z",
    "payload": {
      "id_evento": "6aeaafb5d5508898fe522e37",
      "id_usuario": "3f1e2c1a-4b8d-4a2e-9c3f-7d1e2f9b2d4a",
      "nombre_evento": "Conferencia Interoperabilidad TicketU 2026",
      "fecha_evento": "2030-10-15",
      "hora_evento": "10:00",
      "cantidad_entradas": 250,
      "tipo_entrada": "GRATUITA",
      "estado_gestion": "BORRADOR"
    },
    "estado": "ENVIADO",
    "intentos": 0,
    "ultimo_error": null,
    "fecha_creacion": "2026-11-04T04:08:21.190Z",
    "fecha_envio": "2026-11-04T04:08:21.257Z"
  },
  {
    "_id": "6aeaafb5d5508898fe522e3b",
    "id_evento": "6aeaafb5d5508898fe522e37",
    "topico": "panel.evento.catalogo.v1",
    "tipo": "evento_publicado",
    "version": 1,
    "fecha_cambio": "2026-11-04T04:08:21.213Z",
    "payload": {
      "id_evento": "6aeaafb5d5508898fe522e37",
      "nombre_evento": "Conferencia Interoperabilidad TicketU 2026",
      "descripcion": "Validación de integración end-to-end a través de Gateway y RabbitMQ",
      "direccion_evento": "Auditorio Central TITEC",
      "fecha_evento": "2030-10-15",
      "hora_evento": "10:00",
      "hora_fin_evento": "13:00",
      "imagen": null,
      "categoria": null,
      "precio": null,
      "tipo_entrada": "GRATUITA",
      "estado_gestion": "PUBLICADO",
      "estado_disponibilidad": "DISPONIBLE"
    },
    "estado": "ENVIADO",
    "intentos": 0,
    "ultimo_error": null,
    "fecha_creacion": "2026-11-04T04:08:21.219Z",
    "fecha_envio": "2026-11-04T04:08:21.262Z"
  },
  {
    "_id": "6aeaafb5d5508898fe522e3c",
    "id_evento": "6aeaafb5d5508898fe522e37",
    "topico": "panel.evento.entradas.v1",
    "tipo": "evento_publicado",
    "version": 1,
    "fecha_cambio": "2026-11-04T04:08:21.213Z",
    "payload": {
      "id_evento": "6aeaafb5d5508898fe522e37",
      "id_usuario": "3f1e2c1a-4b8d-4a2e-9c3f-7d1e2f9b2d4a",
      "nombre_evento": "Conferencia Interoperabilidad TicketU 2026",
      "fecha_evento": "2030-10-15",
      "hora_evento": "10:00",
      "cantidad_entradas": 250,
      "tipo_entrada": "GRATUITA",
      "estado_gestion": "PUBLICADO"
    },
    "estado": "ENVIADO",
    "intentos": 0,
    "ultimo_error": null,
    "fecha_creacion": "2026-11-04T04:08:21.220Z",
    "fecha_envio": "2026-11-04T04:08:21.268Z"
  },
  {
    "_id": "6aeaafb5d5508898fe522e3d",
    "id_evento": "6aeaafb5d5508898fe522e37",
    "topico": "panel.evento.checkin.v1",
    "tipo": "evento_publicado",
    "version": 1,
    "fecha_cambio": "2026-11-04T04:08:21.213Z",
    "payload": {
      "tipo_cambio": "PUBLICADO",
      "id_evento": "6aeaafb5d5508898fe522e37",
      "nombre_evento": "Conferencia Interoperabilidad TicketU 2026",
      "direccion_evento": "Auditorio Central TITEC",
      "fecha_evento": "2030-10-15",
      "hora_evento": "10:00",
      "hora_fin_evento": "13:00",
      "estado_gestion": "PUBLICADO",
      "fecha_cambio": "2026-11-04T04:08:21.213Z"
    },
    "estado": "ENVIADO",
    "intentos": 0,
    "ultimo_error": null,
    "fecha_creacion": "2026-11-04T04:08:21.221Z",
    "fecha_envio": "2026-11-04T04:08:21.272Z"
  },
  {
    "_id": "6aeaafb5d5508898fe522e3e",
    "id_evento": "6aeaafb5d5508898fe522e37",
    "topico": "panel.evento.notificaciones.v1",
    "tipo": "evento_actualizado",
    "version": 1,
    "fecha_cambio": "2026-11-04T04:08:21.213Z",
    "payload": {
      "id_evento": "6aeaafb5d5508898fe522e37",
      "id_usuario": "3f1e2c1a-4b8d-4a2e-9c3f-7d1e2f9b2d4a",
      "nuevo_estado": "PUBLICADO"
    },
    "estado": "ENVIADO",
    "intentos": 0,
    "ultimo_error": null,
    "fecha_creacion": "2026-11-04T04:08:21.223Z",
    "fecha_envio": "2026-11-04T04:08:21.279Z"
  },
  {
    "_id": "6aeaafb5d5508898fe522e3f",
    "id_evento": "6aeaafb5d5508898fe522e37",
    "topico": "panel.evento.promociones.v1",
    "tipo": "evento_publicado",
    "version": 1,
    "fecha_cambio": "2026-11-04T04:08:21.213Z",
    "payload": {
      "id_evento": "6aeaafb5d5508898fe522e37",
      "nombre_evento": "Conferencia Interoperabilidad TicketU 2026",
      "fecha_evento": "2030-10-15"
    },
    "estado": "ENVIADO",
    "intentos": 0,
    "ultimo_error": null,
    "fecha_creacion": "2026-11-04T04:08:21.224Z",
    "fecha_envio": "2026-11-04T04:08:21.284Z"
  }
]
```

---

## 7. Conclusión de Interoperabilidad
- **API Gateway (Puerto 8080):** Enrutamiento exitoso de rutas `/api/organizador/v1/*` hacia el servicio de backend. Preservación íntegra de headers, cookies de sesión y cuerpos de solicitud.
- **RabbitMQ Broker (`ticketu.events`):** Publicación confirmada de eventos del ciclo de vida (`evento_creado`, `evento_publicado`) en tópicos `panel.evento.entradas.v1`, `panel.evento.catalogo.v1`, `panel.evento.checkin.v1`, `panel.evento.notificaciones.v1` y `panel.evento.promociones.v1`. Todos los mensajes alcanzaron el estado `ENVIADO` con latencias de despacho inferiores a 100 ms.
- **Autenticación y Fail-Secure:** El Panel Organizador cumple con las directivas del contrato bilateral de Auth: aplica Fail-Secure (`503 AUTH_UNAVAILABLE`) ante la ausencia o timeout de la contraparte, y procesa la autorización de roles al recibir una respuesta afirmativa de validación (probado mediante el mock en red compartida).

---

## 8. Qué no cubre esta evidencia

Para total transparencia y apego a la rúbrica de interoperabilidad:
1. **Servicio real de Auth:** La validación exitosa (HTTP 200) y las pruebas con credenciales se ejecutaron contra el mock interno (`tools/mock-auth`) expuesto en `auth-service:10000` con tokens estáticos (`token-staff`, `token-org-a`). No constituye una prueba contra el microservicio real de Auth de la plataforma TicketU, cuyo hostname definitivo aún no ha sido confirmado por su squad y cuyos JWTs reales no corresponden a estos tokens de desarrollo.
2. **Consumidor real de Entradas (I1):** Los eventos generados (`evento_creado`, `evento_publicado`) fueron efectivamente persistidos en el Outbox (`mensajes_salientes`) y despachados al exchange durable `ticketu.events` del broker RabbitMQ compartido en estado `ENVIADO`. Sin embargo, la recepción y procesamiento de dichos mensajes por parte del microservicio real de Entradas no forma parte de esta evidencia, la cual evalúa el componente emisor/publisher del Panel Organizador.
