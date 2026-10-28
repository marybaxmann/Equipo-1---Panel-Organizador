# ADR-0015 — MongoDB 7 en Docker (CI y compose) por incompatibilidad de MongoDB 8 con kernel 6.19+

- **Estado:** Propuesta · implementado (PR #24, 27/10)
- **Fecha:** 2026-10-28
- **Responsables:** QA y BD (Christopher) · Backend (Joaquín)
- **Reemplaza en parte a:** ADR-0002 y ADR-0010, en lo que dicen de la versión 8 de MongoDB
- **Afecta a:** CI (`.github/workflows/ci.yml`), `docker-compose.yml`, `docker-compose.integracion.yml` y el entorno local de cada integrante

---

## 1. Contexto

Desde el 27/10, el job `integration` del CI fallaba de forma intermitente (issue #19). Algunos runners de GitHub ya tienen kernel Linux 6.19 o superior, y en ellos MongoDB 8 se niega a arrancar:

```
MongoDB cannot start: Linux kernel versions 6.19 and newer has a known incompatibility with this version of MongoDB.
See https://jira.mongodb.org/browse/SERVER-121912
```

La causa es la incompatibilidad entre las *restartable sequences* (rseq) del kernel y el TCMalloc que trae MongoDB 8.

| Intento | Resultado |
|---|---|
| `GLIBC_TUNABLES=glibc.pthread.rseq=0` (PR #20 y #21) | Evita que Mongo se caiga después de arrancar, pero Mongo revisa el kernel **antes** de arrancar y se niega igual |
| Healthcheck en el servicio del CI (PR #20) | Se mantiene: el fallo aparece al inicio y con el motivo claro |
| **Imagen `mongo:7`** (PR #24) | MongoDB 7 no trae esa verificación: el CI pasó en 3 ejecuciones seguidas |

## 2. Decisión

- El CI y los dos `docker-compose` usan **`mongo:7`**. Se quita `GLIBC_TUNABLES`.
- El código no cambia. Mongoose 9 y el driver `mongodb` 7 soportan MongoDB 7, y los validadores `$jsonSchema` y los índices son los mismos (ADR-0002).
- Los tests de Vitest no cambian: usan `mongodb-memory-server`, que trae su propio binario.

## 3. Consecuencias

- **Hay que reiniciar la base local una vez.** Un volumen creado con MongoDB 8 no abre con MongoDB 7 (*"Wrong mongod version: UPGRADE PROBLEM: Found an invalid featureCompatibilityVersion document"*). Después del `git pull`:
  ```bash
  docker compose down -v
  npm run infra:up && npm run db:init && npm run db:seed
  ```
  Se pierden los datos locales; el seed vuelve a cargar los eventos de demo.
- Antes de una demo, hacerlo con tiempo en el computador donde se presenta.
- El stack del proyecto queda como **MongoDB 7** en el README, el ADR-0010 y los planes.

## 4. Cómo se revierte

Cuando MongoDB publique una versión 8.x compatible con kernel 6.19+ (o los runners de GitHub pasen a kernel 7.0.14 o superior, que corrige el problema), se puede volver a `mongo:8`. Ese cambio es una actualización: MongoDB 8 abre un volumen creado con MongoDB 7 sin borrarlo, y después se sube el `featureCompatibilityVersion`. Lo que no funciona es al revés (de 8 a 7), que es lo que obliga al reinicio de este ADR.
