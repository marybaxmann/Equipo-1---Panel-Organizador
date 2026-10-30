# Pruebas de Integración (Postman / Newman)

## Resultados
- **Fecha de ejecución**: 2026-10-29
- **Comando ejecutado**: `npm run test:integration | tee docs/evidencias/pruebas-integracion/newman-cli.txt`
- **Resumen**: 29 requests, 50 aserciones, **0 fallos**.
- **Carpetas ejecutadas**: 01 Auth (servicio consumido) · 02 Catálogo · 03 Entradas · 04 Check-in (staff 200, sin sesión 401, asistente 403) · 05 Notificaciones · 06 Promociones · 07 Flujo HU-01→HU-05 · **08 Sprint 2** (edición y publicación, HU-02 / HU-04).

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
