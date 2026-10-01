# Panel Organizador (TicketU)

Módulo encargado de la gestión de eventos para los organizadores, permitiendo crear, editar, publicar y gestionar el ciclo de vida de los eventos en la plataforma TicketU.

## Plan del proyecto

- **Hoja de ruta** (sprints, tareas, responsables, criterios de salida): [`docs/plan-proyecto.md`](docs/plan-proyecto.md)
- **Qué hay en el área de cada integrante y cómo seguir:** [`docs/guia-equipo.md`](docs/guia-equipo.md)
- **Decisiones técnicas (ADR):** [`docs/adr/`](docs/adr/README.md) · índice general de la documentación: [`docs/README.md`](docs/README.md)

## Repositorios

| Repo | Uso |
|---|---|
| [`Joaquin-Martinez-Aravena/panel-organizador`](https://github.com/Joaquin-Martinez-Aravena/panel-organizador) | Repo de trabajo del equipo: desarrollo, pruebas y PRs |
| [`marybaxmann/Equipo-1---Panel-Organizador`](https://github.com/marybaxmann/Equipo-1---Panel-Organizador) | Repo de presentación al profesor. Se actualiza a mano en momentos acordados |

## Requisitos
- Node.js 26.x
- Docker y Docker Compose

## Levantar el entorno local

En terminales separadas, ejecuta los siguientes 6 comandos:

```bash
# 1. Configurar variables de entorno
cp .env.example .env

# 2. Instalar dependencias
npm install

# 3. Levantar infraestructura (MongoDB y mock Auth)
npm run infra:up

# 4. Inicializar base de datos y cargar seed determinista
npm run db:init && npm run db:seed

# 5. Iniciar la API
npm run dev:api

# 6. Iniciar el Frontend (en otra terminal)
npm run dev:web
```

La aplicación estará disponible en [http://localhost:5173](http://localhost:5173). La API en [http://localhost:3000](http://localhost:3000) y Swagger UI en [http://localhost:3000/api-docs](http://localhost:3000/api-docs).

## Usuarios de demo

En local, Auth está simulado (`tools/mock-auth`). El login simulado del frontend fija la cookie `jwt`:

| Botón | Token | Qué demuestra |
|---|---|---|
| Organizadora A | `token-org-a` | 5 eventos en los 4 estados (Borrador, Publicado, Finalizado, Cancelado) |
| Organizador B | `token-org-b` | 2 eventos. Su evento `66f1b0000000000000000001` sirve para probar "no te pertenece" (403) siendo A |
| Asistente | `token-asistente` | Rol distinto de organizador → acceso denegado (403) |
| (sólo API) Staff | `token-staff` | Rol `staff` de Check-in: puede consultar `GET /api/v1/panel/eventos/{id}` (ADR-0011) |
| Sesión expirada | `token-expirado` | Sesión inválida → vuelve al login (401) |
| Auth lento | `token-lento` | Auth no responde a tiempo → fail-secure (503) |

## Responsables por rol (rúbrica Evaluación 1)

| Rol | Ítems de la rúbrica | Responsable(s) |
|---|---|---|
| Back End | BE1, BE2, BE3 | Joaquín Andrés Martínez |
| Base de Datos | BD1, BD2, BD3, BD4 | Christopher Okinggton |
| UI/UX (front end) | UI1, UI2, UI3 | Alonso Alejandro Vera |
| Gestión | GE1, GE2, GE3, GE4 | Mariajosé Baxmann |
| Calidad | CA1, CA2 | Etienne Araya |

## Dónde está cada evidencia (rúbrica TITEC · Evaluación 1)

| Ítem | Qué evalúa | Evidencia |
|---|---|---|
| **BE1** | Servicios propios (Swagger) | [`docs/api/openapi.yaml`](docs/api/openapi.yaml) · tags *Organizador* (HU-01/05/06 implementadas; HU-02/03/04 definidas) · UI en `http://localhost:3000/api-docs` |
| **BE2** | Invocación a servicios de otros squads | [`backend/src/modules/auth/auth.client.ts`](backend/src/modules/auth/auth.client.ts) · contrato consumido en [`docs/api/auth-consumido.yaml`](docs/api/auth-consumido.yaml) |
| **BE3** | Servicios que requieren otros squads (Swagger) | [`docs/api/openapi.yaml`](docs/api/openapi.yaml) · tags *Integración — Catálogo / Entradas / Check-in / Notificaciones / Promociones* · implementación en [`backend/src/modules/integraciones/`](backend/src/modules/integraciones/) |
| **BD1** | Soporte a las historias | [`docs/bd/diagrama-er.md`](docs/bd/diagrama-er.md) (generado desde la BD) · `eventos` cubre HU-01..05 y `cambios_estado_evento` cubre HU-04/HU-07 |
| **BD2** | Sin datos de negocio de otros squads | Sólo referencias `id_organizador` / `id_usuario_responsable` (REF Auth). Stock, QR y datos de usuario **no** se almacenan. Ver [`docs/bd/diccionario-datos.md`](docs/bd/diccionario-datos.md) |
| **BD3** | Nomenclatura y documentación | [`docs/bd/diccionario-datos.md`](docs/bd/diccionario-datos.md) (generado desde la BD; convenciones al final) · script de creación [`database/scripts/create-collections.mjs`](database/scripts/create-collections.mjs) + [`database/schema/`](database/schema/) |
| **BD4** | Diseño técnico (PK, tipos, FK, nulabilidad, sin ciclos) | Validadores `$jsonSchema` en [`database/schema/`](database/schema/) · diagrama con PK/FK/NULL · test [`backend/tests/database-schema.test.ts`](backend/tests/database-schema.test.ts) |
| **UI1–UI3** | App funcional y estándares de UI | [`frontend/`](frontend/) · [`docs/ui/checklist-consistencia-visual.md`](docs/ui/checklist-consistencia-visual.md) (acordado entre squads) · [`docs/ui/estandares-ui.md`](docs/ui/estandares-ui.md) · se evalúa con la demo en vivo |
| **GE1–GE3** | Planificación, historias y avance | [Issues](https://github.com/marybaxmann/Equipo-1---Panel-Organizador/issues) · [Milestones](https://github.com/marybaxmann/Equipo-1---Panel-Organizador/milestones) · tablero del proyecto (GitHub Projects) · [`docs/sprints.md`](docs/sprints.md) |
| **GE4** | Trabajo de integración | [Issues con label `integracion`](https://github.com/marybaxmann/Equipo-1---Panel-Organizador/issues?q=label%3Aintegracion) · contratos en [`docs/`](docs/) |
| **CA1** | Pruebas de funcionalidad | [`docs/evidencias/pruebas-funcionalidad/`](docs/evidencias/pruebas-funcionalidad/README.md) (70 tests, cobertura 92 %) · CI en GitHub Actions |
| **CA2** | Pruebas de integración | [`postman/`](postman/) · resultados en [`docs/evidencias/pruebas-integracion/`](docs/evidencias/pruebas-integracion/README.md) · pruebas de contrato OpenAPI en [`backend/tests/contrato-openapi.test.ts`](backend/tests/contrato-openapi.test.ts) |
| — | Responsables por rol, HU, tarea y contrato | [`RESPONSABLES.md`](RESPONSABLES.md) |
| — | Definition of Done | [`docs/DEFINITION_OF_DONE.md`](docs/DEFINITION_OF_DONE.md) |
| — | Tablero del proyecto | [GitHub Projects — Equipo 1](https://github.com/users/marybaxmann/projects/4/views/3) |
