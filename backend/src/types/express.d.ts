import type { AuthUser } from '../modules/auth/auth.client.js';

declare global {
  namespace Express {
    interface Locals {
      user: AuthUser;
    }
  }
}

export {};
