// Simula la consulta de stock de Entradas / Inventario (contrato Entradas §3.4) mientras su squad no la publique.
// GET /api/v1/entradas/eventos/{id_evento}/stock → { id_evento, stock }. Un evento que no está en STOCK responde 404,
// igual que Entradas con un evento que no conoce. Sirve para demostrar HU-03 (eliminar o cancelar) y el 503 al apagarlo.
import http from 'node:http';

// Stock de los eventos PUBLICADO del seed (cantidad_entradas entre paréntesis)
const STOCK = {
  '66f1a0000000000000000002': 300, // Feria de Innovación (300): sin ventas → se elimina
  '66f1a0000000000000000003': 95, // Charla de Ciberseguridad (120): 25 vendidas → pasa a CANCELADO
  '66f1b0000000000000000001': 64, // Torneo de Ajedrez (64): sin ventas
};

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }).end(JSON.stringify(body));
}

http.createServer((req, res) => {
  const match = req.method === 'GET' && req.url.split('?')[0].match(/^\/api\/v1\/entradas\/eventos\/([^/]+)\/stock$/);
  if (!match) return send(res, 404, { error: 'not found' });
  const idEvento = decodeURIComponent(match[1]);
  if (!/^[0-9a-f]{24}$/i.test(idEvento)) return send(res, 400, { error: 'id_evento inválido' });
  if (!(idEvento in STOCK)) return send(res, 404, { error: 'evento no encontrado' });
  console.log(`[mock-entradas] stock ${idEvento} = ${STOCK[idEvento]}`);
  return send(res, 200, { id_evento: idEvento, stock: STOCK[idEvento] });
}).listen(Number(process.env.PORT ?? 4002), () => console.log(`[mock-entradas] listening on :${process.env.PORT ?? 4002}`));
