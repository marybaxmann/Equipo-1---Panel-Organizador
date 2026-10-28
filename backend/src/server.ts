import mongoose from 'mongoose';
import { createApp } from './app.js';
import { loadEnv } from './config/env.js';
import { createHttpAuthClient } from './modules/auth/auth.client.js';
import { createEventoNotifier } from './modules/mensajeria/evento.notifier.js';
import { OutboxEventPublisher } from './modules/mensajeria/outbox.publisher.js';
import { createAmqpConnection, OutboxRelay } from './modules/mensajeria/outbox.relay.js';
import { loadTopics } from './modules/mensajeria/topics.js';

const env = loadEnv();
await mongoose.connect(env.MONGO_URI);
console.log('[db] connected');
const authClient = createHttpAuthClient({ baseUrl: env.AUTH_SERVICE_URL, timeoutMs: env.AUTH_TIMEOUT_MS });
const notifier = createEventoNotifier(new OutboxEventPublisher(), loadTopics());
const server = createApp({ authClient, notifier, corsOrigin: env.CORS_ORIGIN }).listen(env.PORT, () => {
  console.log(`[panel-organizador] http://localhost:${env.PORT}  (docs: /api-docs)`);
});

// Publicador del outbox hacia RabbitMQ (ADR-0013). Corre en el mismo proceso que la API, pero la API nunca lo espera
let relay: OutboxRelay | null = null;
if (env.BROKER_URL) {
  relay = new OutboxRelay(createAmqpConnection(env.BROKER_URL, env.EVENT_EXCHANGE), {
    exchange: env.EVENT_EXCHANGE, pollMs: env.OUTBOX_POLL_MS, maxIntentos: env.OUTBOX_MAX_INTENTOS,
  });
  await relay.start();
} else {
  console.log('[outbox] BROKER_URL no definida: los mensajes quedan PENDIENTE en mensajes_salientes');
}

async function shutdown(signal: string) {
  console.log(`[panel-organizador] ${signal}: cerrando...`);
  server.close();
  await relay?.stop();
  await mongoose.disconnect();
  process.exit(0);
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
