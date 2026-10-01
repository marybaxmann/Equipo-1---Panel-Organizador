// Simula Auth mientras el squad Auth no publique su ambiente de integración.
// Tokens de demo: ver tabla USERS. "token-lento" sirve para demostrar fail-secure (503).
import http from 'node:http';

const USERS = {
  'token-org-a': { id_usuario: '3f1e2c1a-4b8d-4a2e-9c3f-7d1e2f9b2d4a', nombre_completo: 'Organizadora A', rut: '11.111.111-1', correo_electronico: 'org.a@ticketu.cl', rol: 'organizador' },
  'token-org-b': { id_usuario: '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d', nombre_completo: 'Organizador B', rut: '22.222.222-2', correo_electronico: 'org.b@ticketu.cl', rol: 'organizador' },
  'token-staff': { id_usuario: '7c7c7c7c-2222-4333-8444-555566667777', nombre_completo: 'Staff Check-in', rut: '44.444.444-4', correo_electronico: 'staff@ticketu.cl', rol: 'staff' },
  'token-asistente': { id_usuario: '5b5b5b5b-1111-4222-8333-444455556666', nombre_completo: 'Asistente', rut: '33.333.333-3', correo_electronico: 'asistente@ticketu.cl', rol: 'asistente' },
};

function readJwt(cookieHeader = '') {
  const match = cookieHeader.split(';').map((c) => c.trim()).find((c) => c.startsWith('jwt='));
  return match?.slice(4);
}

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify(body));
}

http.createServer(async (req, res) => {
  if (req.method !== 'GET' || req.url !== '/internal/validar-sesion') return send(res, 404, { error: 'not found' });
  const jwt = readJwt(req.headers.cookie);
  if (jwt === 'token-lento') await new Promise((r) => setTimeout(r, 3000));
  const usuario = USERS[jwt];
  if (!usuario) return send(res, 401, { valido: false });
  return send(res, 200, { valido: true, usuario });
}).listen(Number(process.env.PORT ?? 4001), () => console.log('[mock-auth] listening on :4001'));
