import { AppError } from '../../src/core/errors/app-error.js';
import type { AuthClient, AuthUser } from '../../src/modules/auth/auth.client.js';

export const ORG_A: AuthUser = { id_usuario: '3f1e2c1a-4b8d-4a2e-9c3f-7d1e2f9b2d4a', rol: 'organizador' };
export const ORG_B: AuthUser = { id_usuario: '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d', rol: 'organizador' };
export const ATTENDEE: AuthUser = { id_usuario: '5b5b5b5b-1111-4222-8333-444455556666', rol: 'asistente' };
export const STAFF: AuthUser = { id_usuario: '7c7c7c7c-2222-4333-8444-555566667777', rol: 'staff' };

// Mismo mapa de tokens que tools/mock-auth para que tests y demo hablen igual
export class FakeAuthClient implements AuthClient {
  calls: string[] = [];
  unavailable = false;
  async validateSession(jwt: string): Promise<AuthUser> {
    this.calls.push(jwt);
    if (this.unavailable) throw new AppError(503, 'AUTH_UNAVAILABLE', 'Auth no disponible');
    const user = { 'token-org-a': ORG_A, 'token-org-b': ORG_B, 'token-asistente': ATTENDEE, 'token-staff': STAFF }[jwt];
    if (!user) throw new AppError(401, 'SESSION_INVALID', 'Sesión inválida');
    return user;
  }
}
