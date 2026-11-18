import { z } from 'zod';
import { AppError } from '../../core/errors/app-error.js';

// Consulta de stock a Entradas / Inventario (contrato Entradas §3.4, INT-05). La usa HU-03 antes de eliminar un evento publicado.
// Devuelve null cuando Entradas no conoce el evento (404): nunca se vendieron entradas.
export interface EntradasClient { getStock(idEvento: string, jwt: string): Promise<number | null> }

const stockSchema = z.object({ id_evento: z.string().min(1), stock: z.number().int().min(0) });

export const entradasUnavailable = () =>
  new AppError(503, 'ENTRADAS_UNAVAILABLE', 'No se pudo consultar el stock a Entradas / Inventario. El evento no se eliminó; intenta más tarde.');

export function createHttpEntradasClient(opts: { baseUrl: string | undefined; timeoutMs: number }): EntradasClient {
  return {
    async getStock(idEvento, jwt) {
      // Sin URL configurada no se puede confirmar que no haya ventas: fail-secure, igual que con Auth
      if (!opts.baseUrl) throw entradasUnavailable();
      const url = new URL(`/api/v1/entradas/eventos/${encodeURIComponent(idEvento)}/stock`, opts.baseUrl);
      // Máximo 1 reintento ante timeout, error de red o 5xx (mismo criterio que con Auth, ADR-0005)
      for (let intento = 0; intento < 2; intento++) {
        let response: Response;
        try {
          // Se reenvía la cookie del organizador tal cual, como hace Entradas al consultar a Panel
          response = await fetch(url, { headers: { Cookie: `jwt=${jwt}` }, signal: AbortSignal.timeout(opts.timeoutMs) });
        } catch {
          continue;
        }
        if (response.status >= 500) {
          await response.body?.cancel();
          continue;
        }
        if (response.status === 404) {
          await response.body?.cancel();
          return null;
        }
        if (!response.ok) {
          await response.body?.cancel();
          throw entradasUnavailable();
        }
        const parsed = stockSchema.safeParse(await response.json().catch(() => null));
        if (!parsed.success) throw entradasUnavailable();
        return parsed.data.stock;
      }
      throw entradasUnavailable();
    },
  };
}
