# Guía del equipo — qué hay en tu área y cómo seguir

Punto de partida para cada integrante. Explica **qué se avanzó en tu área**
durante el Sprint 1, **dónde está** y **cómo revisarlo o cambiarlo** sin romper lo demás.

Las **decisiones** están en [`adr/`](adr/README.md) y la **hoja de ruta** en [`plan-proyecto.md`](plan-proyecto.md).
Si algo de lo que se hizo en tu área no te convence, **edítalo**: abre un PR, y si cambia una decisión, escribe un ADR nuevo que la reemplace.

---

## 0. Antes de tocar nada

**Repositorios:** se trabaja en `Joaquin-Martinez-Aravena/panel-organizador` (ramas + PR). `marybaxmann/Equipo-1---Panel-Organizador` queda **sólo para presentar al profesor**: lo actualiza a mano la persona designada, en momentos acordados.

```bash
cp .env.example .env && npm install
npm run infra:up                      # MongoDB + Auth simulado (Docker)
npm run db:init && npm run db:seed    # colecciones con validadores + 7 eventos de demo
npm run dev:api                       # API en http://localhost:3000 (Swagger en /api-docs)
npm run dev:web                       # Front en http://localhost:5173/login
```

**Verificación obligatoria antes de abrir un PR** (el CI corre lo mismo):
```bash
npm run typecheck -w backend && npm test
npm run build -w frontend && npm run lint -w frontend
npx @redocly/cli lint docs/api/openapi.yaml
npm run test:integration   # con la API y el seed levantados
```

**Reglas que valen para todas las áreas**
- Los campos de la API y de la BD van en **español snake_case, idénticos a los contratos** (`id_evento`, `nombre_evento`…). El código va en inglés. Ver [ADR-0006](adr/0006-api-contract-first-openapi.md).
- Toda operación del organizador pasa por Auth; la identidad nunca sale del frontend. Ver [ADR-0005](adr/0005-validacion-de-sesion-delegada-a-auth.md).
- No se guardan ni se muestran datos de otros squads, sólo sus IDs. Ver [ADR-0007](adr/0007-integracion-rest-y-datos-de-otros-squads.md).
- **No se cambian** los IDs del seed ni los archivos generados a mano (`docs/bd/*`, la colección Postman). Ver [ADR-0010](adr/0010-monorepo-y-flujo-de-calidad.md).
- Commits en Conventional Commits en inglés. PR revisado por otra persona. No se mergea con el CI en rojo.


---

## 1. Back End · Joaquín Martínez (BE1–BE3)

| Qué | Dónde |
|---|---|
| Rutas del organizador (HU-01, HU-04, HU-05) | `backend/src/modules/eventos/organizer.routes.ts` · `evento.service.ts` |
| Validación de sesión y rol (HU-06) | `backend/src/modules/auth/auth.client.ts` · `require-organizer.ts` |
| Servicios para otros squads | `backend/src/modules/integraciones/` |
| Swagger | `docs/api/openapi.yaml` (propio) · `docs/api/auth-consumido.yaml` (consumido) |

**Sigue:** HU-02 editar (Sprint 2) y outbox + broker con HU-07 (Sprint 3, [ADR-0003](adr/0003-aislamiento-publicacion-broker.md)).

## 2. Base de Datos · Christopher Okinggton (BD1–BD4)

**Lo que se avanzó en tu área:** el diseño en MongoDB con validadores `$jsonSchema` (el "script de creación"), los índices,
el seed de demo y un generador que produce el **diagrama ER y el diccionario desde la base en ejecución**.
El porqué está en [ADR-0002](adr/0002-motor-de-base-de-datos.md). **Revísalo: es tu nota de rol.**

| Qué | Dónde |
|---|---|
| Esquema = diccionario (la `description` de cada campo) | `database/schema/01-eventos.json`, `02-cambios_estado_evento.json` |
| Script de creación (idempotente) | `database/scripts/create-collections.mjs` → `npm run db:init` |
| Seed determinista | `database/scripts/seed-demo.mjs` → `npm run db:seed` |
| Diagrama y diccionario generados | `database/scripts/generate-docs.mjs` → `npm run db:docs` → `docs/bd/` |
| Tests de la BD | `backend/tests/database-schema.test.ts` |

**Preguntas probables del profesor:** ¿por qué MongoDB si la rúbrica es relacional? · ¿dónde está la FK? (`cambios_estado_evento.id_evento`, declarada con `[FK eventos._id]`) · ¿por qué no hay datos de Auth? (sólo `id_organizador`) · ¿qué pasa con un documento inválido? (la BD lo rechaza con el error 121).

**Sigue:** colección `mensajes_salientes` (Sprint 3) y pruebas funcionales de las 7 HU (TASK-03).

## 3. UI/UX · Alonso Vera (UI1–UI3)

**Lo que se avanzó sobre tu frontend:**
- se conectó a la API real y se retiraron los mocks y la "capacidad", que es dato de Entradas;
- se agregaron el login simulado (`/login`), la pantalla de detalle y el modal de confirmación para publicar;
- el lápiz y la papelera muestran el aviso de Sprint 2/3;
- los emojis se cambiaron por íconos Lucide (fila 20).

El detalle está en [ADR-0008](adr/0008-frontend-estandar-visual-y-login-simulado.md). **Revísalo y ajusta lo que no calce con tu diseño.**

| Qué | Dónde |
|---|---|
| Estándar acordado entre squads | `docs/ui/checklist-consistencia-visual.md` · índice y desviaciones en `docs/ui/estandares-ui.md` |
| Tokens | `frontend/src/styles/tokens.css` |
| Acceso a la API (el único lugar que conoce las rutas) | `frontend/src/api/eventsApi.js` · `httpClient.js` |
| Sesión (HU-06) | `frontend/src/context/SesionContext.jsx` |
| Pantallas | `frontend/src/pages/` (Mis eventos, Nuevo evento, Detalle, Login simulado) |

**Deuda para ti:** las desviaciones listadas en `docs/ui/estandares-ui.md` y los 4 warnings de `npm run lint -w frontend`.
**Sigue:** pantalla Editar (HU-02), modal de eliminar con el texto de la fila 33 (HU-03) y login real de Auth (Sprint 4).

## 4. Gestión · Mariajosé Baxmann (GE1–GE4)

**Lo que dejamos preparado para ti** (los textos para pegar están en [`plan-proyecto.md`](plan-proyecto.md)):
- Definition of Done (§4.2) y política de autorización (§4.3), para pegar en las 7 HU;
- los issues de integración INT-01..INT-08: **Etienne ya los creó en el repo de trabajo**; falta replicarlos en el de presentación para GE4 (plan §10, [ADR-0012](adr/0012-repo-de-trabajo-y-repo-de-presentacion.md));
- el calendario de sprints (§2) y el checklist de cierre (§5.3);
- `RESPONSABLES.md` (tu versión, en la raíz) y [`DEFINITION_OF_DONE.md`](DEFINITION_OF_DONE.md) (tu versión).

**Para dar acceso al tablero** (Projects #4): Project → ⋯ → **Settings → Manage access** → invitar con rol *Write*. Ser colaborador del repo no da acceso al tablero.

**Decisiones que te tocan:**
- si HU-04 (#4) se cierra ahora o con HU-07 ([ADR-0009](adr/0009-hu04-adelantada-al-sprint-1.md));
- mantener el tablero al día. El sprint de cada HU lo definen los milestones de GitHub.

## 5. Calidad · Etienne Araya (CA1–CA2) · Integración con otros squads

**Lo que se avanzó en tu área:**
- 77 tests automatizados, con una tabla que relaciona cada criterio de aceptación con su test;
- pruebas de contrato que validan cada respuesta real contra el Swagger;
- colección Postman con 16 casos y su resultado esperado, ejecutada con Newman;
- CI en GitHub Actions.

El porqué está en [ADR-0006](adr/0006-api-contract-first-openapi.md) y [ADR-0010](adr/0010-monorepo-y-flujo-de-calidad.md).

| Qué | Dónde |
|---|---|
| Evidencia de pruebas funcionales | `docs/evidencias/pruebas-funcionalidad/README.md` (criterio → test) |
| Colección Postman (se edita el **generador**, no el JSON) | `postman/generate-collection.mjs` → `postman/panel-organizador.postman_collection.json` |
| Evidencia de integración | `docs/evidencias/pruebas-integracion/` |
| Contrato OpenAPI | `backend/tests/contrato-openapi.test.ts` |
| Qué exponemos a cada squad | [ADR-0007](adr/0007-integracion-rest-y-datos-de-otros-squads.md) |

**Revisa tus issues INT** con la tabla del plan §10: INT-01 ya está implementado e INT-04 pide devolver `capacidad_*`, que choca con BD2.

**Lo más urgente para ti:** cerrar con los otros squads la **tecnología de broker y los tópicos** antes del 15/10 (bloquea el Sprint 3) y conseguir la **URL real de Auth** (INT-01).

---

## 6. Lo que abarcamos de otros squads

Para que cada squad lo revise en su propio contrato:

| Squad | Qué hizo Panel por ellos | Qué necesitamos de ellos |
|---|---|---|
| Auth | Cliente según el contrato v1.1 y un mock con el mismo formato de respuesta | Confirmar SLA/timeout/reintento y la URL del ambiente de integración; aclarar la fila "usuario (id, rol) → Auth" |
| Catálogo | `proximos`, `buscar` y detalle, con las rutas del contrato; los borradores nunca son visibles | Confirmar los nombres de campo y `estado_disponibilidad`; tópico `panel.evento.catalogo.v1` |
| Entradas | `GET /api/v1/panel/eventos/{id}` con los campos del contrato; **ahora pide sesión `staff`/`organizador`** (ADR-0011) | **Cómo se autentican en ese GET** · cómo informan el stock para calcular `AGOTADO`; la regla para eliminar eventos con entradas vendidas |
| Check-in | Contrato **v1.2**: `GET /api/v1/panel/eventos/{id}` con sesión `staff`/`organizador`, `hora_fin_evento`, eventos que cruzan medianoche ([ADR-0011](adr/0011-alineacion-contrato-checkin-v1-2.md)) | Confirmar los pendientes §7 del contrato (broker, tópico, formato de error, aforo) |
| Notificaciones | `/cambios-estado` con el formato del contrato | Tópico `panel.evento.notificaciones.v1` y política de ACK |
| Promociones | `/eventos-disponibles` | Confirmar el mecanismo (REST o broker) y el momento en que necesitan el `id_evento` |
