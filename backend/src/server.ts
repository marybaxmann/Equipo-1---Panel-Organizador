import mongoose from 'mongoose';
import { createApp } from './app.js';
import { loadEnv } from './config/env.js';
import { createHttpAuthClient } from './modules/auth/auth.client.js';

const env = loadEnv();
await mongoose.connect(env.MONGO_URI);
console.log('[db] connected');
const authClient = createHttpAuthClient({ baseUrl: env.AUTH_SERVICE_URL, timeoutMs: env.AUTH_TIMEOUT_MS });
createApp({ authClient, corsOrigin: env.CORS_ORIGIN }).listen(env.PORT, () => {
  console.log(`[panel-organizador] http://localhost:${env.PORT}  (docs: /api-docs)`);
});
