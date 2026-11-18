import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { createHttpEntradasClient } from '../src/modules/integraciones/entradas.client.js';

type Step = { status: number; body?: unknown; delayMs?: number };
let server: http.Server | undefined;
const received: { url: string | undefined; cookie: string | undefined }[] = [];

async function fakeEntradas(steps: Step[]): Promise<string> {
  received.length = 0;
  server = http.createServer((req, res) => {
    received.push({ url: req.url, cookie: req.headers.cookie });
    const step = steps[Math.min(received.length - 1, steps.length - 1)]!;
    setTimeout(() => res.writeHead(step.status, { 'Content-Type': 'application/json' }).end(JSON.stringify(step.body ?? {})), step.delayMs ?? 0);
  });
  await new Promise<void>((r) => server!.listen(0, r));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}
afterEach(() => { server?.closeAllConnections(); server?.close(); });

const ID = '66f1a0000000000000000002';
const ok = { status: 200, body: { id_evento: ID, stock: 37 } };

describe('HttpEntradasClient (contrato Entradas §3.4)', () => {
  it('pide el stock a la ruta del contrato reenviando la cookie jwt', async () => {
    const client = createHttpEntradasClient({ baseUrl: await fakeEntradas([ok]), timeoutMs: 500 });
    await expect(client.getStock(ID, 'abc')).resolves.toBe(37);
    expect(received[0]).toEqual({ url: `/api/v1/entradas/eventos/${ID}/stock`, cookie: 'jwt=abc' });
  });

  it('404 = Entradas no conoce el evento → null, sin reintentar', async () => {
    const client = createHttpEntradasClient({ baseUrl: await fakeEntradas([{ status: 404 }]), timeoutMs: 500 });
    await expect(client.getStock(ID, 'abc')).resolves.toBeNull();
    expect(received).toHaveLength(1);
  });

  it('reintenta una vez ante 5xx y usa la respuesta del reintento', async () => {
    const client = createHttpEntradasClient({ baseUrl: await fakeEntradas([{ status: 500 }, ok]), timeoutMs: 500 });
    await expect(client.getStock(ID, 'abc')).resolves.toBe(37);
    expect(received).toHaveLength(2);
  });

  it('timeout dos veces → 503 ENTRADAS_UNAVAILABLE', async () => {
    const client = createHttpEntradasClient({ baseUrl: await fakeEntradas([{ ...ok, delayMs: 400 }]), timeoutMs: 100 });
    await expect(client.getStock(ID, 'abc')).rejects.toMatchObject({ status: 503, code: 'ENTRADAS_UNAVAILABLE' });
    expect(received).toHaveLength(2);
  });

  it('cuerpo inesperado → 503 (no se puede confirmar que no haya ventas)', async () => {
    const client = createHttpEntradasClient({ baseUrl: await fakeEntradas([{ status: 200, body: { stock: 'muchas' } }]), timeoutMs: 500 });
    await expect(client.getStock(ID, 'abc')).rejects.toMatchObject({ status: 503 });
  });

  it('sin ENTRADAS_SERVICE_URL configurada → 503 sin llamar a nadie (fail-secure)', async () => {
    const client = createHttpEntradasClient({ baseUrl: undefined, timeoutMs: 500 });
    await expect(client.getStock(ID, 'abc')).rejects.toMatchObject({ status: 503, code: 'ENTRADAS_UNAVAILABLE' });
  });

  it('Entradas inalcanzable → 503', async () => {
    const client = createHttpEntradasClient({ baseUrl: 'http://127.0.0.1:1', timeoutMs: 100 });
    await expect(client.getStock(ID, 'abc')).rejects.toMatchObject({ status: 503 });
  });
});
