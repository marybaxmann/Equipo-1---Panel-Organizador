# Pruebas de Funcionalidad (Vitest)

## Resultados
- **Comando ejecutado**: `npm run test:report -w backend | tee docs/evidencias/pruebas-funcionalidad/vitest-output.txt`
- **Fecha de ejecución**: 2026-09-30 (con el contrato de Check-in v1.2)
- **Resumen**: 79/79 tests exitosos · cobertura de sentencias 92.67 %.

## Criterios de aceptación → tests

| HU | Criterio de aceptación | Test(s) que lo verifican (`backend/tests/`) |
|---|---|---|
| HU-01 | El organizador debe estar autenticado | `hu01-crear-evento` › "401 sin sesión y 403 si no es organizador" |
| HU-01 | Ingresar nombre, descripción, fecha/hora y ubicación | `hu01-crear-evento` › "crea el evento en BORRADOR…", "acepta campos opcionales…" |
| HU-01 | Validar campos obligatorios | `hu01-crear-evento` › "valida campos obligatorios…", "rechaza una fecha pasada", "rechaza evento PAGADA sin precio", "rechaza un precio fuera de rango" |
| HU-01 | Asociado al organizador que lo creó | `hu01-crear-evento` › "crea el evento…asociado al organizador", "no permite imponer dueño ni estado desde el body" |
| HU-01 | Queda inicialmente en "Borrador" | `hu01-crear-evento` › "crea el evento en BORRADOR…", "registra el cambio de estado inicial" |
| HU-05 | Sólo los eventos del organizador | `hu05-mis-eventos` › "muestra únicamente los eventos del organizador…" |
| HU-05 | Nombre, fecha, ubicación y estado | `hu05-mis-eventos` › "cada evento trae nombre, fecha, ubicación y estado" |
| HU-05 | Seleccionar un evento | `hu05-mis-eventos` › "permite seleccionar un evento propio (detalle)" |
| HU-05 | Diferenciar según estado | `hu05-mis-eventos` › "filtra por estado_gestion…" · UI: `BadgeEstado` y franja de color por estado en `TarjetaEvento` (se muestra en la demo) |
| HU-04 | Sólo eventos propios | `hu04-publicar-evento` › "sólo eventos propios (evento de B siendo A → 403)" |
| HU-04 | Sólo Borrador → Publicado | `hu04-publicar-evento` › "un BORRADOR propio pasa a PUBLICADO…", "sólo un BORRADOR puede publicarse (PUBLICADO → 409)" |
| HU-04 | Hora de término obligatoria para publicar (contrato Check-in v1.2) | `hu04-publicar-evento` › "exige hora_fin_evento para publicar" |
| HU-01 | Eventos que terminan después de medianoche (contrato Check-in v1.2) | `hu01-crear-evento` › "acepta un evento que termina después de medianoche" |
| HU-04 | Visible en Catálogo al publicarse; el borrador no | `hu04-publicar-evento` › "al publicarse aparece en Catálogo (antes no era visible)" · `integraciones` › "detalle: BORRADOR no es visible" |
| HU-06 | Validar token/sesión contra Auth | `auth.client` (10 tests: reenvío de cookie, 401/403/500, timeout, reintento, fail-secure) · `require-organizer` › "passes the Auth identity…" |
| HU-06 | Rol distinto de organizador → denegar con mensaje | `require-organizer` › "403 FORBIDDEN_ROLE…" · `hu01` › "…403 si no es organizador" |
| HU-06 | Token inválido/expirado → login | `require-organizer` › "401 when Auth rejects the token" · UI: redirección a `/login?motivo=sesion` |
| HU-06 | Validación de propiedad | `hu05-mis-eventos` › "403 al pedir el evento de otro organizador" |
| HU-06 | Fail-secure si Auth no responde | `auth.client` › "fails secure with 503…" (×3) · `hu01` › "503 si Auth no está disponible y no crea nada" |

## Conteo por archivo (79 tests)

| Archivo | Tests |
|---|---|
| `auth.client.test.ts` | 10 |
| `contrato-openapi.test.ts` | 15 |
| `database-schema.test.ts` | 7 |
| `hu01-crear-evento.test.ts` | 11 |
| `hu04-publicar-evento.test.ts` | 6 |
| `hu05-mis-eventos.test.ts` | 7 |
| `integraciones.test.ts` | 18 |
| `require-organizer.test.ts` | 5 |

Cobertura global del código backend: **92.23%**.
