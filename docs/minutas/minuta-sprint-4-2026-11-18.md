# Minuta Sprint 4 — Panel Organizador

**Proyecto:** TicketU — Panel Organizador  
**Sprint:** 4 — Integración real  
**Período:** 06/11/2026 al 18/11/2026  
**Fecha de registro:** 18/11/2026  
**Responsable:** Mariajosé Baxmann — Gestión y coordinación de integraciones  
**Modalidad:** Coordinación asíncrona con equipos mediante mensajería y revisión de repositorios.

---

## 1. Objetivo del Sprint

Avanzar en la integración real del Panel Organizador con los microservicios de la plataforma TicketU, verificando los contratos técnicos, la comunicación mediante RabbitMQ, la autenticación con Auth y las dependencias necesarias para completar las historias de usuario pendientes.

## 2. Avances y acuerdos

### 2.1 Auth — Autenticación

Se recibió confirmación del equipo Auth respecto de los parámetros de integración para el Avance 4.

**Acuerdos confirmados:**

- Servicio Docker: `auth-service`.
- Puerto interno: `10000`.
- Red compartida: `plataforma-eventos-net`.
- Validación: `GET /internal/validar-sesion`.
- Autenticación mediante cookie `jwt` y cabecera `x-api-key`.
- Disponibilidad de cuentas QA para dos organizadores y un usuario staff.
- Login mediante `POST /api/auth/login`.
- Gestión de clave mediante `/crear-clave` y `/api/auth/update-password`.

Se actualizó el documento `CONTRATO_PANEL_AUTH.md` conforme al contrato oficial v1.1.

**Pendiente:** verificar la configuración del backend de Panel y ejecutar pruebas de integración con Auth real.

**Issues relacionados:** INT-01 e INT-11 (#34).

### 2.2 Entradas / Inventario

Se mantuvo la coordinación con el equipo de Entradas para completar la consulta de stock necesaria para la eliminación de eventos.

**Avances confirmados:**

- Entradas utiliza RabbitMQ para comunicación asíncrona.
- Exchange: `ticketu.events`.
- Routing key Panel → Entradas: `panel.evento.entradas.v1`.
- Routing key Entradas → Panel: `entradas.evento.stock.v1`.
- El equipo confirmó que consume los eventos publicados por Panel.
- Se identificó en el repositorio de Entradas el endpoint `GET /api/v1/entradas/eventos/{id_evento}/stock`.

**Pendiente:** probar la consulta real de stock desde Panel y validar la respuesta necesaria para HU-03.

**Issues relacionados:** INT-04, INT-05 y HU-03.

### 2.3 Check-in

Se estableció contacto con el equipo de Check-in y se recibió el enlace al repositorio con código actualizado.

El contrato anterior había sido aceptado por Check-in sin requerir modificaciones.

**Configuración propuesta por Panel:**

- Exchange: `ticketu.events`.
- Routing key: `panel.evento.checkin.v1`.
- Consulta REST de respaldo mediante el Gateway.

**Pendiente:** confirmar la routing key en la implementación actual y realizar pruebas de recepción de mensajes.

**Issue relacionado:** INT-07.

### 2.4 Notificaciones

Se recibió comunicación del equipo de Notificaciones indicando que se encontraba realizando pruebas de integración, pero presentaba dificultades de configuración.

**Configuración documentada por Panel:**

- Exchange: `ticketu.events`.
- Routing key: `panel.evento.notificaciones.v1`.
- Broker mediante RabbitMQ.

Se identificó una diferencia entre la denominación de exchange utilizada por Notificaciones y la configuración registrada por Panel.

También se identificó una posible diferencia en el hostname del broker.

**Pendiente:** alinear la configuración del broker y comprobar la integración real entre ambos servicios.

**Issue relacionado:** INT-06.

### 2.5 Catálogo y Promociones

Panel mantiene definidas las siguientes routing keys propuestas:

| Microservicio | Routing key |
|---|---|
| Catálogo | `panel.evento.catalogo.v1` |
| Promociones | `panel.evento.promociones.v1` |

Se requiere confirmación de los equipos consumidores respecto de su utilización y configuración.

**Pendiente:** registrar los acuerdos definitivos y coordinar pruebas de integración.

**Issues relacionados:** INT-03 e INT-07.

## 3. Estado de las historias de usuario

| Historia | Descripción | Estado |
|---|---|---|
| HU-03 | Eliminar un evento | Pendiente de completar integración de stock y reglas de eliminación/cancelación |
| HU-07 | Notificar cambios de estado a otros microservicios | Implementación parcial; pendientes los flujos de cancelación y eliminación |

Se planifica trasladar ambas historias al milestone **Avance 4** para reflejar las dependencias de integración.

## 4. Compromisos y responsables

| Compromiso | Responsable | Estado |
|---|---|---|
| Actualizar contrato Auth v1.1 | Mariajosé | Completado |
| Configurar Auth real con `x-api-key` | Joaquín / Etienne | Pendiente de verificar |
| Probar endpoint de stock | Joaquín / Etienne | Pendiente |
| Confirmar routing keys con squads | Mariajosé | En gestión |
| Validar integración con Notificaciones | Etienne / equipo Notificaciones | Pendiente |
| Completar HU-03 y HU-07 | Equipo técnico | Pendiente |
| Actualizar milestone y comentarios de issues | Mariajosé | Pendiente |
| Ejecutar pruebas de integración reales | Equipo técnico | Pendiente |

## 5. Riesgos y bloqueos

1. **Dependencia de Auth:** la integración completa requiere configurar la clave interna y verificar la conectividad entre contenedores.
2. **Dependencia de Entradas:** HU-03 necesita consumir correctamente el endpoint de stock.
3. **Mensajería:** las diferencias de configuración de RabbitMQ pueden impedir la recepción de mensajes entre servicios.
4. **Contratos pendientes:** falta confirmar algunos acuerdos con Catálogo, Check-in y Promociones.

## 6. Próximos pasos

- Completar las confirmaciones de routing keys.
- Ejecutar las pruebas de integración con Auth y Entradas.
- Coordinar la prueba conjunta con Notificaciones y Check-in.
- Actualizar los issues INT-01, INT-03, INT-04, INT-06 e INT-07.
- Completar la replanificación de HU-03 y HU-07.
- Registrar las evidencias técnicas de las integraciones realizadas.

## 7. Conclusión

Durante el Sprint 4 se avanzó en la coordinación y definición de contratos de integración del Panel Organizador con los demás microservicios de TicketU.

Se obtuvieron los parámetros necesarios para integrar Auth, se confirmó la infraestructura de mensajería utilizada por Entradas y se identificaron los puntos de configuración pendientes con los demás equipos.

Las pruebas de extremo a extremo y el cierre de las historias HU-03 y HU-07 continúan pendientes, por lo que deberán mantenerse en seguimiento hasta contar con evidencia de funcionamiento real.
