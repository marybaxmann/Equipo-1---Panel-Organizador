# Registro de decisiones de arquitectura (ADR)

Un ADR documenta **una** decisión técnica con consecuencias: por qué se tomó, qué
alternativas se descartaron y qué pasa si hay que revertirla. Sirve para que en
noviembre nadie tenga que reconstruir de memoria por qué algo se hizo así.

## Convención

- Nombre: `NNNN-titulo-en-kebab-case.md`, numeración correlativa desde `0001`.
- Un ADR = una decisión. Si son dos decisiones, son dos ADR.
- **Un ADR no se edita ni se borra una vez aceptado.** Si la decisión cambia, se
  escribe uno nuevo que la reemplaza y se marca el viejo como `Reemplazado por ADR-NNNN`.

## Estados

| Estado | Significado |
|---|---|
| `Propuesta` | Escrito, sin acordar con el equipo. |
| `Aceptado` | El equipo lo acordó. Es vinculante. |
| `Rechazado` | Se evaluó y se descartó. Se conserva: el descarte también es información. |
| `Reemplazado por ADR-NNNN` | Vigente en su momento, superado por otra decisión. |

## Estructura

Contexto → Opciones consideradas → Decisión → Lo que NO decide → Consecuencias →
Cómo se revierte.

La sección "lo que NO decide" es la que más se olvida y la que más problemas
evita: deja explícito qué sigue abierto, para que no se dé por resuelto por omisión.

## Índice

| # | Título | Estado |
|---|---|---|
| [0001](0001-stack-del-panel-organizador.md) | Stack del Panel Organizador (Python + FastAPI) | Rechazado → ver 0004 |
| [0002](0002-motor-de-base-de-datos.md) | Motor de base de datos: MongoDB con validadores `$jsonSchema` | Propuesta · implementado |
| [0003](0003-aislamiento-publicacion-broker.md) | Aislamiento de la publicación al broker (outbox) | Propuesta · Sprint 3 |
| [0004](0004-stack-node-typescript.md) | Stack: Node.js + TypeScript + Express + Zod | Propuesta · implementado |
| [0005](0005-validacion-de-sesion-delegada-a-auth.md) | Validación de sesión delegada a Auth (fail-secure) | Propuesta · implementado |
| [0006](0006-api-contract-first-openapi.md) | API contract-first con OpenAPI y pruebas de contrato | Propuesta · implementado |
| [0007](0007-integracion-rest-y-datos-de-otros-squads.md) | Servicios REST para consumidores y sólo referencias a datos ajenos | Propuesta · implementado · en parte → 0011 |
| [0008](0008-frontend-estandar-visual-y-login-simulado.md) | Frontend: base del equipo, estándar visual y login simulado | Propuesta · implementado |
| [0009](0009-hu04-adelantada-al-sprint-1.md) | HU-04 adelantada al Sprint 1 | Propuesta · implementado |
| [0010](0010-monorepo-y-flujo-de-calidad.md) | Monorepo con workspaces y flujo de calidad | Propuesta · implementado |
| [0011](0011-alineacion-contrato-checkin-v1-2.md) | Alineación con el contrato de Check-in v1.2 (reemplaza en parte a 0007) | Propuesta · implementado |
| [0012](0012-repo-de-trabajo-y-repo-de-presentacion.md) | Repo de trabajo, repo de presentación y sincronización | Propuesta · **a acordar** |

> "Propuesta · implementado" = ya está en el código, pero **el equipo todavía no lo revisó**. Cada responsable de área
> revisa los suyos (ver `docs/guia-equipo.md`) y lo pasa a `Aceptado`, o propone cambios en un PR.
