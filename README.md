# TicketU — Panel Organizador

Microservicio correspondiente al **Panel Organizador** del proyecto TicketU.

Este módulo permite a un organizador autenticado crear, visualizar, editar, publicar y gestionar eventos dentro de la plataforma.

---

## Equipo

| Integrante | Rol |
|---|---|
| Joaquín Andrés Martínez | Backend |
| Etienne Araya | Integración |
| Christopher Okinggton | QA / Base de Datos |
| María José Baxmann | Scrum Master |
| Alonso Alejandro Vera | Frontend |

---

## Historias de Usuario

- HU-01 — Crear un evento
- HU-02 — Editar un evento
- HU-03 — Eliminar un evento
- HU-04 — Publicar un evento
- HU-05 — Ver mis eventos
- HU-06 — Verificación de autorización del organizador
- HU-07 — Notificar cambios de estado a otros microservicios

---

## Planificación

### Sprint 1
- HU-06 — Verificación de autorización
- HU-01 — Crear evento
- HU-05 — Ver mis eventos

**Milestone:** Avance 1 — 01/10/2026

### Sprint 2
- HU-02 — Editar evento
- HU-04 — Publicar evento

**Milestone:** Avance 2 — 22/10/2026

### Sprint 3
- HU-07 — Notificar cambios de estado
- HU-03 — Eliminar evento

**Milestone:** Avance 3 — 05/11/2026

### Sprint 4
- Integración entre microservicios
- Pruebas de contratos
- Pruebas funcionales
- Corrección de errores

**Milestone:** Avance 4 — 18/11/2026

### Sprint 5
- Pruebas finales
- Correcciones finales
- Documentación
- Despliegue
- Preparación de demo y presentación

**Milestone:** Entrega final — 25/11/2026

---

## Arquitectura

TicketU utiliza una arquitectura de microservicios.

El Panel Organizador se integra con otros módulos mediante contratos definidos entre equipos.

Principales integraciones:

- Auth
- Catálogo de Eventos
- Entradas / Inventario
- Check-in
- Notificaciones
- Promociones

---

## Documentación

### Diagramas de secuencia

Ubicados en:

```text
docs/diagrams/
