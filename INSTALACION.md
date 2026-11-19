# Instalación — Panel Organizador (TicketU)

**Evaluación:** 3 · **Rama de entrega:** `main`

Panel Organizador permite a un usuario con rol `organizador` crear, editar, publicar y eliminar sus eventos. Las tres integraciones evaluables (Auth, API Gateway y broker) se declaran en [`INTEGRACIONES.md`](INTEGRACIONES.md).

## 1. Requisitos

- Git, Node.js 26.x y npm.
- Docker con Docker Compose.
- Servicios de la plataforma TicketU levantados en workstation: Auth, API Gateway, RabbitMQ y Entradas / Inventario, conectados a la red `plataforma-eventos-net`. Cada equipo dueño instala su servicio.

## 2. Componentes y direcciones

| Componente | Dirección o puerto |
|---|---|
| Frontend Panel | `http://localhost:5173` |
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

BROKER_URL=<completar en workstation>
EVENT_EXCHANGE=ticketu.events
TOPIC_ENTRADAS=panel.evento.entradas.v1
BROKER_TOPICOS_CON_SOBRE=panel.evento.entradas.v1
TOPIC_STOCK_ENTRADAS=entradas.evento.stock.v1
BROKER_COLA_STOCK=panel-organizador.entradas.stock

SEED_DEMO=true
```

- `BROKER_URL`: dirección AMQP con usuario, contraseña y virtual host de la plataforma en workstation.
- `AUTH_INTERNAL_API_KEY`: debe coincidir con la clave configurada en Auth. No se publica en el repositorio.
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

## 6. Iniciar el frontend

```bash
npm run dev:web
```

Queda disponible en `http://localhost:5173`. Variables en `frontend/.env`:

```dotenv
VITE_API_BASE_URL=/api/organizador/v1/panel
VITE_AUTH_LOGIN_URL=<completar: login de Auth en workstation>
```

El proxy de Vite (`frontend/vite.config.js`) envía `/api` al API Gateway (`http://localhost:8080`), que enruta `/api/organizador/*` al backend del Panel.

La interfaz del Panel también está integrada en el Frontend Unificado de TicketU (`FWizav/FrontendTitec`, ruta `/organizador`), con inicio de sesión real de Auth. Ver `docs/integracion-frontend-unificado.md`.
```

**Pendiente de confirmación:** valores finales de estas variables y del proxy de Vite (`frontend/vite.config.js`, hoy `/api` → `http://localhost:3000`) para que el frontend use el login real de Auth y llegue al backend en workstation.

## 7. Usuarios de prueba

Creados y publicados por el equipo Auth. Las contraseñas se entregan por el canal autorizado y no se incluyen en el repositorio.

| Usuario | Rol | Uso |
|---|---|---|
| `organizador1@ticketu.test` | `organizador` | Flujo principal y gestión de eventos |
| `staff1@ticketu.test` | `staff` | Consulta compartida con Check-in y Entradas |
| `comprador1@ticketu.test` | `usuario` | Verificar el rechazo por rol (403) |

## 8. Flujo principal

1. Iniciar sesión con `organizador1@ticketu.test`.
2. Abrir *Mis eventos*: se listan los eventos del organizador.
3. Crear un evento con *Nuevo evento*: queda en estado BORRADOR.
4. Verlo en *Mis eventos* y publicarlo: pasa a PUBLICADO.

Pruebas automatizadas del backend: `npm test`.
