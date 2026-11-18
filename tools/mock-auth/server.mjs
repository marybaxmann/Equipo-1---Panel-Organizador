// Simula Auth (equipo-auth/arquitectura, contrato v1.1) mientras su squad no publique un ambiente de integración.
// Replica GET /internal/validar-sesion de su InternalController: mismas validaciones, en el mismo orden,
// y los mismos cuerpos de respuesta. En vez de verificar un JWT RS256, cada token de demo apunta a un usuario de USERS.
// Diferencias a propósito: x-api-key sólo se exige si se define INTERNAL_API_KEY, y "token-lento" / "token-error"
// existen para demostrar el fail-secure del Panel (503) y un error interno de Auth (500).
import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';

// Igual que la tabla users de Auth: rol interno, RUT sin puntos y estado de la cuenta.
const USERS = {
  'token-org-a': { uuid: '3f1e2c1a-4b8d-4a2e-9c3f-7d1e2f9b2d4a', nombre: 'Organizadora A', rut: '11111111-1', email: 'org.a@ticketu.cl', rol: 'ORGANIZADOR' },
  'token-org-b': { uuid: '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d', nombre: 'Organizador B', rut: '22222222-2', email: 'org.b@ticketu.cl', rol: 'ORGANIZADOR' },
  'token-staff': { uuid: '7c7c7c7c-2222-4333-8444-555566667777', nombre: 'Staff Check-in', rut: '44444444-4', email: 'staff@ticketu.cl', rol: 'STAFF' },
  // Comprador: Auth lo entrega como rol "usuario", que el Panel no autoriza (403 FORBIDDEN_ROLE)
  'token-asistente': { uuid: '5b5b5b5b-1111-4222-8333-444455556666', nombre: 'Asistente', rut: '33333333-3', email: 'asistente@ticketu.cl', rol: 'COMPRADOR' },
  // Casos que en Auth terminan en 401 (jwt.strategy.ts)
  'token-expirado': { expirado: true },
  'token-revocado': { uuid: '1a1a1a1a-3333-4444-8555-666677778888', nombre: 'Revocado', rut: '55555555-5', email: 'revocado@ticketu.cl', rol: 'ORGANIZADOR', revocado: true },
  'token-inactivo': { uuid: '2b2b2b2b-3333-4444-8555-666677778888', nombre: 'Inactivo', rut: '66666666-6', email: 'inactivo@ticketu.cl', rol: 'ORGANIZADOR', activo: false },
};

// rol-contrato.ts: mapeo estricto, un rol desconocido invalida la sesión
const ROLES_CONTRATO = { COMPRADOR: 'usuario', ORGANIZADOR: 'organizador', STAFF: 'staff' };

const ERRORES = {
  401: ['unauthorized', 'Sesión ausente, inválida, expirada o revocada'],
  403: ['forbidden', 'Servicio no autorizado a consultar la red interna'],
  500: ['internal_error', 'Error interno en Auth'],
};

// rut.ts formatRut: 11111111-1 → 11.111.111-1
const formatRut = (rut) => rut.replace(/^(\d+)-/, (_, body) => `${body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-`);

function readJwt(cookieHeader = '') {
  const match = cookieHeader.split(';').map((c) => c.trim()).find((c) => c.startsWith('jwt='));
  return match?.slice(4) || undefined;
}

function apiKeyValida(recibida) {
  const esperada = process.env.INTERNAL_API_KEY;
  if (!esperada) return true;
  if (!recibida) return false;
  const a = Buffer.from(recibida);
  const b = Buffer.from(esperada);
  return a.length === b.length && timingSafeEqual(a, b);
}

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }).end(JSON.stringify(body));
}

// ContractExceptionFilter: todo error de /internal sale con este formato
function sendError(res, status) {
  const [error, mensaje] = ERRORES[status];
  console.warn(`[mock-auth] GET /internal/validar-sesion -> ${status}`);
  send(res, status, { valido: false, codigo_http: status, error, mensaje });
}

http.createServer(async (req, res) => {
  // Fuera de /internal responde el 404 por defecto de NestJS, no el formato del contrato
  if (req.method !== 'GET' || req.url.split('?')[0] !== '/internal/validar-sesion') {
    return send(res, 404, { message: `Cannot ${req.method} ${req.url}`, error: 'Not Found', statusCode: 404 });
  }

  // Mismo orden que Auth: primero InternalApiKeyGuard (403), después JwtAuthGuard (401)
  if (!apiKeyValida(req.headers['x-api-key'])) return sendError(res, 403);

  const jwt = readJwt(req.headers.cookie);
  if (jwt === 'token-lento') await new Promise((r) => setTimeout(r, 3000));
  if (jwt === 'token-error') return sendError(res, 500);

  const user = USERS[jwt];
  if (!user || user.expirado || user.revocado || user.activo === false) return sendError(res, 401);
  const rol = ROLES_CONTRATO[user.rol];
  if (!rol) return sendError(res, 401);

  return send(res, 200, {
    valido: true,
    usuario: { id_usuario: user.uuid, nombre_completo: user.nombre, rut: formatRut(user.rut), correo_electronico: user.email, rol },
  });
}).listen(Number(process.env.PORT ?? 4001), () => console.log(`[mock-auth] listening on :${process.env.PORT ?? 4001}`));
