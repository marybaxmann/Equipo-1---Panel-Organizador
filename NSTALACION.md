# Instalación y revisión — Panel Organizador (TicketU)

**Evaluación:** 3  
**Módulo:** Panel Organizador  
**Fecha:** 18/11/2026

## 1. Objetivo

Este documento describe los requisitos, componentes, configuración y procedimientos para instalar y revisar el módulo Panel Organizador de TicketU.

El módulo permite a un usuario con rol `organizador` gestionar sus eventos e interactuar con los servicios de autenticación, inventario de entradas y mensajería.

La declaración de integraciones evaluables se encuentra en `INTEGRACIONES.md`.

## 2. Requisitos

- Git.
- Node.js 26.x y npm.
- Docker con Docker Compose.
- Acceso a los servicios de plataforma TicketU: Auth, API Gateway, RabbitMQ y Entradas / Inventario.
- Puertos disponibles para los servicios indicados en este documento.

El repositorio incluye el código del backend, frontend y scripts de MongoDB.

## 3. Estructura del proyecto

| Ruta | Contenido |
|---|---|
| `backend/` | API REST de Panel Organizador |
| `frontend/` | Aplicación React/Vite |
| `database/schema/` | Esquemas y validadores de MongoDB |
| `database/scripts/` | Creación de colecciones y datos de demostración |
| `docs/api/openapi.yaml` | Especificación OpenAPI |
| `docs/` | Contratos y documentación técnica |
| `postman/` | Colección de pruebas HTTP |
| `docker-compose.integracion.yml` | Despliegue Docker con servicios reales |
| `INTEGRACIONES.md` | Declaración de las tres integraciones evaluables |

## 4. Componentes y direcciones

| Componente | Dirección o puerto |
|---|---|
| Frontend Panel | `http://localhost:5173` |
| Backend Panel (interno Docker) | `http://organizador-service:3000` |
| Swagger del backend | `/api-docs` |
| API Gateway (host) | `http://localhost:8080` |
| API Gateway (Docker) | `http://ticketu-api-gateway:8080` |
| Auth (Docker) | `http://auth-service:10000` |
| Entradas / Inventario (Docker) | `http://entradas-service:3000` |
| RabbitMQ (Docker) | `ticketu-rabbitmq:5672` |
| RabbitMQ Management | `http://localhost:15672`, si está publicado en el host |
| MongoDB Panel | `organizador-mongo:27017`, red interna |
| Red compartida | `plataforma-eventos-net` |

Las direcciones internas corresponden al entorno de integración utilizado el 17/11/2026. Deben verificarse con la configuración vigente de workstation.

## 5. Instalación del repositorio

Clonar la rama oficial de entrega:

```bash
git clone https://github.com/marybaxmann/Equipo-1---Panel-Organizador.git
cd Equipo-1---Panel-Organizador
```

Seleccionar la rama entregada:

```bash
git checkout main
```

Instalar las dependencias Node.js desde la raíz:

```bash
npm ci
```

**Pendiente de confirmación:** nombre definitivo de la rama que evaluará el ayudante.

## 6. Infraestructura de TicketU

Panel Organizador requiere los servicios reales de Auth, API Gateway, RabbitMQ y Entradas / Inventario para demostrar sus integraciones.

Estos componentes deben estar conectados a la red compartida:

```bash
docker network create plataforma-eventos-net
```

Si la red ya existe, no es necesario crearla nuevamente.

Antes de iniciar Panel, verificar que los demás servicios estén levantados y accesibles.

**Dependencias externas:**

- Auth: repositorio `equipo-auth/arquitectura`.
- API Gateway: repositorio `FWizav/backendticketU`.
- Entradas: repositorio `Microservicios-Entradas-Inventario/arquitectura_ms_entradas_inventario`.
- RabbitMQ: servicio de mensajería de la plataforma TicketU.

Los comandos exactos de instalación de estas dependencias deben corresponder a los archivos de la plataforma disponibles en workstation.

**Pendiente:** incorporar o referenciar los comandos definitivos de inicio de los servicios externos, sin depender de archivos locales no versionados.

## 7. Configuración de Panel Organizador

El backend utiliza variables de entorno para comunicarse con los servicios externos.

Crear un archivo `.env` privado en la raíz del repositorio, utilizando `.env.example` como referencia.

Las variables principales del entorno Docker son:

```dotenv
AUTH_SERVICE_URL=http://auth-service:10000
AUTH_INTERNAL_API_KEY=<CLAVE_PRIVADA_DEL_ENTORNO>
AUTH_TIMEOUT_MS=1000
AUTH_REINTENTOS=0

ENTRADAS_SERVICE_URL=http://entradas-service:3000
ENTRADAS_TIMEOUT_MS=1000

EVENT_EXCHANGE=ticketu.events
TOPIC_ENTRADAS=panel.evento.entradas.v1
BROKER_TOPICOS_CON_SOBRE=panel.evento.entradas.v1
TOPIC_STOCK_ENTRADAS=entradas.evento.stock.v1
BROKER_COLA_STOCK=panel-organizador.entradas.stock

SEED_DEMO=true
```

La variable `BROKER_URL` debe tener la dirección AMQP, usuario, contraseña y virtual host definidos por la plataforma TicketU en workstation.

La variable `AUTH_INTERNAL_API_KEY` debe coincidir con la clave privada configurada en Auth.

**Seguridad:** no publicar credenciales, claves internas ni JWT en GitHub.

El archivo `docker-compose.integracion.yml` configura internamente el puerto del backend y la conexión a MongoDB.

## 8. Iniciar Panel Organizador

Con los servicios externos y la red compartida disponibles, ejecutar desde la raíz:

```bash
docker compose -f docker-compose.integracion.yml up --build -d
```

Este archivo despliega:

- `organizador-service`: backend de Panel.
- `organizador-mongo`: base de datos MongoDB privada del módulo.

Verificar los contenedores:

```bash
docker compose -f docker-compose.integracion.yml ps
```

Verificar los registros del backend:

```bash
docker compose -f docker-compose.integracion.yml logs organizador-service
```

El backend tiene un healthcheck configurado sobre:

`http://127.0.0.1:3000/health`

dentro de su contenedor.

También puede verificarse desde la red compartida mediante:

```bash
docker run --rm --network plataforma-eventos-net curlimages/curl -s http://organizador-service:3000/health
```

## 9. Inicialización de la base de datos

Panel utiliza MongoDB 7.

El contenedor del backend ejecuta automáticamente el script `database/scripts/create-collections.mjs` antes de iniciar la aplicación.

Ese script crea o actualiza las colecciones, validadores e índices correspondientes.

Cuando se configura:

```dotenv
SEED_DEMO=true
```

el proceso de inicio también ejecuta `database/scripts/seed-demo.mjs` y el anuncio de los eventos de demostración.

**Advertencia:** el seed de demostración puede reemplazar datos existentes. Se debe utilizar exclusivamente en el ambiente de pruebas.

Para una instalación local sin el Docker Compose de integración, el repositorio también incluye:

```bash
npm run db:init
npm run db:seed
```

Estos comandos requieren que MongoDB esté disponible y configurado correctamente en el entorno local.

## 10. Iniciar frontend

Desde la raíz del repositorio, con las dependencias instaladas:

```bash
npm run dev:web
```

La aplicación Vite utiliza el puerto `5173`.

**Configuración requerida:** el frontend debe comunicarse con la API real de Panel y utilizar el login de Auth, no el login simulado.

Las variables disponibles en `frontend/.env.example` son:

```dotenv
VITE_API_BASE_URL=/api/v1/panel
VITE_AUTH_LOGIN_URL=/login
```

**Pendiente de confirmación:** valores finales de estas variables y configuración del proxy Vite para el entorno workstation.

El archivo `frontend/vite.config.js` actualmente configura un proxy `/api` hacia `http://localhost:3000`. Esta dirección debe verificarse porque el backend del despliegue Docker de integración no publica necesariamente ese puerto en el host.

## 11. Usuarios de prueba

Las cuentas de prueba son creadas y publicadas por el equipo Auth.

En las pruebas de integración del 17/11 se utilizaron:

| Usuario QA | Rol | Uso |
|---|---|---|
| `organizador1@ticketu.test` | `organizador` | Gestión de eventos |
| `staff1@ticketu.test` | `staff` | Consulta compartida con Check-in |
| `comprador1@ticketu.test` | `usuario` | Verificación de rechazo por rol |

La disponibilidad de estas cuentas en workstation depende del seed de Auth y debe ser confirmada por ese equipo.

No se incluyen contraseñas en el repositorio. Deben utilizarse las credenciales de evaluación distribuidas por Auth mediante el procedimiento autorizado.

## 12. Flujo principal del módulo

El flujo que debe revisarse es:

1. Iniciar sesión con un organizador de prueba de Auth.
2. Acceder al Panel Organizador.
3. Consultar los eventos del organizador.
4. Crear un nuevo evento.
5. Editar su información.
6. Publicar el evento.
7. Verificar la sincronización con Entradas / Inventario.
8. Consultar el evento a través del API Gateway.
9. Solicitar la eliminación del evento y observar la consulta de stock.
10. Comprobar la respuesta y el estado final del evento.

El sistema debe aplicar las reglas de autorización y propiedad del evento.

## 13. Integraciones evaluables

Las tres integraciones declaradas son:

| ID | Tipo | Contraparte | Evidencia |
|---|---|---|---|
| I1 | C — Broker | Entradas / Inventario | Publicación RabbitMQ y recepción en inventario |
| I2 | B — Servicio ofrecido | Entradas / Inventario | GET de Panel mediante Gateway |
| I3 | A — Servicio consumido | Entradas / Inventario | GET de stock desde Panel hacia Entradas |

El procedimiento de revisión de cada integración se describe en `INTEGRACIONES.md`.

## 14. Evidencias y pruebas

El repositorio dispone de evidencias de integración real realizadas el 17/11/2026.

Documentación principal:

- `docs/evidencias/pruebas-integracion/sesion-integracion-2026-11-17.md`
- `docs/evidencias/pruebas-integracion/auth-real-2026-11-17.md`
- `docs/evidencias/pruebas-integracion/capturas/README.md`

Las capturas muestran el login con Auth real, solicitudes por el Gateway, recepción de eventos en Entradas, RabbitMQ y consulta de stock.

Para ejecutar las pruebas automatizadas del backend:

```bash
npm test
```

Las evidencias históricas no sustituyen la verificación de las integraciones en la workstation de evaluación.

## 15. Consideraciones para la evaluación

La revisión debe realizarse con servicios reales y la rama oficial de entrega.

El repositorio incluye mocks para desarrollo local, pero las integraciones declaradas para la Evaluación 3 no deben demostrarse utilizando esos servicios simulados.

La sesión del 17/11 detectó inconsistencias en la sincronización de stock y el tratamiento de eventos eliminados del lado de Entradas. Estos escenarios requieren nueva validación antes de considerarse corregidos.

**Estado del documento:** borrador técnico basado en el repositorio y las evidencias existentes; pendiente de confirmar parámetros definitivos de workstation, rama de entrega y resultados de pruebas finales.
