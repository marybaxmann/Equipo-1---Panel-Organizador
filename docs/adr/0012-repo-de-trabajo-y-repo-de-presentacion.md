# ADR-0012 — Repo de trabajo, repo de presentación y cómo se sincronizan

- **Estado:** Propuesta (**la tiene que acordar el equipo**)
- **Fecha:** 2026-09-30
- **Responsables:** todo el equipo · Gestión (Mariajosé) para el repo de presentación
- **Afecta a:** dónde se escribe cada cosa · GE1–GE4 · el flujo de trabajo de todos los integrantes

---

## 1. Contexto

Hay dos repositorios:

| Repo | Quién escribe hoy |
|---|---|
| `Joaquin-Martinez-Aravena/panel-organizador` (privado; colaboradores: todo el equipo) | Código, docs, ADR, tests, issues INT-01..INT-08 |
| `marybaxmann/Equipo-1---Panel-Organizador` | Issues HU/TASK, milestones, tablero (Projects #4), y el 30/09: DoD, RESPONSABLES, sprints y el contrato de Check-in v1.2 |

Los dos se editaron en paralelo y **se desalinearon**: el contrato de Check-in v1.2 sólo existía en el segundo, y la
implementación quedó hecha contra la v1.1 (ver ADR-0011). Además, el 30/09 se limpió el historial del repo de trabajo: **los
dos repos ya no comparten historia de git**, así que un `git merge` entre ellos no sirve.

El profesor evalúa el repo que se le presenta. GE1–GE4 se revisan en *ese* GitHub (issues, tablero, milestones).

## 2. Decisión propuesta

**Cada tipo de contenido tiene un solo lugar donde se edita:**

| Contenido | Se edita en | Se refleja en | Cómo |
|---|---|---|---|
| Código, tests, Swagger, BD, ADR, guía, plan | **Repo de trabajo** (PR a `sprint-1`, luego a `main`) | Repo de presentación | Traspaso manual en cada entrega (copia de archivos + PR) |
| **Contratos** `docs/CONTRATO_PANEL_*.md` | **Repo de trabajo** | Repo de presentación | Ídem. Si un squad externo acuerda un cambio, se sube primero aquí, en el mismo PR que adapta el código |
| DoD, RESPONSABLES, sprints | **Repo de trabajo** | Repo de presentación | Ídem |
| Issues HU/TASK, milestones y tablero | **Repo de presentación** (es lo que evalúa GE1–GE3) | — | Directo en GitHub |
| Issues de integración INT-01..INT-08 | **Repo de presentación** (GE4) | Se pueden conservar como copia de trabajo en el repo privado | Hay que **replicarlos** en el de presentación |

**Regla anti-desalineación:** si alguien edita algo del repo de presentación que no sean issues o el tablero, avisa y
lo sube también al repo de trabajo el mismo día. Antes de cada traspaso, se compara:
```bash
git fetch equipo
for f in docs/CONTRATO_PANEL_*.md docs/DEFINITION_OF_DONE.md docs/sprints.md; do
  git diff --quiet HEAD equipo/main -- "$f" 2>/dev/null || echo "DIFIERE: $f"
done
```

**Referencias a issues:** los números **no coinciden** entre los repos (`#1` es INT-01 en el de trabajo y HU-01 en el de
presentación). En commits y PRs del repo de trabajo se usa la referencia completa `marybaxmann/Equipo-1---Panel-Organizador#N`.
**`Closes #N` sólo se usa en PRs del repo de presentación.**

## 3. Lo que este ADR NO decide

- Quién hace el traspaso en cada entrega: lo acuerda el equipo (hasta ahora, Joaquín).
- Si más adelante conviene un solo repo: requiere que la persona dueña del repo de presentación lo acepte.

## 4. Consecuencias

- Nadie trabaja directo en el repo de presentación, salvo issues, milestones y tablero. El contenido llega ahí sólo por el traspaso.
- Para mover tarjetas en el tablero (Projects #4) hace falta que Mariajosé dé acceso en **Project → Settings → Manage access**: ser colaborador del repo no alcanza.

## 5. Cómo se revierte

Si el equipo decide trabajar directamente en el repo de presentación, éste pasa a ser el de trabajo y el privado se archiva.
Se copian los archivos una vez y se actualiza la guía del equipo.
