import { z } from 'zod';
import { AppError } from '../../core/errors/app-error.js';

export interface AuthUser { id_usuario: string; rol: string }
export interface AuthClient { validateSession(jwt: string): Promise<AuthUser> }

// Contrato Auth ↔ Panel v1.1 §2.2. Sólo se usan id_usuario y rol; el resto de los datos de Auth no se guarda (BD2).
const authResponseSchema = z.object({
  valido: z.boolean(),
  usuario: z.object({ id_usuario: z.string().min(1), rol: z.string().min(1) }).optional(),
});

type Attempt = { kind: 'response'; response: Response } | { kind: 'unavailable' };

const sessionInvalid = () => new AppError(401, 'SESSION_INVALID', 'Sesión inválida o expirada. Inicia sesión nuevamente.');
const authError = () => new AppError(502, 'AUTH_ERROR', 'No se pudo validar la sesión con Auth.');

export function createHttpAuthClient(opts: { baseUrl: string; timeoutMs: number }): AuthClient {
  const url = new URL('/internal/validar-sesion', opts.baseUrl);

  async function attempt(jwt: string): Promise<Attempt> {
    try {
      // La cookie se reenvía tal cual: Panel no decodifica ni valida el JWT (contrato §2.1)
      const response = await fetch(url, { headers: { Cookie: `jwt=${jwt}` }, signal: AbortSignal.timeout(opts.timeoutMs) });
      if (response.status === 503) {
        await response.body?.cancel();
        return { kind: 'unavailable' };
      }
      return { kind: 'response', response };
    } catch {
      return { kind: 'unavailable' }; // timeout, conexión rechazada, DNS
    }
  }

  async function discardAndThrow(response: Response, error: AppError): Promise<never> {
    await response.body?.cancel();
    throw error;
  }

  async function toUser(response: Response): Promise<AuthUser> {
    if (response.status === 401) return discardAndThrow(response, sessionInvalid());
    if (response.status === 403) return discardAndThrow(response, new AppError(403, 'ACCESS_DENIED', 'Auth denegó el acceso.'));
    if (!response.ok) return discardAndThrow(response, authError());
    const parsed = authResponseSchema.safeParse(await response.json().catch(() => null));
    if (!parsed.success) throw authError();
    if (!parsed.data.valido || !parsed.data.usuario) throw sessionInvalid();
    return { id_usuario: parsed.data.usuario.id_usuario, rol: parsed.data.usuario.rol };
  }

  return {
    async validateSession(jwt) {
      let result = await attempt(jwt);
      if (result.kind === 'unavailable') result = await attempt(jwt); // contrato §3.2: máximo 1 reintento
      if (result.kind === 'unavailable') {
        // Fail-secure: si no podemos confirmar la identidad, no se ejecuta la operación
        throw new AppError(503, 'AUTH_UNAVAILABLE', 'El servicio de autenticación no está disponible. Intenta más tarde.');
      }
      return toUser(result.response);
    },
  };
}
