# Pruebas de Integración (Postman / Newman)

## Resultados
- **Fecha de ejecución**: 2026-09-29
- **Comando ejecutado**: `npm run test:integration | tee docs/evidencias/pruebas-integracion/newman-cli.txt`
- **Resumen**: 18 requests, 32 aserciones, **0 fallos** (incluye los casos de Check-in v1.2: staff 200, sin sesión 401, asistente 403).

## Cómo reproducir
1. Asegurarse de tener la infraestructura y base de datos de demo inicializada:
   ```bash
   npm run infra:up
   npm run db:init && npm run db:seed
   ```
2. Levantar la API en modo desarrollo:
   ```bash
   npm run dev:api
   ```
3. En otra terminal, ejecutar las pruebas:
   ```bash
   npm run test:integration
   ```
