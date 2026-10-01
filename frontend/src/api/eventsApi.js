/**
 * Acceso a eventos. La UI sólo importa desde aquí. Rutas según docs/api/openapi.yaml.
 */
import { request } from "./httpClient.js";

/** HU-05 + HU-06: lista del organizador; un 401/403 aquí define el estado de sesión. */
export function obtenerMisEventos(signal) {
  return request("/eventos/mios", { signal });
}

/** HU-05: detalle de un evento propio (403 EVENT_NOT_OWNED si es de otro organizador). */
export function obtenerEvento(idEvento, signal) {
  return request(`/eventos/mios/${idEvento}`, { signal });
}

/** HU-01: crear evento (nace en BORRADOR). */
export function crearEvento(datosEvento) {
  return request("/eventos", { method: "POST", body: datosEvento });
}

// Sprint 2/3: rutas definidas en el Swagger, aún no implementadas en el backend.
export function editarEvento(idEvento, cambios) {
  return request(`/eventos/mios/${idEvento}`, { method: "PATCH", body: cambios });
}
export function publicarEvento(idEvento) {
  return request(`/eventos/mios/${idEvento}/publicar`, { method: "POST" });
}
export function eliminarEvento(idEvento) {
  return request(`/eventos/mios/${idEvento}`, { method: "DELETE" });
}
