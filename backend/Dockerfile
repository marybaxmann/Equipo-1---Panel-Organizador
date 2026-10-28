# Imagen del microservicio Panel Organizador para el ecosistema TicketU (API Gateway + RabbitMQ compartidos).
# Se construye desde la RAÍZ del monorepo, porque hay un solo package-lock.json:
#   docker build -f backend/Dockerfile -t panel-organizador .

# --- Etapa 1: compilar TypeScript ---
FROM node:26-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY database/package.json database/
COPY frontend/package.json frontend/
COPY tools/mock-auth/package.json tools/mock-auth/
RUN npm ci -w backend -w database --include-workspace-root=false
COPY backend/ backend/
RUN npm run build -w backend

# --- Etapa 2: sólo lo necesario para correr ---
FROM node:26-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY database/package.json database/
COPY frontend/package.json frontend/
COPY tools/mock-auth/package.json tools/mock-auth/
RUN npm ci -w backend -w database --include-workspace-root=false --omit=dev && npm cache clean --force
COPY --from=build /app/backend/dist backend/dist
# El script de creación de colecciones ($jsonSchema + índices) y el seed de demo
COPY database/schema database/schema
COPY database/scripts database/scripts
# Swagger lee la especificación en tiempo de ejecución (backend/src/docs/swagger.ts → ../../../docs/api)
COPY docs/api docs/api
COPY backend/docker-entrypoint.sh backend/
USER node
EXPOSE 3000
ENTRYPOINT ["sh", "backend/docker-entrypoint.sh"]
