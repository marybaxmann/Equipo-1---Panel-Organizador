// Proxy espía entre el Panel y Auth: muestra qué cabeceras envía el Panel a /internal/validar-sesion
// y las reenvía SIN modificar a Auth. Para no exponer secretos, el jwt se muestra recortado + su huella SHA-256,
// y la x-api-key sólo como huella.
// Lo usa probar-jwt.ps1. Uso directo: node tools/pruebas-integracion/espiar-jwt.mjs [puertoEscucha=10001] [destino=http://localhost:10000]
import http from 'node:http';
import { createHash } from 'node:crypto';

const PORT = Number(process.argv[2] ?? 10001);
const TARGET = new URL(process.argv[3] ?? 'http://localhost:10000');
const sha = (v) => createHash('sha256').update(v).digest('hex').slice(0, 16);
const recorte = (v) => (v.length > 40 ? `${v.slice(0, 20)}...${v.slice(-12)}` : v);

http.createServer((req, res) => {
  const cookie = req.headers.cookie ?? '';
  const jwt = cookie.split(';').map((c) => c.trim()).find((c) => c.startsWith('jwt='))?.slice(4);
  const key = req.headers['x-api-key'];
  console.log(`\n[ESPIA] Panel -> Auth: ${req.method} ${req.url}  (${new Date().toLocaleTimeString()})`);
  console.log(`[ESPIA]   Cookie jwt : ${jwt ? `${recorte(jwt)}  (${jwt.length} caracteres, sha256 ${sha(jwt)})` : 'NO VIENE'}`);
  console.log(`[ESPIA]   x-api-key  : ${key ? `presente (sha256 ${sha(String(key))})` : 'NO VIENE'}`);
  console.log(`[ESPIA]   Authorization: ${req.headers.authorization ?? '(no se envia, correcto: el contrato solo usa la cookie)'}`);

  const upstream = http.request(
    { hostname: TARGET.hostname, port: TARGET.port, path: req.url, method: req.method, headers: { ...req.headers, host: TARGET.host } },
    (up) => {
      const chunks = [];
      up.on('data', (c) => chunks.push(c));
      up.on('end', () => {
        const body = Buffer.concat(chunks);
        let resumen = '';
        try {
          const j = JSON.parse(body.toString('utf8'));
          resumen = j.usuario ? `valido=${j.valido}, id_usuario=${j.usuario.id_usuario}, rol=${j.usuario.rol}` : `${j.error ?? ''} ${j.mensaje ?? ''}`.trim();
        } catch { /* cuerpo no JSON */ }
        console.log(`[ESPIA]   Auth respondio: HTTP ${up.statusCode}  ${resumen}`);
        res.writeHead(up.statusCode ?? 502, up.headers);
        res.end(body);
      });
    },
  );
  upstream.on('error', (e) => { console.log(`[ESPIA]   Auth no responde: ${e.message}`); res.writeHead(503).end(); });
  req.pipe(upstream);
}).listen(PORT, () => console.log(`[ESPIA] escuchando en :${PORT} y reenviando a ${TARGET.origin}`));
