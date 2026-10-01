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
├── DEFINITION_OF_DONE.md           ← DoD oficial del equipo
├── api/                            ← OpenAPI propio (openapi.yaml) y consumido (auth-consumido.yaml)
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
| [0003](adr/0003-aislamiento-publicacion-broker.md) | Aislamiento de la publicación al broker (outbox) | Propuesta · Sprint 3 |
| [0004](adr/0004-stack-node-typescript.md) | Stack Node.js + TypeScript + Express + Zod | Propuesta · implementado |
| [0005](adr/0005-validacion-de-sesion-delegada-a-auth.md) | Validación de sesión delegada a Auth (fail-secure) | Propuesta · implementado |
| [0006](adr/0006-api-contract-first-openapi.md) | API contract-first + pruebas de contrato | Propuesta · implementado |
| [0007](adr/0007-integracion-rest-y-datos-de-otros-squads.md) | REST para consumidores + sólo referencias a datos ajenos | Propuesta · implementado |
| [0008](adr/0008-frontend-estandar-visual-y-login-simulado.md) | Frontend del equipo + estándar visual + login simulado | Propuesta · implementado |
| [0009](adr/0009-hu04-adelantada-al-sprint-1.md) | HU-04 adelantada al Sprint 1 | Propuesta · implementado |
| [0010](adr/0010-monorepo-y-flujo-de-calidad.md) | Monorepo y flujo de calidad | Propuesta · implementado |
| [0011](adr/0011-alineacion-contrato-checkin-v1-2.md) | Alineación con el contrato de Check-in v1.2 | Propuesta · implementado |
| [0012](adr/0012-repo-de-trabajo-y-repo-de-presentacion.md) | Repo de trabajo vs. repo de presentación | Propuesta · **a acordar** |

Ver [`adr/README.md`](adr/README.md) para el formato.

---

## 3. Contratos de integración

Seis contratos. Auth está cerrado. Para los otros cinco, Panel ya expone **servicios REST** con las rutas y los campos de cada contrato ([ADR-0007](adr/0007-integracion-rest-y-datos-de-otros-squads.md)); lo que sigue pendiente es el **broker** (tópicos sin acordar, [ADR-0003](adr/0003-aislamiento-publicacion-broker.md)).

| Contrato | Rol de Panel | Mecanismo | Estado | HU que dependen |
|---|---|---|---|---|
| [AUTH](CONTRATO_PANEL_AUTH.md) | Consumidor | REST síncrono | ✅ **Completo** | HU-01…HU-06 |
| [CATALOGO](CONTRATO_PANEL_CATALOGO.md) | Proveedor | Broker | ⛔ Tópico sin acordar | HU-02, HU-04, HU-07 |
| [ENTRADAS](CONTRATO_PANEL_ENTRADAS.md) | Proveedor | Broker + consulta | ⛔ Tópico sin acordar | HU-03 |
| [NOTIFICACIONES](CONTRATO_PANEL_NOTIFICACIONES.md) **v1.2** | Proveedor | Broker | ⛔ Tópico sin acordar | HU-03, HU-07 |
| [CHECKIN](CONTRATO_PANEL_CHECKIN.md) **v1.2** | Proveedor | Broker (principal) + GET con sesión (respaldo) | 🟡 GET implementado (ADR-0011) · tópico sin acordar | HU-01, HU-04, HU-07 |
| [PROMOCIONES](CONTRATO_PANEL_PROMOCIONES.md) | Proveedor | Broker o consulta | ⛔ Ni siquiera el mecanismo | — |

**Lo único que Panel consume es Auth.** En los otros cinco Panel es el proveedor:
es quien tiene que emitir los mensajes.

### El bloqueo, en una línea

Los cinco contratos de broker dicen `Nombre exacto del evento/tópico: PENDIENTE DE
ACUERDO`. Hasta que eso se acuerde, los criterios de aceptación que exigen
"notificar al microservicio de Catálogo" no se pueden cumplir ni probar.

---

## 4. Orden de trabajo

### Estado de las historias

| HU | Título | Sprint | Entrega | Depende de | ¿Desbloqueada? |
|---|---|---|---|---|---|
| HU-06 | Verificación de autorización | 1 | 01/10/2026 | Contrato Auth | ✅ **Hecha** |
| HU-01 | Crear un evento | 1 | 01/10/2026 | HU-06 | ✅ **Hecha** |
| HU-05 | Ver mis eventos | 1 | 01/10/2026 | HU-06, HU-01 | ✅ **Hecha** |
| HU-02 | Editar un evento | 2 | 22/10/2026 | HU-01 + tópico Catálogo | ⛔ Parcial |
| HU-04 | Publicar un evento | 1 (adelantada) | 01/10/2026 | HU-01 + tópico Catálogo | ✅ **Hecha salvo el mensaje al broker** (ADR-0009) |
| HU-07 | Notificar cambios de estado | 3 | 05/11/2026 | Tópicos de los 5 contratos | ⛔ No (diseño en ADR-0003) |
| HU-03 | Eliminar un evento | 3 | 05/11/2026 | HU-01 + tópicos Catálogo/Entradas/Notif. | ⛔ Parcial |

"Parcial" significa que la lógica de dominio y la persistencia se pueden escribir
y probar; lo único que no se puede cerrar es el paso de notificación.

### Secuencia recomendada (desde el Sprint 2)

1. **Cada responsable revisa su área** con [`guia-equipo.md`](guia-equipo.md) y acepta o corrige los ADR que le tocan.
2. **HU-02** (editar) sobre lo existente; la pantalla reutiliza el formulario de creación.
3. **En paralelo y desde ya:** acordar con los otros squads la tecnología del broker y los tópicos. Es lo que traba el Sprint 3.
4. **Sprint 3:** outbox + publicador (ADR-0003), HU-07 y HU-03.
5. Detalle por sprint, con tareas y criterios de salida: [`plan-proyecto.md`](plan-proyecto.md).

### Hitos

| Milestone | Fecha | Contenido |
|---|---|---|
| Avance 1 | 01/10/2026 (jueves) | HU-06, HU-01, HU-05 + HU-04 adelantada |
| Avance 2 | 22/10/2026 | HU-02 |
| Avance 3 | 05/11/2026 | HU-07, HU-03 |
| Avance 4 | 18/11/2026 | TASK-01 a TASK-04 (integración y pruebas) |
| Entrega final | 25/11/2026 | TASK-05 a TASK-10 |

---

## 5. Reglas de dominio

Extraídas de los criterios de aceptación. Son transversales a todas las HU.

**Ciclo de vida**
- Un evento nace en **Borrador**.
- Estados: `Borrador`, `Publicado`, `Finalizado`, `Cancelado`.
- Sólo un evento en `Borrador` puede pasar a `Publicado`.
- Antes de publicar hay que validar nombre, fecha y ubicación presentes.
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
