import { z } from 'zod';

// Si falta una variable crítica, el servicio no arranca (mejor que fallar en runtime)
const envSchema = z.object({
  PORT: z.coerce.number().int().default(3000),
  MONGO_URI: z.string().min(1),
  AUTH_SERVICE_URL: z.url(),
  AUTH_TIMEOUT_MS: z.coerce.number().int().positive().default(1000),
  // Contrato Auth v1.1 §6: sin reintentos automáticos por defecto. Sólo se reintenta timeout, error de red o 503
  AUTH_REINTENTOS: z.coerce.number().int().min(0).max(2).default(0),
  // Clave compartida que Auth exige en x-api-key (contrato Auth v1.1, INT-11). Sin ella, el Auth real responde 403
  AUTH_INTERNAL_API_KEY: z.string().min(1).optional(),
  // Entradas / Inventario, para consultar el stock antes de eliminar un evento publicado (HU-03, INT-05).
  // Sin ella, eliminar un PUBLICADO responde 503 (fail-secure); eliminar un BORRADOR no la necesita
  ENTRADAS_SERVICE_URL: z.url().optional(),
  ENTRADAS_TIMEOUT_MS: z.coerce.number().int().positive().default(1000),
  // Orígenes del navegador permitidos, separados por coma: frontend propio (Vite :5173) y Frontend Unificado (:3000)
  CORS_ORIGIN: z.string().default('http://localhost:5173,http://localhost:3000')
    .transform((v) => v.split(',').map((o) => o.trim()).filter(Boolean)),
  // Broker de la plataforma TicketU (ADR-0013). Sin BROKER_URL la API funciona igual y el outbox acumula los mensajes
  BROKER_URL: z.string().min(1).optional(),
  EVENT_EXCHANGE: z.string().min(1).default('ticketu.events'),
  OUTBOX_POLL_MS: z.coerce.number().int().positive().default(1000),
  OUTBOX_MAX_INTENTOS: z.coerce.number().int().positive().default(10),
  // Tópicos separados por coma que llevan el sobre dentro del cuerpo { envelope, payload } (ADR-0017). Hoy: el de Entradas
  BROKER_TOPICOS_CON_SOBRE: z.string().default('')
    .transform((v) => v.split(',').map((t) => t.trim()).filter(Boolean)),
  // Exchange adicional por tópico, "topico=exchange" separados por coma (ADR-0019). Hoy: Notificaciones, cuyo contrato
  // fija el exchange panel.evento.notificaciones.v1. El mensaje sale igual en EVENT_EXCHANGE
  BROKER_EXCHANGES_ADICIONALES: z.string().default('')
    .transform((v) => Object.fromEntries(v.split(',').map((par) => par.trim()).filter(Boolean)
      .map((par) => par.split('=').map((x) => x.trim()) as [string, string])))
    .refine((m) => Object.entries(m).every(([t, e]) => Boolean(t) && Boolean(e)), 'Formato esperado: topico=exchange,topico2=exchange2'),
  // Lo que Panel recibe de Entradas: aviso de stock (contrato Entradas §3.4, ADR-0018). Cola durable propia del Panel
  TOPIC_STOCK_ENTRADAS: z.string().min(1).default('entradas.evento.stock.v1'),
  BROKER_COLA_STOCK: z.string().min(1).default('panel-organizador.entradas.stock'),
});

export type Env = z.infer<typeof envSchema>;
// Docker Compose pasa como cadena vacía una variable no definida en .env (`${VAR:-}`): vacía = no definida
const withoutEmpty = (env: NodeJS.ProcessEnv) => Object.fromEntries(Object.entries(env).filter(([, value]) => value !== ''));

export const loadEnv = (env: NodeJS.ProcessEnv = process.env): Env => envSchema.parse(withoutEmpty(env));
