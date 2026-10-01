import type { ErrorRequestHandler } from 'express';
import { AppError } from '../errors/app-error.js';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: { codigo: err.code, mensaje: err.message, ...(err.details && { detalles: err.details }) } });
    return;
  }
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: { codigo: 'INVALID_JSON', mensaje: 'El cuerpo de la solicitud no es JSON válido.' } });
    return;
  }
  console.error('[error]', err);
  res.status(500).json({ error: { codigo: 'INTERNAL_ERROR', mensaje: 'Error interno del servidor.' } });
};
