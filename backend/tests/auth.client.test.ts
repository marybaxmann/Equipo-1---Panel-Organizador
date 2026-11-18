import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { createHttpAuthClient } from '../src/modules/auth/auth.client.js';

type Step = { status: number; body?: unknown; delayMs?: number };
let server: http.Server | undefined;
const received: { cookie: string | undefined; apiKey: string | undefined }[] = [];

async function fakeAuth(steps: Step[]): Promise<string> {
  received.length = 0;
  server = http.createServer((req, res) => {
    received.push({ cookie: req.headers.cookie, apiKey: req.headers['x-api-key'] as string | undefined });
    const step = steps[Math.min(received.length - 1, steps.length - 1)]!;
    setTimeout(() => res.writeHead(step.status, { 'Content-Type': 'application/json' }).end(JSON.stringify(step.body ?? {})), step.delayMs ?? 0);
  });
  await new Promise<void>((r) => server!.listen(0, r));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}
afterEach(() => { server?.closeAllConnections(); server?.close(); });

const ok = { status: 200, body: { valido: true, usuario: { id_usuario: 'u-1', rol: 'organizador', correo_electronico: 'x@y.cl' } } };

describe('HttpAuthClient', () => {
  it('forwards the jwt cookie untouched and returns id_usuario and rol', async () => {
    const client = createHttpAuthClient({ baseUrl: await fakeAuth([ok]), timeoutMs: 500 });
    await expect(client.validateSession('abc.def.ghi')).resolves.toEqual({ id_usuario: 'u-1', rol: 'organizador' });
    expect(received[0]!.cookie).toBe('jwt=abc.def.ghi');
  });

  it('maps 401 to SESSION_INVALID without retrying', async () => {
    const client = createHttpAuthClient({ baseUrl: await fakeAuth([{ status: 401 }]), timeoutMs: 500 });
    await expect(client.validateSession('x')).rejects.toMatchObject({ status: 401, code: 'SESSION_INVALID' });
    expect(received).toHaveLength(1);
  });

  it('maps valido:false to SESSION_INVALID', async () => {
    const client = createHttpAuthClient({ baseUrl: await fakeAuth([{ status: 200, body: { valido: false } }]), timeoutMs: 500 });
    await expect(client.validateSession('x')).rejects.toMatchObject({ status: 401 });
  });

  it('sends x-api-key when the shared key is configured (Auth v1.1, INT-11)', async () => {
    const client = createHttpAuthClient({ baseUrl: await fakeAuth([ok]), timeoutMs: 500, apiKey: 'clave-del-ambiente' });
    await client.validateSession('abc');
    expect(received[0]).toEqual({ cookie: 'jwt=abc', apiKey: 'clave-del-ambiente' });
  });

  it('does not send x-api-key when no key is configured', async () => {
    const client = createHttpAuthClient({ baseUrl: await fakeAuth([ok]), timeoutMs: 500 });
    await client.validateSession('abc');
    expect(received[0]!.apiKey).toBeUndefined();
  });

  it('maps 403 (missing or wrong x-api-key) to AUTH_ERROR (502), logs it and does not retry', async () => {
    const logged: string[] = [];
    const client = createHttpAuthClient({ baseUrl: await fakeAuth([{ status: 403 }]), timeoutMs: 500, apiKey: 'mala', logError: (l) => logged.push(l) });
    await expect(client.validateSession('x')).rejects.toMatchObject({ status: 502, code: 'AUTH_ERROR' });
    expect(received).toHaveLength(1);
    expect(logged.join()).toContain('x-api-key');
    expect(logged.join()).not.toContain('mala');
  });

  it('maps 500 to AUTH_ERROR (502) without retrying', async () => {
    const client = createHttpAuthClient({ baseUrl: await fakeAuth([{ status: 500 }]), timeoutMs: 500 });
    await expect(client.validateSession('x')).rejects.toMatchObject({ status: 502, code: 'AUTH_ERROR' });
    expect(received).toHaveLength(1);
  });

  it('by default does not retry (Auth v1.1 §6): a 503 fails secure after one call', async () => {
    const client = createHttpAuthClient({ baseUrl: await fakeAuth([{ status: 503 }, ok]), timeoutMs: 500 });
    await expect(client.validateSession('x')).rejects.toMatchObject({ status: 503, code: 'AUTH_UNAVAILABLE' });
    expect(received).toHaveLength(1);
  });

  it('by default a timeout fails secure with 503 after one call', async () => {
    const client = createHttpAuthClient({ baseUrl: await fakeAuth([{ ...ok, delayMs: 400 }]), timeoutMs: 100 });
    await expect(client.validateSession('x')).rejects.toMatchObject({ status: 503, code: 'AUTH_UNAVAILABLE' });
    expect(received).toHaveLength(1);
  });

  it('with AUTH_REINTENTOS = 1 retries a 503 once and succeeds if the retry succeeds', async () => {
    const client = createHttpAuthClient({ baseUrl: await fakeAuth([{ status: 503 }, ok]), timeoutMs: 500, retries: 1 });
    await expect(client.validateSession('x')).resolves.toMatchObject({ id_usuario: 'u-1' });
    expect(received).toHaveLength(2);
  });

  it('with AUTH_REINTENTOS = 1 fails secure when Auth answers 503 twice', async () => {
    const client = createHttpAuthClient({ baseUrl: await fakeAuth([{ status: 503 }]), timeoutMs: 500, retries: 1 });
    await expect(client.validateSession('x')).rejects.toMatchObject({ status: 503, code: 'AUTH_UNAVAILABLE' });
    expect(received).toHaveLength(2);
  });

  it('fails secure with 503 when Auth is unreachable', async () => {
    const client = createHttpAuthClient({ baseUrl: 'http://127.0.0.1:1', timeoutMs: 100 });
    await expect(client.validateSession('x')).rejects.toMatchObject({ status: 503 });
  });

  it('maps an unexpected body to AUTH_ERROR', async () => {
    const client = createHttpAuthClient({ baseUrl: await fakeAuth([{ status: 200, body: { foo: 1 } }]), timeoutMs: 500 });
    await expect(client.validateSession('x')).rejects.toMatchObject({ status: 502 });
  });
});
