import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createCollections } from '@panel/database/create-collections';
import { createApp } from '../../src/app.js';
import { createEventoNotifier } from '../../src/modules/mensajeria/evento.notifier.js';
import { OutboxEventPublisher } from '../../src/modules/mensajeria/outbox.publisher.js';
import { loadTopics } from '../../src/modules/mensajeria/topics.js';
import { FakeAuthClient } from './fake-auth.js';

// Cada archivo de test tiene su propia BD en memoria, creada con el MISMO script que producción
export async function setupTestApp() {
  const server = await MongoMemoryServer.create();
  await mongoose.connect(server.getUri('panel_test'));
  await createCollections(mongoose.connection.db!);
  const auth = new FakeAuthClient();
  // Mismo outbox que producción, sin log: los tests leen mensajes_salientes
  const app = createApp({ authClient: auth, notifier: createEventoNotifier(new OutboxEventPublisher(() => {}), loadTopics({})) });
  return {
    app,
    auth,
    async reset() {
      await mongoose.connection.db!.collection('eventos').deleteMany({});
      await mongoose.connection.db!.collection('cambios_estado_evento').deleteMany({});
      await mongoose.connection.db!.collection('mensajes_salientes').deleteMany({});
      auth.calls = []; auth.unavailable = false;
    },
    async teardown() { await mongoose.disconnect(); await server.stop(); },
  };
}
