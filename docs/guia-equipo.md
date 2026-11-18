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

**Hecho al Avance 4:** HU-02, HU-03 con consulta de stock a Entradas ([ADR-0016](adr/0016-eliminacion-de-eventos-y-consulta-de-stock.md)), HU-07 con outbox y RabbitMQ ([ADR-0013](adr/0013-publicacion-outbox-rabbitmq-plataforma.md), [ADR-0017](adr/0017-sobre-en-el-cuerpo-para-entradas.md), [ADR-0018](adr/0018-consumo-stock-entradas-y-disponibilidad.md)) e INT-11 (`x-api-key` con Auth).
**Sigue (Sprint 5):** correcciones de integración (TASK-04/06) y despliegue (TASK-08).

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

**Hecho al Avance 4:** colección `mensajes_salientes`, campo `estado_disponibilidad` (AGOTADO) y evidencia de las 7 HU (TASK-03).
**Sigue (Sprint 5):** pruebas finales (TASK-05).

## 3. UI/UX · Alonso Vera (UI1–UI3)

**Lo que se avanzó sobre tu frontend:**
- se conectó a la API real y se retiraron los mocks y la "capacidad", que es dato de Entradas;
- se agregaron el login simulado (`/login`), la pantalla de detalle y el modal de confirmación para publicar;
- el lápiz y la papelera llevan a Editar (HU-02) y a Eliminar con su modal (HU-03);
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
**Hecho al Avance 4:** pantalla Editar (HU-02) y Eliminar con modal (HU-03, fila 33).
**Sigue:** login real de Auth, proxy de Vite hacia el API Gateway e integrar la interfaz en el Frontend Unificado de la plataforma (`/organizador`).

## 4. Gestión · Mariajosé Baxmann (GE1–GE4)

**Lo que dejamos preparado para ti** (los textos para pegar están en [`plan-proyecto.md`](plan-proyecto.md)):
- Definition of Done (§4.2) y política de autorización (§4.3), para pegar en las 7 HU;
- los issues de integración INT-01..INT-08: **Etienne ya los creó en el repo de trabajo**; falta replicarlos en el de presentación para GE4 (plan §10, [ADR-0012](adr/0012-repo-de-trabajo-y-repo-de-presentacion.md));
- el calendario de sprints (§2) y el checklist de cierre (§5.3);
- `RESPONSABLES.md` (tu versión, en la raíz) y [`DEFINITION_OF_DONE.md`](DEFINITION_OF_DONE.md) (tu versión).

**Para dar acceso al tablero** (Projects #4): Project → ⋯ → **Settings → Manage access** → invitar con rol *Write*. Ser colaborador del repo no da acceso al tablero.

**Decisiones que te tocan:**
- cerrar en el tablero HU-03, HU-07, INT-05 e INT-11, ya implementadas, y comentar INT-09 e INT-10 (I1 e I2) con la evidencia de la sesión del 17/11;
- mantener el tablero al día. El sprint de cada HU lo definen los milestones de GitHub.

## 5. Calidad · Etienne Araya (CA1–CA2) · Integración con otros squads

**Lo que se avanzó en tu área:**
- 181 tests automatizados, con una tabla que relaciona cada criterio de aceptación con su test;
- pruebas de contrato que validan cada respuesta real contra el Swagger;
- colección Postman con 32 requests y su resultado esperado, ejecutada con Newman;
- pruebas con el Auth real y una sesión de integración completa con los servicios reales en la red compartida;
- CI en GitHub Actions.

El porqué está en [ADR-0006](adr/0006-api-contract-first-openapi.md) y [ADR-0010](adr/0010-monorepo-y-flujo-de-calidad.md).

| Qué | Dónde |
|---|---|
| Evidencia de pruebas funcionales | `docs/evidencias/pruebas-funcionalidad/README.md` (criterio → test) |
| Colección Postman (se edita el **generador**, no el JSON) | `postman/generate-collection.mjs` → `postman/panel-organizador.postman_collection.json` |
| Entorno local directo (`:3000/api/v1`) | `postman/local.postman_environment.json` |
| Entorno API Gateway (`:8080/api/organizador/v1`) | `postman/gateway.postman_environment.json` |
| Evidencia de integración | `docs/evidencias/pruebas-integracion/` |
| Plan de pruebas de contrato (TASK-02) | `docs/plan-pruebas-contrato-sprint-3.md` |
| Contrato OpenAPI | `backend/tests/contrato-openapi.test.ts` |
| Mensajes de alineación con squads | `docs/mensajes-sprint-3.md` |
| Qué exponemos a cada squad | [ADR-0007](adr/0007-integracion-rest-y-datos-de-otros-squads.md) · [ADR-0013](adr/0013-publicacion-outbox-rabbitmq-plataforma.md) · [ADR-0014](adr/0014-politica-consumo-broker-y-responsabilidades-plataforma.md) |

**Cómo correr la colección Postman (TASK-02):**
1. **Ejecución local directa (puerto 3000):**
   ```bash
   npx newman run postman/panel-organizador.postman_collection.json -e postman/local.postman_environment.json
   ```
2. **Ejecución a través del API Gateway de TicketU (puerto 8080, Sprint 3):**
   Con el API Gateway corriendo en `http://localhost:8080` y el backend en la red compartida:
   ```bash
   npx newman run postman/panel-organizador.postman_collection.json -e postman/gateway.postman_environment.json
   ```

**Revisa tus issues INT** con la tabla del plan §10: INT-01 ya está implementado e INT-04 pide devolver `capacidad_*`, que choca con BD2.

**Hecho al Avance 4:** prueba con el Auth real y sesión de integración con Gateway, RabbitMQ, Auth y Entradas reales ([evidencia](evidencias/pruebas-integracion/sesion-integracion-2026-11-17.md)).
**Sigue (Sprint 5):** carpeta HU-03 en Postman, repetir la sesión cuando Entradas corrija sus hallazgos (H1–H6) y validación final (TASK-09).

---

## 6. Lo que abarcamos de otros squads

Para que cada squad lo revise en su propio contrato:

| Squad | Qué hizo Panel por ellos | Qué necesitamos de ellos |
|---|---|---|
| Auth (v1.1, propuesta v1.2) | Cliente según el contrato v1.1 y un mock con el mismo formato de respuesta | Confirmar SLA/timeout/reintento, autenticación M2M (servicio staff) y el hostname/puerto del ambiente de integración (10000) |
| Catálogo (v1.1, propuesta v1.2) | `proximos`, `buscar` y detalle (`/organizador/eventos/*`), rutas Gateway `/api/organizador/v1/organizador/eventos/*`; outbox hacia `panel.evento.catalogo.v1` con `hora_fin_evento` | Confirmar `hora_fin_evento`, formato `AAAA-MM-DD`/`HH:mm`, eventos ante `CANCELADO`/`FINALIZADO` y filtros de `/buscar` |
| Entradas (v1.2, propuesta v1.3) | `GET /api/organizador/v1/panel/eventos/{id}` con campos de integración (exige sesión staff/organizador); outbox hacia `panel.evento.entradas.v1` | **Cómo se autentican en ese GET** · tópico `entradas.evento.stock.v1` para stock 0 y reactivación · regla de eliminación física ante edición de capacidad |
| Check-in (v1.2, propuesta v1.3) | Contrato vigente v1.2 (propuesta **v1.3**): GET de respaldo vía Gateway (`/api/organizador/v1/panel/eventos/{id}`) con sesión staff/organizador; `hora_fin_evento`; outbox hacia `panel.evento.checkin.v1` | Confirmar formato de error (Auth vs Panel), confirmación de routing key y propuesta de política de 3 reintentos |
| Notificaciones (v1.3, propuesta v1.4) | Outbox hacia `ticketu.events` con routing key `panel.evento.notificaciones.v1` (`evento_actualizado` y `evento_reprogramado`); consulta de respaldo `/api/organizador/v1/panel/eventos/{id}/cambios-estado` | Confirmar inclusión de `nombre_evento` y `hora_fin_evento`, aclaración de `fecha_cambio` y prevención de carrera ante `CANCELADO` |
| Promociones (v1.1, propuesta v1.2) | Outbox hacia `panel.evento.promociones.v1` al publicar; consulta de respaldo `/api/organizador/v1/panel/eventos-disponibles` | Confirmar mecanismo broker, momento de recepción de `id_evento` y necesidad de `precio`/`tipo_entrada` |
