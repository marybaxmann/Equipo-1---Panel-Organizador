// Anuncia por el broker los eventos que ya están en MongoDB (p. ej. recién cargados con el seed de demo).
// Sólo escribe en mensajes_salientes; los entrega a RabbitMQ el relay de la API cuando arranca con BROKER_URL.
//   Local:  npm run db:anunciar          Docker: lo corre docker-entrypoint.sh si SEED_DEMO=true
import mongoose from 'mongoose';
import { anunciarEventos } from '../modules/mensajeria/anunciar-eventos.js';
import { createEventoNotifier } from '../modules/mensajeria/evento.notifier.js';
import { OutboxEventPublisher } from '../modules/mensajeria/outbox.publisher.js';
import { loadTopics } from '../modules/mensajeria/topics.js';

await mongoose.connect(process.env.MONGO_URI ?? 'mongodb://localhost:27017/panel_organizador');
try {
  const total = await anunciarEventos(createEventoNotifier(new OutboxEventPublisher(), loadTopics()));
  console.log(`[db:anunciar] ${total} eventos anunciados en mensajes_salientes`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
