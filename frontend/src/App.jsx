import { Routes, Route, Navigate } from "react-router-dom";
import { SesionProvider, useSesion } from "./context/SesionContext.jsx";
import Layout from "./components/layout/Layout.jsx";
import PantallaEstado from "./components/layout/PantallaEstado.jsx";
import MisEventosPage from "./pages/MisEventosPage.jsx";
import NuevoEventoPage from "./pages/NuevoEventoPage.jsx";
import EventoDetallePage from "./pages/EventoDetallePage.jsx";
import LoginSimuladoPage from "./pages/LoginSimuladoPage.jsx";
import { AUTH_LOGIN_URL } from "./api/httpClient.js";

/** HU-06 — Puerta de acceso: mientras no haya sesión autorizada, no se muestra el panel. */
function ContenidoProtegido() {
  const { estado, ESTADO, mensajeError, reintentar } = useSesion();

  if (estado === ESTADO.CARGANDO) return <PantallaEstado tipo="cargando" />;
  if (estado === ESTADO.NO_AUTENTICADO)
    return <PantallaEstado tipo="no_autenticado" urlLogin={AUTH_LOGIN_URL} />;
  if (estado === ESTADO.SIN_PERMISO) return <PantallaEstado tipo="sin_permiso" />;
  if (estado === ESTADO.ERROR)
    return <PantallaEstado tipo="error" mensaje={mensajeError} onReintentar={reintentar} />;

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/mis-eventos" replace />} />
        <Route path="/mis-eventos" element={<MisEventosPage />} />
        <Route path="/mis-eventos/nuevo" element={<NuevoEventoPage />} />
        <Route path="/mis-eventos/:idEvento" element={<EventoDetallePage />} />
        <Route path="*" element={<Navigate to="/mis-eventos" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginSimuladoPage />} />
      <Route path="*" element={<SesionProvider><ContenidoProtegido /></SesionProvider>} />
    </Routes>
  );
}
