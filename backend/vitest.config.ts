import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    hookTimeout: 60_000, // la primera vez mongodb-memory-server descarga el binario
    fileParallelism: false,
    coverage: { provider: 'v8', include: ['src/**'], reporter: ['text', 'json-summary'], reportsDirectory: '../docs/evidencias/pruebas-funcionalidad/coverage' },
  },
});
