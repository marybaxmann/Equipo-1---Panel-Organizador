# Instalación — Panel Organizador (TicketU)

**Evaluación:** 3 · **Rama de entrega:** `main`

Panel Organizador permite a un usuario con rol `organizador` crear, editar, publicar y eliminar sus eventos. Las tres integraciones evaluables (Auth, API Gateway y broker) se declaran en [`INTEGRACIONES.md`](INTEGRACIONES.md).

## 1. Requisitos

- Git, Node.js 26.x y npm.
- Docker con Docker Compose.
- Servicios de la plataforma TicketU levantados en workstation: Auth, API Gateway, RabbitMQ, Entradas / Inventario y Frontend Unificado, conectados a la red `plataforma-eventos-net`. Cada equipo dueño instala su servicio.

## 2. Componentes y direcciones

| Componente | Dirección o puerto |
|---|---|
| Frontend Unificado (evaluación) | `http://localhost:3000` · login en `/auth/admin/login` · Panel en `/organizador` |
| Frontend propio del Panel (desarrollo) | `http://localhost:5173` |
| Backend Panel (Docker) | `http://organizador-service:3000` · Swagger en `/api-docs` |
| API Gateway | `http://localhost:8080` (host) · `http://ticketu-api-gateway:8080` (Docker) |
| Auth | `http://auth-service:10000` |
| Entradas / Inventario | `http://entradas-service:3000` |
| RabbitMQ | `ticketu-rabbitmq:5672` · consola en `http://localhost:15672` |
| MongoDB Panel | `organizador-mongo:27017` (red interna) |
| Red compartida | `plataforma-eventos-net` |

## 3. Instalación

```bash
git clone https://github.com/marybaxmann/Equipo-1---Panel-Organizador.git
cd Equipo-1---Panel-Organizador
git checkout main
npm ci
```

Si la red compartida no existe:

```bash
docker network create plataforma-eventos-net
```

## 4. Configuración

Crear un archivo `.env` en la raíz a partir de `.env.example`, con estos valores para workstation:

```dotenv
AUTH_SERVICE_URL=http://auth-service:10000
AUTH_INTERNAL_API_KEY=<clave privada entregada por Auth>
AUTH_TIMEOUT_MS=1000
AUTH_REINTENTOS=0

ENTRADAS_SERVICE_URL=http://entradas-service:3000
ENTRADAS_TIMEOUT_MS=1000

BROKER_URL=amqp://ticketu:ticketu_dev@ticketu-rabbitmq:5672/ticketu
EVENT_EXCHANGE=ticketu.events
TOPIC_ENTRADAS=panel.evento.entradas.v1
BROKER_TOPICOS_CON_SOBRE=panel.evento.entradas.v1
TOPIC_STOCK_ENTRADAS=entradas.evento.stock.v1
BROKER_COLA_STOCK=panel-organizador.entradas.stock

SEED_DEMO=true
```

- `BROKER_URL`: RabbitMQ de la plataforma (`ticketu-rabbitmq`, vhost `ticketu`), con el usuario de pruebas definido en `FWizav/backendticketU/event-broker`. Si la plataforma cambia las credenciales en workstation, se ajusta solo esta variable. **Es obligatoria para I3:** sin ella la API funciona, pero los mensajes quedan `PENDIENTE` en `mensajes_salientes` y no se publican.
- `AUTH_INTERNAL_API_KEY`: clave privada que entrega el equipo Auth. Debe coincidir con la configurada en Auth y no se publica en el repositorio. Sin ella, Auth rechaza la validación y el Panel responde `502 AUTH_ERROR`.
- `ENTRADAS_SERVICE_URL`: consulta de stock antes de eliminar un evento publicado, directo al contenedor de Entradas (sin Gateway). Sin ella, eliminar un evento PUBLICADO responde `503`.
- `SEED_DEMO=true`: carga 7 eventos de demostración y reemplaza los existentes. Usar solo en el ambiente de pruebas.

## 5. Iniciar el backend y la base de datos

```bash
docker compose -f docker-compose.integracion.yml up --build -d
```

Levanta `organizador-service` (backend) y `organizador-mongo` (MongoDB 7). Al iniciar, el backend crea las colecciones, validadores e índices (`database/scripts/create-collections.mjs`) y, con `SEED_DEMO=true`, carga los datos de demostración.

Verificar:

```bash
docker compose -f docker-compose.integracion.yml ps
docker compose -f docker-compose.integracion.yml logs organizador-service
docker run --rm --network plataforma-eventos-net curlimages/curl -s http://organizador-service:3000/health
```

## 6. Frontend

**Frontend para la evaluación:** la revisión se hace en el Frontend Unificado de TicketU (`FWizav/FrontendTitec`, rama `main`), que integra la interfaz del Panel y usa el inicio de sesión real de Auth. Lo instala su equipo dueño en workstation.

- Inicio de sesión: `http://localhost:3000/auth/admin/login`
- Panel Organizador: `http://localhost:3000/organizador`

Detalle de la integración: `docs/integracion-frontend-unificado.md`.

**Frontend propio (desarrollo local):** también se puede levantar el frontend de este repositorio:

```bash
npm run dev:web
```

Queda en `http://localhost:5173`. Variables en `frontend/.env`:

```dotenv
VITE_API_BASE_URL=/api/organizador/v1/panel
VITE_AUTH_LOGIN_URL=http://localhost:3000/auth/admin/login
```

El proxy de Vite (`frontend/vite.config.js`) envía `/api` al API Gateway (`http://localhost:8080`), que enruta `/api/organizador/*` al backend del Panel.

## 7. Usuarios de prueba

Creados y publicados por el equipo Auth (seed de QA). La contraseña común de estas cuentas ficticias está publicada en `INSTALACION.md` del repo `equipo-auth/arquitectura` (sección 4, *Usuarios de prueba Auth*).

| Usuario | Rol | Uso |
|---|---|---|
| `organizador1@ticketu.test` | `organizador` | Flujo principal y gestión de eventos |
| `staff1@ticketu.test` | `staff` | Consulta compartida con Check-in y Entradas |
| `comprador1@ticketu.test` | `usuario` | Verificar el rechazo por rol (403) |

## 8. Flujo principal

1. Abrir `http://localhost:3000/auth/admin/login` e iniciar sesión con `organizador1@ticketu.test`.
2. El sistema redirige a `http://localhost:3000/organizador` (Mis eventos).
3. Hacer clic en **+ Crear mi primer evento** (o **+ Nuevo evento**).
4. Completar los campos obligatorios y presionar **Guardar evento**: queda en estado BORRADOR.
5. En el listado o en el detalle, presionar **Publicar**: pasa a PUBLICADO.

Para verificar el rechazo por rol, iniciar sesión con `comprador1@ticketu.test`: se muestra *Acceso restringido a organizadores* (403).

Pruebas automatizadas del backend: `npm test`.
