# Sesión de integración completa — 17/11/2026

**Responsable:** Etienne Araya (Integración y Calidad) · **Fecha:** 17/11/2026, 23:40–00:10 (UTC-3)

Primera sesión con los servicios **reales** levantados juntos en la red Docker compartida `plataforma-eventos-net`:
API Gateway, RabbitMQ, Auth (con su seed QA), Entradas / Inventario y Panel Organizador. Antes de esta sesión, Entradas sólo se había probado con `tools/mock-entradas`, y Auth fuera de la red compartida (ver [`auth-real-2026-11-17.md`](auth-real-2026-11-17.md)).

## 1. Ambiente

| Componente | Repositorio / versión | Contenedor y dirección en la red |
|---|---|---|
| API Gateway | `FWizav/backendticketU` `bea2c1c` | `ticketu-api-gateway:8080` (host `:8080`) |
| RabbitMQ | el del stack de Auth, mismas credenciales y vhost de la plataforma (`ticketu`) | `ticketu-rabbitmq:5672`, exchange `ticketu.events` |
| Auth | `equipo-auth/arquitectura` `742b338` + Keycloak 26.8.1 + PostgreSQL 15 | `auth-service:10000` (alias de `ticketu-auth-service`) |
| Entradas / Inventario | `Microservicios-Entradas-Inventario/arquitectura_ms_entradas_inventario` `e289c43` | `entradas-service:3000` |
| Panel Organizador | `main` de este repo (`9eea5d0`, incluye el PR #35) | `organizador-service:3000`, con `docker-compose.integracion.yml` y `SEED_DEMO=true` |

- Los repositorios de los otros squads **no se modificaron** (`git status` limpio en los tres). Lo local se hizo con archivos *override* de Docker Compose fuera de los repositorios:
  - **Gateway:** su `.env` no viene en el repo. Se usó el de su `.env.example`, con `AUTH_SERVICE_URL=http://auth-service:10000` (el ejemplo dice `:3000`) y `CORS_ORIGINS=http://localhost:3000,http://localhost:5173`.
  - **Entradas:** `INTERNAL_API_KEY` con la clave de Auth de este ambiente, y su Mongo sin publicar el puerto `27017` en el host.
- **Clave compartida (`x-api-key`):** la misma `INTERNAL_API_KEY` de Auth en el Panel (`AUTH_INTERNAL_API_KEY`) y en Entradas. Se pasó como variable al levantar los contenedores; no quedó escrita en ningún archivo.

## 2. Resultados

| # | Prueba | Resultado |
|---|---|---|
| A | Auth dentro de la red compartida, entrando por el Gateway (10 casos) | ✅ 10/10 |
| B | I1 · los eventos del seed llegan a Entradas por el broker | ✅ 7/7 en `inventario_evento` |
| C | I2 + HU-03 · el Panel consulta el stock al Entradas real antes de eliminar | ✅ |
| D | Aviso de stock · Panel marca `AGOTADO` y avisa a Catálogo | ✅ del lado del Panel · ❌ Entradas no publica el aviso en la compra gratuita (H1) |
| E | Edición de un evento con ventas | ❌ Entradas reinicia el stock (H2), y por eso se borró un evento con ventas |

### A. Auth en la red compartida, vía Gateway

El navegador (aquí `curl`) sólo habla con el Gateway: login en `POST :8080/api/auth/login` y Panel en `:8080/api/organizador/v1/...`. El Panel valida cada sesión contra `http://auth-service:10000` dentro de la red.

```text
Gateway  (http://localhost:8080/health): ok
Panel -> Auth dentro de la red: AUTH_SERVICE_URL = http://auth-service:10000
Desde el contenedor del Panel, GET http://auth-service:10000/api/health: OK

 # Caso                                           Esperado             Obtenido             Resultado
 1 Organizador real entra al panel                200                  200                  OK
 2 Sin sesion                                     401                  401 SESSION_INVALID  OK
 3 jwt inventado                                  401                  401 SESSION_INVALID  OK
 4 Comprador (rol usuario) en el panel            403                  403 FORBIDDEN_ROLE   OK
4b Staff en el panel del organizador              403                  403 FORBIDDEN_ROLE   OK
4c Staff en GET compartido (Check-in)             200                  200                  OK
 8 Identidad: id_organizador = id_usuario de Auth 201, ids iguales     201                  OK   (e03fb2aa-8a3e-4d97-b46a-30553d424fcd en ambos)
 5 x-api-key incorrecta (Auth responde 403)       502 AUTH_ERROR       502 AUTH_ERROR       OK
 7 Sesion revocada por Auth                       401                  401 SESSION_INVALID  OK   (revoke-session por el Gateway: HTTP 200)
 6 Auth apagado (fail-secure)                     503 AUTH_UNAVAILABLE 503 AUTH_UNAVAILABLE OK   (2,01 s: timeout de 1 s + 1 reintento)

TODAS LAS PRUEBAS OK (10/10) - red plataforma-eventos-net via Gateway
```

El caso 5 usa una segunda instancia del Panel en la misma red con otra clave. El caso 6 confirma el timeout de 1 s más un reintento: dentro de Docker, el nombre `auth-service` resuelve pero nadie responde.

### B. I1 · eventos del Panel en Entradas

Con `SEED_DEMO=true`, el Panel carga los 7 eventos de demo y los anuncia por el outbox (PR #35). Log de Entradas:

```text
[RabbitMQ - Panel Organizador] Evento 'evento_publicado' procesado para evento '66f1a0000000000000000003'. Stock sincronizado a 120.
[RabbitMQ - Panel Organizador] Evento 'evento_creado' procesado para evento '66f1a0000000000000000004'. Stock sincronizado a 80.
[RabbitMQ - Panel Organizador] Evento 'evento_creado' procesado para evento '66f1a0000000000000000005'. Stock sincronizado a 200.
[RabbitMQ - Panel Organizador] Evento 'evento_creado' procesado para evento '66f1b0000000000000000001'. Stock sincronizado a 64.
[RabbitMQ - Panel Organizador] Evento 'evento_creado' procesado para evento '66f1b0000000000000000002'. Stock sincronizado a 50.
```

En `ticketu_entradas_db.inventario_evento` quedaron los 7 eventos, con el `stock_inicial` igual a `cantidad_entradas` y con el `tipo_entrada` y el `estado_gestion` del Panel (BORRADOR, PUBLICADO, FINALIZADO y CANCELADO):

| id_evento | estado_gestion | tipo_entrada | stock_inicial / stock_actual |
|---|---|---|---|
| 66f1a…01 | BORRADOR | PAGADA | 40 / 40 |
| 66f1a…02 | PUBLICADO | GRATUITA | 300 / 300 |
| 66f1a…03 | PUBLICADO | GRATUITA | 120 / 120 |
| 66f1a…04 | FINALIZADO | GRATUITA | 80 / 80 |
| 66f1a…05 | CANCELADO | PAGADA | 200 / 200 |
| 66f1b…01 | PUBLICADO | GRATUITA | 64 / 64 |
| 66f1b…02 | BORRADOR | PAGADA | 50 / 50 |

### C. I2 + HU-03 · consulta de stock antes de eliminar

organizador1 crea por el Gateway un evento de 50 entradas, lo publica y lo elimina sin ventas:

```text
creado: 6afd11dee6d13f9bc8633392 · publicar: HTTP 200
Entradas (por el broker): stock_inicial 50, stock_actual 50, PUBLICADO, id_usuario e03fb2aa-… (el de Auth)
DELETE /api/organizador/v1/panel/eventos/mios/6afd11dee6d13f9bc8633392 -> 200 {"resultado":"ELIMINADO"}

Log de Entradas:
INFO: 172.19.0.8:56498 - "GET /api/v1/entradas/eventos/6afd11dee6d13f9bc8633392/stock HTTP/1.1" 200 OK
[RabbitMQ - Panel Organizador] Evento 'evento_eliminado' procesado para evento '6afd11dee6d13f9bc8633392'. Stock sincronizado a 100.
```

`172.19.0.8` es el contenedor del Panel en `plataforma-eventos-net`. La última línea es el hallazgo H3.

### D. Aviso de stock (contrato Entradas §3.4, ADR-0018)

1. organizador1 crea y publica un evento GRATUITO de 2 entradas, y comprador1 compra las 2 por el Gateway (`POST :8080/api/entradas/procesar-compra` → `{"nuevo_stock":0}`).
2. Entradas queda con `stock_actual: 0`, pero publica `stock.agotado` y **no** `entradas.evento.stock.v1`:
   ```text
   [RabbitMQ] Evento publicado: 'entrada.emitida' (ID: 71ec6aa6-…)
   [RabbitMQ] Evento publicado: 'stock.agotado' (ID: eaaec8d4-…)
   ```
   El Panel no recibe nada y el evento sigue sin `AGOTADO` (hallazgo H1).
3. Para verificar el lado del Panel, se publicó el aviso **con el propio código de Entradas** (`BrokerService.publish_event('entradas.evento.stock.v1', {'id_evento': …, 'stock': 0})`, que es lo que hace su compra pagada), dentro de su contenedor:
   ```text
   [stock] 6afd1214e6d13f9bc863339d stock=0 → ACTUALIZADO
   [outbox] panel.evento.catalogo.v1 → evento_actualizado 6afd1214e6d13f9bc863339d
   ```
   En la BD del Panel el evento queda con `estado_gestion: PUBLICADO` y `estado_disponibilidad: AGOTADO`. El mensaje a Catálogo queda `ENVIADO` con `estado_disponibilidad: "AGOTADO"`, y la consulta pública por el Gateway (`GET :8080/api/organizador/v1/organizador/eventos/6afd1214…`) responde `"estado_disponibilidad":"AGOTADO"`.

### E. Edición de un evento con ventas

```text
1) comprador1 compra 3 de 10 entradas      -> Entradas: stock_inicial=10 stock_actual=7  compradas=3
2) el organizador edita sólo la descripción -> Entradas: stock_inicial=10 stock_actual=10 compradas=3
3) el organizador elimina el evento         -> Panel: {"resultado":"ELIMINADO"}
```

Al recibir `evento_actualizado`, Entradas devolvió `stock_actual` al total aunque `cantidad_entrada_comprada` sigue en 3 (hallazgo H2). El Panel aplica la regla del contrato (§3.4: `stock = cantidad_entradas` ⇒ sin ventas ⇒ eliminación física), así que **borró un evento con 3 entradas vendidas en vez de cancelarlo**. Su endpoint de stock sólo entrega `{ id_evento, stock }`, de modo que el Panel no tiene otro dato para detectarlo.

## 3. Hallazgos para Entradas

| # | Hallazgo | Impacto | Corrección sugerida |
|---|---|---|---|
| H1 | La compra **gratuita** que agota el evento publica `stock.agotado`, pero no `entradas.evento.stock.v1` (sólo la compra pagada lo hace, `routers/entradas.py`) | Catálogo nunca muestra AGOTADO para eventos gratuitos | Publicar también `entradas.evento.stock.v1` en la rama GRATUITA |
| H2 | `evento_actualizado` reinicia `stock_actual` a `cantidad_entradas` | Se pierden las ventas, y el Panel elimina eventos que sí vendieron | Recalcular `stock_actual = cantidad_entradas − compradas − reservadas` |
| H3 | `evento_eliminado` se procesa como alta: el evento queda `PUBLICADO` con 100 entradas | Un evento borrado sigue a la venta en Entradas | Distinguir `envelope.tipo` (ADR-0017 §3) |
| H4 | Un evento GRATUITO queda con `precio_unitario: 10000` | Dato incorrecto en el inventario | Precio 0 o `null` si `tipo_entrada` es GRATUITA |
| H5 | `INTERNAL_API_KEY: "CAMBIAR_CLAVE_COMPARTIDA_SEGURA"` va fija en su `docker-compose.yml` | La clave de ejemplo queda en el repo, y no se puede cambiar sin editar el compose | Leerla de `.env` (`${INTERNAL_API_KEY}`) |
| H6 | Su seed carga el `id_evento` `66f1a…02` con otros datos (`id_usuario: usr-org-panel`). Al sincronizar, actualiza el stock pero conserva ese `id_usuario` | La copia de Entradas no coincide con el Panel | Que el mensaje del Panel reemplace también `id_usuario` |

## 4. Para la plataforma y Auth

- **Gateway:** su `.env.example` trae `AUTH_SERVICE_URL=http://auth-service:3000`, pero Auth escucha en el `10000`. También conviene agregar `http://localhost:5173` a `CORS_ORIGINS`.
- **Clave del ambiente de integración:** acordar con Auth una `INTERNAL_API_KEY` común, que se entregue fuera del repositorio. Entradas hoy usa la de ejemplo (H5).

## 5. Cómo repetir la sesión

Los archivos *override* y los scripts quedan en la máquina del responsable de integración, fuera de los repositorios. Los pasos:

1. Red `plataforma-eventos-net`, y Auth + RabbitMQ levantados según la guía Docker de Auth (seed QA incluido).
2. Gateway: `docker compose -f api-gateway/docker-compose.yml -f gateway.override.yml up -d --build` (el override reemplaza `env_file` por las variables de la sección 1).
3. Entradas: `docker compose -f docker-compose.yml -f entradas.override.yml up -d --build`, con la clave de Auth en la variable `AUTH_KEY`.
4. Panel: `docker compose --env-file <archivo con SEED_DEMO=true> -f docker-compose.integracion.yml up -d --build`, con `AUTH_INTERNAL_API_KEY` en el entorno.
5. Pruebas de Auth por el Gateway: script `probar-auth-red.ps1` (10 casos). Las pruebas C, D y E se hacen con `curl` contra `:8080`, como se muestra arriba.

## 6. Capturas

Las capturas de esta sesión están en [`capturas/README.md`](capturas/README.md), sección 4: servicios levantados, login real y respuestas del Panel por el Gateway, los 10 casos de Auth, el jwt idéntico, el inventario de Entradas, la consulta de stock al eliminar, AGOTADO en la consulta pública y las colas de RabbitMQ.
