#!/bin/sh
# Antes de levantar la API: crear o actualizar las colecciones con sus validadores e índices (idempotente).
# SEED_DEMO=true carga además los eventos de demo (borra los eventos existentes: sólo para ambientes de prueba).
set -e
node database/scripts/create-collections.mjs
if [ "$SEED_DEMO" = "true" ]; then
  node database/scripts/seed-demo.mjs
fi
exec node backend/dist/server.js
