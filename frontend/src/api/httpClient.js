/**
 * Cliente HTTP central de la app.
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1/panel";
export const AUTH_LOGIN_URL = import.meta.env.VITE_AUTH_LOGIN_URL || "/login";

export class ApiError extends Error {
  constructor(status, message, detalles = [], codigo = "") {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detalles = detalles; // [{ campo, mensaje }] para mostrar bajo cada input
    this.codigo = codigo;     // p. ej. EVENT_NOT_OWNED, FORBIDDEN_ROLE, AUTH_UNAVAILABLE
  }
}

export async function request(path, { method = "GET", body, signal } = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      credentials: "include", // envía la cookie jwt=...
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (networkError) {
    throw new ApiError(503, "No se pudo contactar al servidor. Intenta nuevamente en unos segundos.");
  }

  let payload = null;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    // Formato de error del backend: { error: { codigo, mensaje, detalles } } (docs/api/openapi.yaml)
    const apiError = payload && typeof payload === "object" ? payload.error : null;
    throw new ApiError(
      response.status,
      apiError?.mensaje || defaultMessageForStatus(response.status),
      apiError?.detalles ?? [],
      apiError?.codigo ?? "",
    );
  }

  return payload;
}

function defaultMessageForStatus(status) {
  switch (status) {
    case 401:
      return "Tu sesión no es válida o expiró.";
    case 403:
      return "No tienes permisos para realizar esta acción.";
    case 500:
      return "Ocurrió un error inesperado en el servidor.";
    case 503:
      return "El servicio no está disponible en este momento.";
    default:
      return "Ocurrió un error al comunicarse con el servidor.";
  }
}
