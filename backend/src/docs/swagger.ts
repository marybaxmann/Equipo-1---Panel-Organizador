import { readFileSync } from 'node:fs';
import type { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import { parse } from 'yaml';

// La especificación vive en docs/api (contract-first); ../../../docs resuelve igual desde src/docs y desde dist/docs
const specUrl = new URL('../../../docs/api/openapi.yaml', import.meta.url);

export function mountSwagger(app: Express): void {
  const spec = parse(readFileSync(specUrl, 'utf8')); // sin try: si falta la spec, el servicio no debe arrancar
  app.get('/api-docs/openapi.json', (_req, res) => { res.json(spec); });
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec, { customSiteTitle: 'Panel Organizador API' }));
}
