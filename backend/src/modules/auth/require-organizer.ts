import type { RequestHandler } from 'express';
import { AppError } from '../../core/errors/app-error.js';
import { readCookie } from '../../core/http/cookies.js';
import type { AuthClient } from './auth.client.js';

export const ORGANIZER_ROLE = 'organizador';
export const STAFF_ROLE = 'staff';

// Valida la sesión contra Auth y exige que el rol vigente esté en la lista. Express 5 propaga los rechazos async.
export function requireRoles(authClient: AuthClient, roles: readonly string[], mensajeRol: string): RequestHandler {
  return async (req, res, next) => {
    const jwt = readCookie(req.headers.cookie, 'jwt');
    if (!jwt) throw new AppError(401, 'SESSION_INVALID', 'Debes iniciar sesión para continuar.');
    const user = await authClient.validateSession(jwt);
    if (!roles.includes(user.rol)) throw new AppError(403, 'FORBIDDEN_ROLE', mensajeRol);
    res.locals.user = user;
    next();
  };
}

// HU-06: toda operación administrativa del panel.
export const requireOrganizer = (authClient: AuthClient): RequestHandler =>
  requireRoles(authClient, [ORGANIZER_ROLE], 'Acceso restringido: sólo los organizadores pueden usar el panel.');
