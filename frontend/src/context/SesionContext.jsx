/**
 * HU-06 — Verificación de autorización del organizador.
 *
 * Según docs/CONTRATO_PANEL_AUTH.md, el Frontend nunca valida el JWT localmente:
 * solo intenta la operación protegida y reacciona al resultado.
 * Por eso, aquí "verificar sesión" = intentar cargar "mis eventos" (GET /events/mine)
 * y reaccionar según la respuesta:
 *   200        -> hay sesión válida y rol organizador; guardamos usuario + eventos
 *   401        -> sesión no válida / expirada -> a la pantalla de "inicia sesión"
 *   403        -> autenticado pero sin rol organizador -> "sin autorización"
 *   otro/red   -> error genérico (Fail-Secure: se trata como no autorizado)
 */
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { obtenerMisEventos } from "../api/eventsApi.js";
import { ApiError } from "../api/httpClient.js";

const SesionContext = createContext(null);

const ESTADO = {
  CARGANDO: "cargando",
  AUTORIZADO: "autorizado",
  NO_AUTENTICADO: "no_autenticado",
  SIN_PERMISO: "sin_permiso",
  ERROR: "error",
};

export function SesionProvider({ children }) {
  const [estado, setEstado] = useState(ESTADO.CARGANDO);
  const [usuario, setUsuario] = useState(null);
  const [eventos, setEventos] = useState([]);
  const [mensajeError, setMensajeError] = useState("");

  const verificarSesion = useCallback(async (signal) => {
    setEstado(ESTADO.CARGANDO);
    try {
      const data = await obtenerMisEventos(signal);
      setUsuario(data.usuario ?? null);
      setEventos(Array.isArray(data.eventos) ? data.eventos : []);
      setEstado(ESTADO.AUTORIZADO);
    } catch (err) {
      if (err?.name === "AbortError") return;
      if (err instanceof ApiError && err.status === 401) {
        setEstado(ESTADO.NO_AUTENTICADO);
      } else if (err instanceof ApiError && err.status === 403) {
        setEstado(ESTADO.SIN_PERMISO);
      } else {
        setMensajeError(err?.message || "Ocurrió un error inesperado.");
        setEstado(ESTADO.ERROR);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    verificarSesion(controller.signal);
    return () => controller.abort();
  }, [verificarSesion]);

  /** Los eventos se actualizan optimistamente tras crear/editar/publicar/eliminar,
   *  sin tener que re-pedir la lista completa al backend. */
  const actualizarEventoLocal = useCallback((eventoActualizado) => {
    setEventos((prev) => {
      const existe = prev.some((e) => e.id_evento === eventoActualizado.id_evento);
      if (existe) {
        return prev.map((e) =>
          e.id_evento === eventoActualizado.id_evento ? eventoActualizado : e
        );
      }
      return [eventoActualizado, ...prev];
    });
  }, []);

  const quitarEventoLocal = useCallback((idEvento) => {
    setEventos((prev) => prev.filter((e) => e.id_evento !== idEvento));
  }, []);

  const value = {
    estado,
    ESTADO,
    usuario,
    eventos,
    mensajeError,
    reintentar: () => verificarSesion(),
    actualizarEventoLocal,
    quitarEventoLocal,
  };

  return <SesionContext.Provider value={value}>{children}</SesionContext.Provider>;
}

export function useSesion() {
  const ctx = useContext(SesionContext);
  if (!ctx) throw new Error("useSesion debe usarse dentro de <SesionProvider>");
  return ctx;
}
