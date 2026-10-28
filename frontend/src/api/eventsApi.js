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

/** HU-02: editar evento propio en BORRADOR o PUBLICADO (Sprint 2). */
export function editarEvento(idEvento, cambios) {
  return request(`/eventos/mios/${idEvento}`, { method: "PATCH", body: cambios });
}

/** HU-04: publicar evento propio en BORRADOR (Sprint 1). */
export function publicarEvento(idEvento) {
  return request(`/eventos/mios/${idEvento}/publicar`, { method: "POST" });
}

/** HU-03: eliminar evento (Sprint 3). */
export function eliminarEvento(idEvento) {
  return request(`/eventos/mios/${idEvento}`, { method: "DELETE" });
}
