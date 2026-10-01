import type { RequestHandler } from 'express';
import type { z } from 'zod';
import { AppError, type FieldIssue } from '../errors/app-error.js';

export const toFieldIssues = (error: z.ZodError): FieldIssue[] =>
  error.issues.map((i) => ({ campo: i.path.join('.') || '(body)', mensaje: i.message }));

export function validateBody(schema: z.ZodType): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) throw new AppError(400, 'VALIDATION_ERROR', 'Hay campos inválidos.', toFieldIssues(result.error));
    req.body = result.data;
    next();
  };
}
