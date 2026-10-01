export type FieldIssue = { campo: string; mensaje: string };

// Error de dominio/HTTP. El error-handler lo traduce al formato { error: { codigo, mensaje, detalles } }.
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: FieldIssue[],
  ) {
    super(message);
  }
}
