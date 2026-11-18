# Planificación de Historias de Usuario por Sprint

> Resumen por sprint. El detalle (tareas, responsables y criterios de salida) está en [`plan-proyecto.md`](plan-proyecto.md). El sprint de cada HU sigue los milestones de GitHub.

## Sprint 1 — Gestión básica del organizador

**Fechas:** 17/09/2026 – 30/09/2026  
**Milestone:** Avance 1 — 01/10/2026

### Objetivo
Permitir que un organizador autenticado pueda crear y visualizar sus propios eventos.

### Historias de Usuario
- HU-06 — Verificación de autorización del organizador
- HU-01 — Crear un evento
- HU-05 — Ver mis eventos
- HU-04 — Publicar un evento *(adelantada desde el Sprint 2: publicar ya funciona; el mensaje al broker queda con HU-07, ver [`adr/0009`](adr/0009-hu04-adelantada-al-sprint-1.md))*

---

## Sprint 2 — Edición y publicación de eventos

**Fechas:** 02/10/2026 – 28/10/2026  
**Milestone:** Avance 2 — 28/10/2026 *(los profesores lo movieron desde el 22/10)*

### Objetivo
Permitir que el organizador modifique y publique sus eventos.

### Historias de Usuario
- HU-02 — Editar un evento
- HU-04 — Publicar un evento *(su notificación ya queda en el outbox, ADR-0003; el envío al broker llega con HU-07)*

---

## Sprint 3 — Eliminación y notificación de cambios

**Fechas:** 23/10/2026 – 05/11/2026  
**Milestone:** Avance 3 — 05/11/2026

### Objetivo
Completar el ciclo de vida del evento y comunicar sus cambios de estado a otros microservicios.

### Historias de Usuario
- HU-07 — Notificar cambios de estado a otros microservicios
- HU-03 — Eliminar un evento

### Resultado
En el Avance 3 se entregó el envío de los mensajes al broker de la plataforma (outbox + RabbitMQ, [ADR-0013](adr/0013-publicacion-outbox-rabbitmq-plataforma.md)) y el prefijo del API Gateway. **HU-03 y el cierre de HU-07 pasaron al Avance 4**, porque eliminar un evento publicado requiere consultar el stock a Entradas (INT-05).

---

## Sprint 4 — Integración entre microservicios

**Fechas:** 06/11/2026 – 19/11/2026  
**Milestone:** Avance 4 — 18/11/2026

### Objetivo
Integrar el Panel Organizador con los servicios reales de los demás equipos.

### Tareas
- TASK-01 — Integración completa entre microservicios
- TASK-02 — Pruebas de contratos de integración
- TASK-03 — Pruebas funcionales del Panel Organizador
- TASK-04 — Corrección de errores de integración

### Resultado (Avance 4, 18/11)
- **HU-03** Eliminar: borrador o evento sin ventas se elimina; con ventas pasa a Cancelado; con Entradas caído no se toca ([ADR-0016](adr/0016-eliminacion-de-eventos-y-consulta-de-stock.md)). Botón y modal en el frontend.
- **HU-07** completa: mensajes de cancelación y eliminación, sobre `{ envelope, payload }` para Entradas ([ADR-0017](adr/0017-sobre-en-el-cuerpo-para-entradas.md)) y aviso de stock AGOTADO ([ADR-0018](adr/0018-consumo-stock-entradas-y-disponibilidad.md)).
- **INT-11** `x-api-key` con Auth (contrato v1.1).
- **TASK-01/02:** sesión de integración con Gateway, RabbitMQ, Auth y Entradas reales en `plataforma-eventos-net` ([evidencia](evidencias/pruebas-integracion/sesion-integracion-2026-11-17.md)).
- **TASK-03:** 181 pruebas automatizadas y recorrido manual de las 7 HU ([evidencia](evidencias/pruebas-funcionalidad/README.md)).

---

## Sprint 5 — Cierre y entrega final

**Fechas:** 20/11/2026 – 25/11/2026  
**Milestone:** Entrega final — 25/11/2026

### Objetivo
Validar, documentar, desplegar y presentar el Panel Organizador.

### Tareas
- TASK-05 — Pruebas finales
- TASK-06 — Correcciones finales
- TASK-07 — Documentación técnica final
- TASK-08 — Despliegue
- TASK-09 — Validación de integración final
- TASK-10 — Presentación final
