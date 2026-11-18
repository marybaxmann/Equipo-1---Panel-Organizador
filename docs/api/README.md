# API por sprint — qué se muestra en cada avance

El Swagger (`http://localhost:3000/api-docs`) agrupa los endpoints en el orden de los sprints. Este documento es el guion: qué endpoints son de cada avance, en qué orden mostrarlos y qué se tiene que ver. La especificación completa está en [`openapi.yaml`](openapi.yaml).

## Antes de la demo

```bash
npm run infra:up && npm run db:init && npm run db:seed
npm run dev:api      # otra terminal
npm run dev:web      # otra terminal
```

Abrir 3 pestañas: el front (`localhost:5173/login`), el Swagger (`localhost:3000/api-docs`) y MongoDB Compass (`mongodb://localhost:27017/panel_organizador`).

Los endpoints del organizador piden la cookie `jwt`. Al iniciar sesión en el front, el navegador la guarda y el "Try it out" del Swagger la envía sola. Usuarios: `token-org-a` y `token-org-b` (organizadores), `token-staff`, `token-asistente` (sin permiso) y `token-lento` (Auth tarda 3 s → 503).

## Resumen

| Sprint | Historia | Endpoint | Grupo en el Swagger |
| --- | --- | --- | --- |
| 1 | HU-01 Crear | `POST /api/v1/panel/eventos` | Sprint 1 · HU-01, HU-05, HU-06 |
| 1 | HU-05 Ver mis eventos | `GET /api/v1/panel/eventos/mios` y `/mios/{id}` | Sprint 1 · HU-01, HU-05, HU-06 |
| 1 | HU-06 Autorización | todos los anteriores (401, 403, 503) | Sprint 1 · HU-01, HU-05, HU-06 |
| 1 | HU-04 Publicar (adelantada) | `POST /api/v1/panel/eventos/mios/{id}/publicar` | Sprint 1 · HU-04 |
| 1 | Integración | 6 GET/POST para Catálogo, Entradas, Check-in, Notificaciones y Promociones | Sprint 1 · Integración — … |
| 2 | HU-02 Editar | `PATCH /api/v1/panel/eventos/mios/{id}` | Sprint 2 · HU-02 |
| 2 | INT-02 Mensajes salientes | sin endpoint: colección `mensajes_salientes` | Sprint 2 · HU-02 (descripción) |
| 3 | HU-07 Notificar | sin endpoint: entrega del outbox al broker | — |
| 4 | HU-03 Eliminar | `DELETE /api/v1/panel/eventos/mios/{id}` | Sprint 4 · HU-03 — Eliminar un evento |

## Sprint 1 — Crear, ver y publicar

**Qué se muestra:** un organizador crea un evento, lo ve en su lista y lo publica. Desde ese momento, los demás squads pueden verlo.

1. **HU-01** · En el front, entrar como Org A y crear un evento. Queda con la insignia Borrador. En Compass aparece en `eventos` con `estado_gestion: BORRADOR` y con una fila `null → BORRADOR` en `cambios_estado_evento`.
2. **HU-05** · Mis eventos lo lista, y el filtro por estado lo cuenta. Al abrir el detalle, el id queda en la URL (`/mis-eventos/<id>`).
3. **HU-06** · En el Swagger, `GET /mios`:
   - sin sesión → 401 `SESSION_INVALID`
   - con `token-asistente` → 403 `FORBIDDEN_ROLE`
   - con `token-lento` → 503 (fail-secure)

   Si Org B pide el detalle del evento de A, recibe 403 `EVENT_NOT_OWNED`.
4. **Borrador oculto** · `GET /organizador/eventos/{id}` (Catálogo) con ese id → 404.
5. **HU-04** · Publicar desde la tarjeta. Repetir el GET de Catálogo → 200. En Compass, `PUBLICADO` y una segunda fila en el historial. `GET /panel/eventos/{id}/cambios-estado` devuelve las 2 transiciones.
6. **Integración** · Mostrar un GET por squad:
   - Catálogo: `/proximos`
   - Entradas y Check-in: `/panel/eventos/{id}` con `token-staff`
   - Promociones: `/eventos-disponibles`
   - Notificaciones: `/cambios-estado`

**Si preguntan:** publicar a otro estado que no sea BORRADOR da 409 `INVALID_STATE_TRANSITION`. Si faltan datos, da 400 con un detalle por campo.

## Sprint 2 — Editar y dejar los mensajes listos

**Qué se muestra:** el organizador edita un evento. Si el evento ya está publicado, el panel deja escrito el aviso para cada squad que debe enterarse.

1. **HU-02 en BORRADOR** · En el Swagger, `PATCH /mios/{id}` sobre un borrador con `{ "hora_evento": "11:00" }` → 200. El estado no cambia, así que no hay fila nueva en `cambios_estado_evento`.
2. **INT-02** · En Compass, `mensajes_salientes` tiene un mensaje para Entradas (`evento_creado` y `evento_actualizado`). Catálogo no recibe nada mientras sea borrador.
3. **Publicar y editar** · Publicar el evento: aparecen 5 mensajes, uno por squad. Luego, `PATCH` con una fecha nueva → 200. Aparecen mensajes para Entradas, Catálogo y Check-in, y un `evento_reprogramado` para Notificaciones.
4. **Reglas** · Probar estos casos:
   - Org B edita el evento de A → 403 `EVENT_NOT_OWNED`
   - Editar un evento FINALIZADO del seed → 409 `EVENT_NOT_EDITABLE`
   - Cuerpo vacío, o con `estado_gestion` → 400
   - `hora_fin_evento: null` en un publicado → 400
5. **Brechas cerradas** · Probar estos casos:
   - `GET /panel/eventos/abc` con `token-staff` → 400 `INVALID_EVENT_ID`
   - Una ruta que no existe → 404 en JSON
   - Publicar sin `cantidad_entradas` o sin `tipo_entrada` → 400

**Si preguntan:**
- **¿Ya envían al broker?** Sí. El broker es el RabbitMQ compartido de la plataforma TicketU (exchange `ticketu.events`, ADR-0013) y el publicador ya está implementado. Cada cambio queda primero en el outbox (`mensajes_salientes`, ADR-0003) y un proceso lo envía a RabbitMQ; si el broker no está disponible, el mensaje queda `PENDIENTE` y se reintenta, así que nada se pierde ni bloquea al organizador. Falta la prueba contra el RabbitMQ real de la plataforma (HU-07, Sprint 3).
- **¿Se puede cambiar el nombre de un tópico?** Sí. Los tópicos se leen de `.env` (`TOPIC_*`), así que cambiarlos no requiere tocar código.

## Sprint 3 — Enviar al broker

- **HU-07** · Un proceso toma los mensajes `PENDIENTE` de `mensajes_salientes`, los envía al RabbitMQ de la plataforma y los marca como `ENVIADO`. Si falla, suma un intento (ADR-0013).

## Sprint 4 — Eliminar, cancelar y conectar con los servicios reales

**Antes:** levantar el Entradas simulado (`docker compose up -d` lo incluye en el puerto 4002) y poner `ENTRADAS_SERVICE_URL=http://localhost:4002` en `.env`. Stock simulado: Feria 300 de 300 (sin ventas), Charla de Ciberseguridad 95 de 120 (con ventas), Torneo 64 de 64.

1. **HU-03, BORRADOR** · `DELETE /mios/66f1a0000000000000000001` con Org A → 200 `ELIMINADO`. Ya no está en `eventos`. En `mensajes_salientes` queda un `evento_eliminado` para Entradas.
2. **HU-03, PUBLICADO sin ventas** · `DELETE /mios/66f1a0000000000000000002` (Feria) → 200 `ELIMINADO`. Deja de aparecer en `GET /organizador/eventos/proximos`.
3. **HU-03, PUBLICADO con ventas** · `DELETE /mios/66f1a0000000000000000003` (Charla) → 200 `CANCELADO` con el evento. En `cambios_estado_evento` queda `PUBLICADO → CANCELADO`.
4. **HU-07** · Mostrar los mensajes de la Charla: `evento_cancelado` a Catálogo, Entradas, Check-in y Promociones, y `evento_actualizado` con `nuevo_estado: CANCELADO` a Notificaciones. Con el broker levantado pasan a `ENVIADO`.
5. **Entradas caído** · Detener el mock (`docker compose stop mock-entradas`) y eliminar el Torneo con Org B → 503 `ENTRADAS_UNAVAILABLE`. El evento sigue PUBLICADO.
6. **No se puede eliminar** · un FINALIZADO o CANCELADO → 409; el evento de otro organizador → 403.
7. **INT-11** · Con `AUTH_INTERNAL_API_KEY` en `.env`, el Panel envía `x-api-key` a Auth. Si la clave no coincide, Auth responde 403 y el Panel responde 502 `AUTH_ERROR` (error de configuración, no del usuario).

**Si preguntan:**
- **¿Por qué no se borra siempre?** Si hay entradas vendidas, borrar dejaría a los compradores sin evento. Por eso pasa a CANCELADO y Notificaciones avisa a los compradores.
- **¿Qué pasa si Entradas no responde?** No se puede confirmar que no haya ventas, así que no se toca el evento (fail-secure, igual que con Auth).

## Pruebas que respaldan cada sprint

| Sprint | Tests automáticos (`npm test`) | Postman (`npm run test:integration`) |
| --- | --- | --- |
| 1 | `hu01-`, `hu04-`, `hu05-`, `require-organizer`, `auth.client`, `integraciones` | Carpetas 01 a 07 |
| 2 | `hu02-editar-evento`, `int02-mensajeria`, y los casos nuevos en `hu04-` | Carpeta 08 Sprint 2 (7 casos) |
| 3 | `outbox-relay`, `gateway-prefix` | Evidencias de broker en `docs/evidencias/` |
| 4 | `hu03-eliminar-evento`, `entradas.client`, y los casos de `x-api-key` en `auth.client` | Pendiente: carpeta HU-03 |

En cada sprint, `contrato-openapi.test.ts` comprueba que las respuestas reales cumplen este Swagger.
