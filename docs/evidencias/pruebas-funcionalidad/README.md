# Pruebas de Funcionalidad (Vitest)

## Resultados
- **Comando ejecutado**: `npm run test:report -w backend | tee docs/evidencias/pruebas-funcionalidad/vitest-output.txt`
- **Fecha de ejecución**: 2026-11-18 (Avance 4: las 7 HU, HU-03 Eliminar/Cancelar, aviso de stock de Entradas con `stock-consumer`, outbox relay, CORS para el Frontend Unificado y anuncio del seed por el broker)
- **Resumen**: 181/181 tests exitosos en 18 archivos · cobertura global de sentencias 82.26 % (ramas 92.45 %, funciones 95.65 %).

## Criterios de aceptación → tests

| HU | Criterio de aceptación | Test(s) que lo verifican (`backend/tests/`) |
|---|---|---|
| HU-01 | El organizador debe estar autenticado | `hu01-crear-evento` › "401 sin sesión y 403 si no es organizador" |
| HU-01 | Ingresar nombre, descripción, fecha/hora y ubicación | `hu01-crear-evento` › "crea el evento en BORRADOR…", "acepta campos opcionales…" |
| HU-01 | Validar campos obligatorios | `hu01-crear-evento` › "valida campos obligatorios…", "rechaza una fecha pasada", "rechaza evento PAGADA sin precio", "rechaza un precio fuera de rango" |
| HU-01 | Asociado al organizador que lo creó | `hu01-crear-evento` › "crea el evento…asociado al organizador", "no permite imponer dueño ni estado desde el body" |
| HU-01 | Queda inicialmente en "Borrador" | `hu01-crear-evento` › "crea el evento en BORRADOR…", "registra el cambio de estado inicial" |
| HU-01 | Eventos que terminan después de medianoche (contrato Check-in v1.2) | `hu01-crear-evento` › "acepta un evento que termina después de medianoche" |
| HU-05 | Sólo los eventos del organizador | `hu05-mis-eventos` › "muestra únicamente los eventos del organizador…" |
| HU-05 | Nombre, fecha, ubicación y estado | `hu05-mis-eventos` › "cada evento trae nombre, fecha, ubicación y estado" |
| HU-05 | Seleccionar un evento | `hu05-mis-eventos` › "permite seleccionar un evento propio (detalle)" |
| HU-05 | Diferenciar según estado | `hu05-mis-eventos` › "filtra por estado_gestion…" · UI: `BadgeEstado` y franja de color por estado en `TarjetaEvento` (se muestra en la demo) |
| HU-04 | Sólo eventos propios | `hu04-publicar-evento` › "sólo eventos propios (evento de B siendo A → 403)" |
| HU-04 | Sólo Borrador → Publicado | `hu04-publicar-evento` › "un BORRADOR propio pasa a PUBLICADO…", "sólo un BORRADOR puede publicarse (PUBLICADO → 409)" |
| HU-04 | Hora de término obligatoria para publicar (contrato Check-in v1.2) | `hu04-publicar-evento` › "exige hora_fin_evento para publicar" |
| HU-04 | Información mínima: cantidad y tipo de entrada | `hu04-publicar-evento` › "exige cantidad y tipo de entrada para publicar; el evento sigue en BORRADOR" |
| HU-04 | Comunicar la publicación a Catálogo, Entradas y Check-in | `hu04-publicar-evento` › "al publicar se deja un mensaje para Catálogo, Entradas, Check-in y Promociones (no Notificaciones)" |
| HU-04 | Visible en Catálogo al publicarse; el borrador no | `hu04-publicar-evento` › "al publicarse aparece en Catálogo (antes no era visible)" · `integraciones` › "detalle: BORRADOR no es visible" |
| HU-02 | Sólo edita eventos propios | `hu02-editar-evento` › "sólo el dueño (403), evento inexistente (404), id mal formado (400)" |
| HU-02 | Modificar datos, incluida fecha, hora de inicio y de término | `hu02-editar-evento` › "el dueño edita un BORRADOR…", "permite modificar fecha, hora de inicio y hora de término" |
| HU-02 | Validar la información modificada | `hu02-editar-evento` › "valida la información…", "reglas cruzadas sobre el evento como quedaría…", "un PUBLICADO no puede quedar sin un dato obligatorio para publicar" |
| HU-02 | Cambios guardados e informar éxito | `hu02-editar-evento` › "el dueño edita un BORRADOR, el cambio queda guardado y se informa con 200" |
| HU-02 | Sólo BORRADOR o PUBLICADO son editables | `hu02-editar-evento` › "FINALIZADO y CANCELADO → 409" |
| HU-02 | Publicado → comunicar a Catálogo, Entradas y Check-in | `hu02-editar-evento` › "un PUBLICADO editado se comunica a Catálogo y Entradas; Check-in sólo si…" |
| HU-02 | Reprogramación → comunicar a Notificaciones | `hu02-editar-evento` › "una reprogramación de un PUBLICADO también avisa a Notificaciones" |
| HU-02 | Política de autorización (401/403/503) | `hu02-editar-evento` › "sin sesión 401 · rol asistente 403 · Auth caído 503, y no se modifica nada" |
| HU-03 | Sólo elimina eventos propios | `hu03-eliminar-evento` › "sólo el dueño puede eliminar (evento de B siendo A → 403)" |
| HU-03 | Un Borrador se elimina físicamente | `hu03-eliminar-evento` › "un BORRADOR propio se elimina físicamente sin consultar a Entradas" |
| HU-03 | Publicado sin ventas → se elimina (consulta de stock a Entradas) | `hu03-eliminar-evento` › "un PUBLICADO sin entradas vendidas…", "un PUBLICADO que Entradas no conoce…" · `entradas.client` (7 tests) |
| HU-03 | Publicado con ventas → no se elimina, pasa a Cancelado | `hu03-eliminar-evento` › "un PUBLICADO con entradas vendidas no se elimina: pasa a CANCELADO…" |
| HU-03 | Entradas no disponible → no se elimina e informa | `hu03-eliminar-evento` › "si Entradas no está disponible…(503)" · `entradas.client` › "timeout dos veces → 503…" |
| HU-03 | Eliminado o cancelado no visible en el catálogo | `hu03-eliminar-evento` › "un evento cancelado deja de estar disponible en el catálogo público", "…sin entradas vendidas se elimina físicamente" |
| HU-03 | Política de autorización (401/403/404/400/503) | `hu03-eliminar-evento` › "política de autorización: sin sesión 401, otro rol 403, inexistente 404, id inválido 400, Auth caído 503" |
| HU-06 | Validar token/sesión contra Auth | `auth.client` (12 tests: reenvío de cookie, 401/403/500, timeout, reintento, fail-secure) · `require-organizer` › "passes the Auth identity…" |
| HU-06 | Rol distinto de organizador → denegar con mensaje | `require-organizer` › "403 FORBIDDEN_ROLE…" · `hu01` › "…403 si no es organizador" |
| HU-06 | Token inválido/expirado → login | `require-organizer` › "401 when Auth rejects the token" · UI: redirección a `/login?motivo=sesion` |
| HU-06 | Validación de propiedad | `hu05-mis-eventos` › "403 al pedir el evento de otro organizador" |
| HU-06 | Fail-secure si Auth no responde | `auth.client` › "fails secure with 503…" (×3) · `hu01` › "503 si Auth no está disponible y no crea nada" |
| HU-07 | Publicar y editar dejan el mensaje en el outbox | `hu04-publicar-evento` › "al publicar se deja un mensaje para Catálogo, Entradas, Check-in y Promociones (no Notificaciones)" · `hu02-editar-evento` › "un PUBLICADO editado se comunica a Catálogo y Entradas…", "una reprogramación de un PUBLICADO también avisa a Notificaciones" · `int02-mensajeria` (4 tests) |
| HU-07 | El relay lo envía a RabbitMQ y lo marca ENVIADO | `outbox-relay` › "publicar un evento por la API termina con todos sus mensajes ENVIADO", "start y stop: publica en segundo plano y se detiene limpio" |
| HU-07 | Con el broker caído queda PENDIENTE y se reintenta, sin bloquear al organizador | `outbox-relay` › "con el broker caído no toca los mensajes ni gasta intentos", "al llegar al máximo de intentos el mensaje queda FALLIDO y no bloquea a los siguientes", "la espera entre vueltas crece con los errores seguidos y tiene un tope" |
| HU-07 | El aviso de stock de Entradas marca el evento AGOTADO y avisa a Catálogo | `stock-consumer` › "stock = 0 → el evento queda AGOTADO sin cambiar estado_gestion, y Catálogo lo ve AGOTADO", "Panel comunica AGOTADO a Catálogo por panel.evento.catalogo.v1", "si Entradas informa stock > 0 después de agotarse, el evento vuelve a DISPONIBLE y se avisa a Catálogo" (15 tests) |
| HU-07 | Comunicar cancelación por broker a Catálogo, Entradas, Check-in, Notificaciones y Promociones | `hu03-eliminar-evento` › "la cancelación se comunica por broker…" |
| HU-07 | El cuerpo para Entradas lleva `{ envelope, payload }` (ADR-0017) | `outbox-relay` › "en los tópicos configurados el cuerpo lleva { envelope, payload }…" |
| INT-02 | Cambiar un tópico no requiere tocar código | `int02-mensajeria` › "cambiar un tópico no requiere tocar código" |
| INT-02 | Sobre versionado y manejo de fallos | `int02-mensajeria` › "cada mensaje lleva el sobre versionado…", "un fallo de publicación se reintenta una vez…" |
| INT-11 | Enviar `x-api-key` a Auth; 403 de Auth = error de configuración | `auth.client` › "sends x-api-key…", "does not send x-api-key…", "maps 403 (missing or wrong x-api-key) to AUTH_ERROR…" · `env` (4 tests) |

## Conteo por archivo (181 tests en 18 archivos)

| Archivo | Tests |
|---|---|
| `anunciar-eventos.test.ts` | 2 |
| `auth.client.test.ts` | 12 |
| `contrato-openapi.test.ts` | 21 |
| `cors.test.ts` | 3 |
| `database-schema.test.ts` | 10 |
| `entradas.client.test.ts` | 7 |
| `env.test.ts` | 4 |
| `gateway-prefix.test.ts` | 11 |
| `hu01-crear-evento.test.ts` | 12 |
| `hu02-editar-evento.test.ts` | 15 |
| `hu03-eliminar-evento.test.ts` | 12 |
| `hu04-publicar-evento.test.ts` | 9 |
| `hu05-mis-eventos.test.ts` | 7 |
| `int02-mensajeria.test.ts` | 4 |
| `integraciones.test.ts` | 21 |
| `outbox-relay.test.ts` | 11 |
| `require-organizer.test.ts` | 5 |
| `stock-consumer.test.ts` | 15 |
| **Total** | **181** |

Cobertura global del código backend: **82.26 %** en sentencias (ramas 92.45 %, funciones 95.65 %). El leve ajuste respecto del Sprint anterior se debe a la incorporación del consumidor de stock de Entradas (`stock.consumer.ts`, 43.96 % de sentencias en tests unitarios): las ramas no cubiertas corresponden a los ciclos de reconexión y consumo continuo en segundo plano contra un broker RabbitMQ real, los cuales se validan en la integración con la plataforma.

---

## Recorrido manual de las 7 Historias de Usuario (Frontend / Demo Avance 4)

| HU | Acción realizada en la UI | Resultado verificado en pantalla y datos |
|---|---|---|
| **HU-01** (Crear evento) | Login como Organizadora A, clic en «Nuevo evento», formulario completo con fecha futura y tipo de entrada. | ✅ **Exitoso:** El evento se crea en estado `BORRADOR` con su ID asignado y aparece de inmediato en la lista. |
| **HU-05** (Ver mis eventos) | Navegación a `/mis-eventos`. | ✅ **Exitoso:** Lista exclusivamente los eventos de Organizadora A, diferenciados visualmente por `BadgeEstado` de color según estado (`BORRADOR`, `PUBLICADO`, `FINALIZADO`, `CANCELADO`), con selector de detalle. |
| **HU-02** (Editar evento) | Clic en «Editar» en un borrador o publicado propio, cambio de nombre y horario. | ✅ **Exitoso:** Guarda los cambios con respuesta 200, muestra feedback visual y actualiza la tarjeta sin alterar el estado administrativo. |
| **HU-04** (Publicar evento) | Clic en «Publicar» en un evento `BORRADOR` con datos completos de entradas y término. | ✅ **Exitoso:** Abre modal de confirmación, pasa atómicamente a `PUBLICADO`, actualiza el badge y encola los mensajes salientes para los otros squads. |
| **HU-03** (Eliminar / Cancelar) | Petición de eliminación/cancelación según el estado del evento y existencia de ventas. | ✅ **Exitoso:** Un borrador se elimina físicamente; un publicado consulta a Entradas (`entradas.client`): sin ventas se elimina, con ventas pasa a `CANCELADO` de forma segura. |
| **HU-06** (Control de acceso y propiedad) | Intento de acceso a `/mis-eventos/:id` de otro organizador (Org B ingresando a evento de Org A) o navegación sin sesión. | ✅ **Exitoso:** Sin sesión redirige a `/login`; acceso a evento ajeno muestra mensaje `403 FORBIDDEN` con aviso amigable y botón de retorno sin filtrar información. |
| **HU-07** (Notificaciones y stock) | Publicación/reprogramación en el panel y recepción del aviso de stock desde Entradas. | ✅ **Exitoso:** Publicación y reprogramación registran mensajes en `mensajes_salientes`; al recibir stock = 0 (`entradas.evento.stock.v1`), el evento se marca `AGOTADO` y notifica a Catálogo. |
