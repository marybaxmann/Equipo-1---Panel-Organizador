# Pruebas de integración con los servicios reales

Scripts para repetir, en cualquier PC con Windows, las pruebas de integración del Panel con Auth, Entradas y Notificaciones, dentro de la red compartida `plataforma-eventos-net`. Son los que generaron las evidencias de [`docs/evidencias/pruebas-integracion/`](../../docs/evidencias/pruebas-integracion/README.md).

Las pruebas contra los mocks (Postman/Newman, `npm test`) no necesitan nada de esto: se corren como dice el README principal.

## Requisitos

- Docker Desktop corriendo, Node 26 y `curl.exe` (viene con Windows 10 y 11).
- Los repos de los otros squads clonados **junto al del Panel**, con estos nombres de carpeta. Si los tienes en otra parte, pasa la ruta con `-RepoAuth`, `-RepoGateway` o `-RepoEntradas`.

  | Carpeta | Repo |
  |---|---|
  | `auth-arquitectura` | Auth (`equipo-auth/arquitectura`) |
  | `backendticketU` | API Gateway y broker de la plataforma |
  | `entradas-inventario` | Entradas / Inventario |

- Auth preparado una vez según su README: `backend/.env`, las llaves `*.pem`, `prisma-init` y los usuarios QA (`organizador1`, `staff1` y `comprador1@ticketu.test`).

Los repos de los otros squads **no se modifican**. Auth, Entradas y el Panel se levantan con sus propios compose. Solo el Gateway necesita `gateway.override.yml`, porque su `.env` no viene en el repo y su `.env.example` apunta Auth al puerto 3000 en vez del 10000.

Los usuarios QA usan la contraseña de `QA_SEED_PASSWORD`, la misma con que se crearon en Auth. Sin esa variable, los scripts que hacen login se detienen con el mensaje «Define QA_SEED_PASSWORD».

## Secretos

La clave compartida con Auth (`INTERNAL_API_KEY`) y la de operaciones (`AUTH_OPERATIONS_KEY`) se leen del `backend/.env` de Auth, o de variables de entorno con esos mismos nombres. Se pasan a los contenedores por variable de entorno: no se escriben en archivos ni se imprimen. Del jwt sólo se muestra el inicio, el final y su huella SHA-256.

## Uso

Desde la raíz del repo del Panel:

```powershell
# 1. Levantar todo en orden: Auth, Gateway, Entradas y Panel
powershell -ExecutionPolicy Bypass -File tools\pruebas-integracion\levantar-ambiente.ps1

# 2. Las pruebas
powershell -ExecutionPolicy Bypass -File tools\pruebas-integracion\probar-auth.ps1 -Red
powershell -ExecutionPolicy Bypass -File tools\pruebas-integracion\probar-notificaciones.ps1
```

Cada script termina con una tabla y sale con código 0 si todo pasó.

| Script | Qué prueba | Resultado esperado |
|---|---|---|
| `levantar-ambiente.ps1` | Levanta Auth (postgres, rabbitmq, keycloak, auth-service), el Gateway, Entradas y el Panel en `plataforma-eventos-net`. Si el Mongo de desarrollo del Panel ocupa el 27017 que necesita Entradas, lo detiene. Con `-SinSeed` no toca los eventos del Panel; sin esa opción, arranca con `SEED_DEMO=true`, que **borra los eventos** y carga el seed | "Ambiente listo" |
| `probar-auth.ps1 -Red` | Contrato Auth v1.1 por el Gateway: login real, 401 sin sesión o con jwt inventado, 403 por rol, identidad, x-api-key incorrecta (502), sesión revocada (401) y Auth apagado (503) | 10/10 |
| `probar-auth.ps1` | Lo mismo, con Auth en `localhost:10000` y el Panel en `localhost:3000` (`npm run dev:api` con `AUTH_SERVICE_URL=http://localhost:10000` y la misma clave) | 10/10 |
| `probar-jwt.ps1` | Que el Panel reenvía a Auth el mismo jwt que Auth emitió, sin `Authorization`, y con la `x-api-key`. Usa el proxy espía `espiar-jwt.mjs` | "jwt IDENTICO" |
| `probar-notificaciones.ps1` | Los pasos acordados con Notificaciones: reprogramar y eliminar con ventas un evento publicado. Una cola temporal ligada sólo al exchange `panel.evento.notificaciones.v1` debe recibir `evento_reprogramado` y `evento_actualizado`, y nada al crear ni al publicar | 9/9 |

**Cuidado:** `probar-auth.ps1` apaga y vuelve a encender el contenedor de Auth (prueba 6) y revoca la sesión de `organizador1` (prueba 7). Los jwt anteriores de ese usuario dejan de servir.

## Archivos de apoyo

| Archivo | Para qué |
|---|---|
| `comun.ps1` | Funciones compartidas: login, llamadas HTTP, tabla de resultados |
| `gateway.override.yml` | Configura el Gateway para la red compartida: Auth en `auth-service:10000` y CORS para `:3000` y `:5173` |
| `panel-integracion.env` | `SEED_DEMO=true` para `docker-compose.integracion.yml` |

Los `.ps1` están en ASCII a propósito: Windows PowerShell 5.1 lee como ANSI los archivos sin BOM.
