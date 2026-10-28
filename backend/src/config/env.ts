import { z } from 'zod';

// Si falta una variable crítica, el servicio no arranca (mejor que fallar en runtime)
const envSchema = z.object({
  PORT: z.coerce.number().int().default(3000),
  MONGO_URI: z.string().min(1),
  AUTH_SERVICE_URL: z.url(),
  AUTH_TIMEOUT_MS: z.coerce.number().int().positive().default(1000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  // Broker de la plataforma TicketU (ADR-0013). Sin BROKER_URL la API funciona igual y el outbox acumula los mensajes
  BROKER_URL: z.string().min(1).optional(),
  EVENT_EXCHANGE: z.string().min(1).default('ticketu.events'),
  OUTBOX_POLL_MS: z.coerce.number().int().positive().default(1000),
  OUTBOX_MAX_INTENTOS: z.coerce.number().int().positive().default(10),
});

export type Env = z.infer<typeof envSchema>;
export const loadEnv = (): Env => envSchema.parse(process.env);
