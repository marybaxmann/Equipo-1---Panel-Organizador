import { z } from 'zod';

// Si falta una variable crítica, el servicio no arranca (mejor que fallar en runtime)
const envSchema = z.object({
  PORT: z.coerce.number().int().default(3000),
  MONGO_URI: z.string().min(1),
  AUTH_SERVICE_URL: z.url(),
  AUTH_TIMEOUT_MS: z.coerce.number().int().positive().default(1000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
});

export type Env = z.infer<typeof envSchema>;
export const loadEnv = (): Env => envSchema.parse(process.env);
