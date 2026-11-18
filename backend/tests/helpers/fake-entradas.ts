import { entradasUnavailable, type EntradasClient } from '../../src/modules/integraciones/entradas.client.js';

// Entradas en memoria para HU-03: stock por id de evento; sin entrada en el mapa = Entradas no conoce el evento (404)
export class FakeEntradasClient implements EntradasClient {
  stock = new Map<string, number>();
  calls: string[] = [];
  unavailable = false;
  async getStock(idEvento: string): Promise<number | null> {
    this.calls.push(idEvento);
    if (this.unavailable) throw entradasUnavailable();
    return this.stock.get(idEvento) ?? null;
  }
}
