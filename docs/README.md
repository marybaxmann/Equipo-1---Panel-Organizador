# Índice de documentación — Panel Organizador (TicketU)

Punto de entrada de toda la documentación del microservicio. Si no sabés dónde
va un documento nuevo o dónde está uno viejo, empezá por acá.

> **Nota sobre la organización:** los archivos que ya existían en el repositorio
> del equipo **no se movieron de lugar**. Reorganizarlos haría que cada archivo
> apareciera como borrado + creado al llevar el trabajo al repo del equipo, y
> ensuciaría el historial compartido sin aportar nada. La estructura se ordena
> sumando carpetas nuevas, no moviendo las existentes.

---

## 1. Estructura

```
docs/
├── README.md                       ← este índice
├── plan-proyecto.md                ← hoja de ruta completa: sprints, tareas, responsables, criterios de salida
├── guia-equipo.md                  ← EMPEZAR ACÁ: qué hay en el área de cada integrante y cómo seguir
├── sprints.md                      ← resumen de HU por sprint
├── plan-sprint-2.md                ← plan del Sprint 2: tareas por persona, dónde se ve cada cosa, API, pruebas y Postman
├── DEFINITION_OF_DONE.md           ← DoD oficial del equipo
├── api/                            ← OpenAPI propio (openapi.yaml), consumido (auth-consumido.yaml) y guion de la API por sprint (README.md)
├── bd/                             ← diagrama ER y diccionario (GENERADOS con npm run db:docs; no editar a mano)
├── ui/                             ← checklist visual acordado entre squads + estándares y desviaciones
├── evidencias/                     ← resultados de pruebas (funcionalidad, integración)
├── adr/                            ← decisiones técnicas (NUEVO)
│   ├── README.md                   ← qué es un ADR, cómo se escribe e índice
│   └── 0001 … 0012                 ← una decisión por archivo
├── diagrams/                       ← diagramas de secuencia (Mermaid)
│   ├── hu01-crear-evento.md
│   ├── hu02-editar-evento.md
│   ├── hu03-eliminar-evento.md
│   ├── hu04-publicar-evento.md
│   ├── hu05-ver-mis-eventos.md
│   └── hu07-notificar-cambios-estado.md
└── CONTRATO_PANEL_*.md             ← contratos de integración con otros equipos
```

### Dónde va cada cosa de aquí en adelante

| Tipo de documento | Ubicación | Convención de nombre |
|---|---|---|
| Decisión técnica | `docs/adr/` | `NNNN-titulo-en-kebab-case.md`, numeración correlativa |
| Contrato con otro equipo | `docs/` | `CONTRATO_PANEL_<EQUIPO>.md` (mayúsculas — ya establecido) |
| Diagrama de secuencia | `docs/diagrams/` | `huNN-titulo-en-kebab-case.md` |
| Planificación | `docs/plan-proyecto.md` (detalle) y `docs/sprints.md` (resumen) | archivos únicos, se actualizan al cerrar cada sprint |
| Evidencias | `docs/evidencias/` | `README.md` por tipo de prueba + salidas de ejecución |
| UI/UX | `docs/ui/` | `checklist-consistencia-visual.md` (acordado) · `estandares-ui.md` (cómo se aplica) |
| Guía por rol | `docs/guia-equipo.md` | archivo único; se actualiza al cerrar cada sprint |

---

## 2. Decisiones (ADR)

| # | Título | Estado |
|---|---|---|
| [0001](adr/0001-stack-del-panel-organizador.md) | Stack propuesto Python + FastAPI | Rechazado → 0004 |
| [0002](adr/0002-motor-de-base-de-datos.md) | Motor de BD: MongoDB con validadores `$jsonSchema` | Propuesta · implementado |
| [0003](adr/0003-aislamiento-publicacion-broker.md) | Aislamiento de la publicación al broker (outbox) | Aceptada · implementado |
| [0004](adr/0004-stack-node-typescript.md) | Stack Node.js + TypeScript + Express + Zod | Propuesta · implementado |
| [0005](adr/0005-validacion-de-sesion-delegada-a-auth.md) | Validación de sesión delegada a Auth (fail-secure) | Propuesta · implementado |
| [0006](adr/0006-api-contract-first-openapi.md) | API contract-first + pruebas de contrato | Propuesta · implementado |
| [0007](adr/0007-integracion-rest-y-datos-de-otros-squads.md) | REST para consumidores + sólo referencias a datos ajenos | Propuesta · implementado |
| [0008](adr/0008-frontend-estandar-visual-y-login-simulado.md) | Frontend del equipo + estándar visual + login simulado | Propuesta · implementado |
| [0009](adr/0009-hu04-adelantada-al-sprint-1.md) | HU-04 adelantada al Sprint 1 | Propuesta · implementado |
| [0010](adr/0010-monorepo-y-flujo-de-calidad.md) | Monorepo y flujo de calidad | Propuesta · implementado |
| [0011](adr/0011-alineacion-contrato-checkin-v1-2.md) | Alineación con el contrato de Check-in v1.2 | Propuesta · implementado |
| [0012](adr/0012-repo-de-trabajo-y-repo-de-presentacion.md) | Repo de trabajo vs. repo de presentación | Propuesta · **a acordar** |
| [0013](adr/0013-publicacion-outbox-rabbitmq-plataforma.md) | Publicación del outbox en el RabbitMQ de la plataforma | Propuesta · implementado |
| [0014](adr/0014-politica-consumo-broker-y-responsabilidades-plataforma.md) | Política de consumo del broker | Propuesta · implementado |
| [0015](adr/0015-mongodb-7-por-kernel-de-los-runners.md) | MongoDB 7 por el kernel de los runners | Propuesta · implementado |
| [0016](adr/0016-eliminacion-de-eventos-y-consulta-de-stock.md) | Eliminación de eventos y consulta de stock a Entradas | Propuesta · implementado |
| [0017](adr/0017-sobre-en-el-cuerpo-para-entradas.md) | Sobre `{ envelope, payload }` en el cuerpo para Entradas | Propuesta · implementado |
| [0018](adr/0018-consumo-stock-entradas-y-disponibilidad.md) | Aviso de stock de Entradas y disponibilidad AGOTADO | Propuesta · implementado |
| [0019](adr/0019-exchange-propio-para-notificaciones.md) | Exchange propio para Notificaciones | Propuesta · implementado |

Ver [`adr/README.md`](adr/README.md) para el formato.

---

## 3. Contratos de integración

> **Hostnames y conectividad:** para el detalle de hostnames, puertos y variables de entorno (.env) en local, Docker y Gateway para Auth, Entradas y RabbitMQ, ver [docs/hostnames-integracion.md](hostnames-integracion.md).

Seis contratos, todos implementados del lado del Panel (estado al Avance 4, 18/11/2026). Los mensajes salen por el RabbitMQ de la plataforma: exchange `ticketu.events` (topic), vhost `ticketu`, una routing key `panel.evento.<squad>.v1` por squad ([ADR-0013](adr/0013-publicacion-outbox-rabbitmq-plataforma.md), [ADR-0014](adr/0014-politica-consumo-broker-y-responsabilidades-plataforma.md)). Las integraciones evaluadas (I1 e I2) están en [`INTEGRACIONES.md`](../INTEGRACIONES.md).

| Contrato | Rol de Panel | Mecanismo | Estado | HU que dependen |
|---|---|---|---|---|
| [AUTH](CONTRATO_PANEL_AUTH.md) v1.1 | Consumidor | REST síncrono con `x-api-key` | ✅ Probado contra el Auth real en la red compartida, por el Gateway ([evidencia](evidencias/pruebas-integracion/sesion-integracion-2026-11-17.md)) | HU-01…HU-07 |
| [ENTRADAS](CONTRATO_PANEL_ENTRADAS.md) | Proveedor **y consumidor** | Broker `panel.evento.entradas.v1` con `{ envelope, payload }` · GET compartido · Panel consulta el stock (REST) y recibe `entradas.evento.stock.v1` | ✅ Probado con el Entradas real (I1 e I2). Quedan correcciones del lado de Entradas (H1–H6 de la evidencia) | HU-01…HU-04, HU-03, HU-07 |
| [CATALOGO](CONTRATO_PANEL_CATALOGO.md) | Proveedor | REST + broker `panel.evento.catalogo.v1` (publicado, actualizado, cancelado, eliminado, AGOTADO) | ✅ Panel publica · ⏳ Catálogo no confirmó que consume la cola | HU-02, HU-03, HU-04, HU-07 |
| [NOTIFICACIONES](CONTRATO_PANEL_NOTIFICACIONES.md) | Proveedor | Broker: exchange propio `panel.evento.notificaciones.v1` (cancelación y reprogramación, ADR-0019) | ✅ Panel publica · ⏳ Notificaciones aún no confirma la recepción | HU-03, HU-07 |
| [CHECKIN](CONTRATO_PANEL_CHECKIN.md) v1.2 | Proveedor | Broker `panel.evento.checkin.v1` (`tipo_cambio`) + GET con sesión de staff | ✅ Panel publica · GET probado con el Auth real · ⏳ sin confirmación de consumo | HU-02, HU-03, HU-04, HU-07 |
| [PROMOCIONES](CONTRATO_PANEL_PROMOCIONES.md) | Proveedor | `GET /eventos-disponibles` + broker `panel.evento.promociones.v1` | ✅ Panel publica · ⏳ Promociones no definió su mecanismo | HU-04, HU-07 |

**Panel consume Auth y Entradas.** Para los demás es el proveedor: emite los mensajes y expone los servicios REST de cada contrato.

---

## 4. Orden de trabajo

### Estado de las historias

| HU | Título | Sprint | Entrega | Depende de | ¿Desbloqueada? |
|---|---|---|---|---|---|
| HU-06 | Verificación de autorización | 1 | 01/10/2026 | Contrato Auth | ✅ **Hecha** |
| HU-01 | Crear un evento | 1 | 01/10/2026 | HU-06 | ✅ **Hecha** |
| HU-05 | Ver mis eventos | 1 | 01/10/2026 | HU-06, HU-01 | ✅ **Hecha** |
| HU-02 | Editar un evento | 2 | 28/10/2026 | HU-01 | ✅ **Hecha** |
| HU-04 | Publicar un evento | 1 (adelantada) | 01/10/2026 | HU-01 | ✅ **Hecha** (ADR-0009; mensajes al broker con HU-07) |
| HU-07 | Notificar cambios de estado | 3 y 4 | 05/11 y 18/11/2026 | Contratos de los 5 squads | ✅ **Hecha**: outbox + RabbitMQ (Avance 3); cancelación, eliminación y aviso de stock (Avance 4) |
| HU-03 | Eliminar un evento | 4 (planificada en el 3) | 18/11/2026 | Consulta de stock de Entradas (INT-05) | ✅ **Hecha** (ADR-0016) |

Las 7 HU están implementadas y con pruebas: ver [`evidencias/pruebas-funcionalidad/README.md`](evidencias/pruebas-funcionalidad/README.md) (criterio → test).

### Lo que sigue (Sprint 5, entrega final 25/11)

1. **Correcciones de integración** (TASK-04 y TASK-06) a medida que los otros squads respondan, en especial los hallazgos H1–H6 de Entradas.
2. **Pruebas y validación final** (TASK-05 y TASK-09), repitiendo la sesión con los servicios reales.
3. **Despliegue** (TASK-08) y **documentación final** (TASK-07).
4. Detalle por sprint, con tareas y criterios de salida: [`plan-proyecto.md`](plan-proyecto.md).

### Hitos

| Milestone | Fecha | Contenido |
|---|---|---|
| Avance 1 | 01/10/2026 (jueves) | HU-06, HU-01, HU-05 + HU-04 adelantada |
| Avance 2 | 28/10/2026 (movido desde el 22/10) | HU-02 |
| Avance 3 | 05/11/2026 | HU-07: envío al broker (outbox + RabbitMQ) y prefijo del Gateway |
| Avance 4 | 18/11/2026 | HU-03, cierre de HU-07, TASK-01 a TASK-04 (integración y pruebas) |
| Entrega final | 25/11/2026 | TASK-05 a TASK-10 |

---

## 5. Reglas de dominio

Extraídas de los criterios de aceptación. Son transversales a todas las HU.

**Ciclo de vida**
- Un evento nace en **Borrador**.
- Estados: `Borrador`, `Publicado`, `Finalizado`, `Cancelado`.
- Sólo un evento en `Borrador` puede pasar a `Publicado`.
- Antes de publicar hay que validar nombre, fecha, hora de inicio y de término, ubicación, cantidad y tipo de entrada.
- Un evento en `Borrador` **no** debe ser visible en el Catálogo público.

**Autorización**
- El JWT **no se decodifica localmente**. Se reenvía la cookie original a Auth y
  se usa el `id_usuario` y `rol` que Auth devuelve.
- Se valida **propiedad**, no sólo rol: el organizador sólo opera sobre eventos
  que le pertenecen.
- Si Auth no responde o falla: **fail-secure** — se corta la operación y se
  responde `503`. Nunca se asume autorización.
- El token completo no se registra en logs.

**Integración**
- Panel es la fuente de verdad del ciclo de vida del evento. Ningún otro servicio
  lo modifica.
- Las notificaciones salientes van por broker, no por REST directo.

---

## 6. Referencias

- Repo del equipo: https://github.com/marybaxmann/Equipo-1---Panel-Organizador
- Issues (viven en el repo del equipo):
  `gh issue view <N> -R marybaxmann/Equipo-1---Panel-Organizador`
