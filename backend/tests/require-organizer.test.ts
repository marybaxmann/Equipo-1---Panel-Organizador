import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { errorHandler } from '../src/core/middlewares/error-handler.js';
import { requireOrganizer } from '../src/modules/auth/require-organizer.js';
import { FakeAuthClient } from './helpers/fake-auth.js';

let auth: FakeAuthClient;
let app: express.Express;
beforeEach(() => {
  auth = new FakeAuthClient();
  app = express();
  app.get('/protected', requireOrganizer(auth), (_req, res) => { res.json({ user: res.locals.user }); });
  app.use(errorHandler);
});

describe('HU-06 requireOrganizer', () => {
  it('401 without jwt cookie and never calls Auth', async () => {
    const res = await request(app).get('/protected');
    expect(res.status).toBe(401);
    expect(res.body.error.codigo).toBe('SESSION_INVALID');
    expect(auth.calls).toHaveLength(0);
  });
  it('401 when Auth rejects the token (expired/invalid)', async () => {
    const res = await request(app).get('/protected').set('Cookie', 'jwt=token-expirado');
    expect(res.status).toBe(401);
  });
  it('403 FORBIDDEN_ROLE when the user is not an organizer', async () => {
    const res = await request(app).get('/protected').set('Cookie', 'jwt=token-asistente');
    expect(res.status).toBe(403);
    expect(res.body.error.codigo).toBe('FORBIDDEN_ROLE');
  });
  it('503 when Auth is unavailable (fail-secure)', async () => {
    auth.unavailable = true;
    const res = await request(app).get('/protected').set('Cookie', 'jwt=token-org-a');
    expect(res.status).toBe(503);
  });
  it('passes the Auth identity to the handler', async () => {
    const res = await request(app).get('/protected').set('Cookie', 'other=1; jwt=token-org-a');
    expect(res.status).toBe(200);
    expect(res.body.user.rol).toBe('organizador');
    expect(auth.calls).toEqual(['token-org-a']);
  });
});
