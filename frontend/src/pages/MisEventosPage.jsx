import { useMemo, useState } from "react";
import { eliminarEvento, publicarEvento } from "../api/eventsApi.js";
import Modal from "../components/ui/Modal.jsx";
import { useNavigate, useLocation } from "react-router-dom";
import { useSesion } from "../context/SesionContext.jsx";
import PestanasPantalla from "../components/events/PestanasPantalla.jsx";
import FiltrosEventos from "../components/events/FiltrosEventos.jsx";
import TarjetaEvento from "../components/events/TarjetaEvento.jsx";
import Boton from "../components/ui/Boton.jsx";
import "./MisEventosPage.css";

/** HU-05 — Ver mis eventos. */
export default function MisEventosPage() {
  const { eventos, actualizarEventoLocal, quitarEventoLocal } = useSesion();
  const navigate = useNavigate();
  const location = useLocation();
  const [filtro, setFiltro] = useState("TODOS");
  const [busqueda, setBusqueda] = useState("");
  // modal: { tipo: "publicar" | "eliminar" | "sprint", evento, mensaje } · aviso: confirmación tras publicar o eliminar
  const [modal, setModal] = useState(null);
  const [aviso, setAviso] = useState(location.state?.aviso ?? "");
  const [publicando, setPublicando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [errorModal, setErrorModal] = useState("");

  const cerrarModal = () => { setModal(null); setErrorModal(""); };

  async function confirmarEliminar() {
    setEliminando(true);
    setErrorModal("");
    try {
      const res = await eliminarEvento(modal.evento.id_evento);
      if (res?.resultado === "CANCELADO") {
        actualizarEventoLocal(res.evento);
        setAviso(`El evento "${modal.evento.nombre_evento}" tiene entradas vendidas, así que se canceló en vez de eliminarse.`);
      } else {
        quitarEventoLocal(modal.evento.id_evento);
        setAviso(`Evento "${modal.evento.nombre_evento}" eliminado.`);
      }
      setModal(null);
    } catch (err) {
      if (err?.codigo === "ENTRADAS_UNAVAILABLE" || err?.status === 503) {
        setErrorModal("No se pudo consultar el stock. El evento no se eliminó; intenta más tarde.");
      } else if (err?.codigo === "EVENT_NOT_OWNED" || err?.status === 403) {
        setErrorModal("No tienes permiso sobre este evento.");
      } else if (err?.status === 401) {
        setErrorModal("Tu sesión no es válida o expiró.");
      } else {
        setErrorModal(err?.message || "No se pudo eliminar el evento.");
      }
    } finally {
      setEliminando(false);
    }
  }

  async function confirmarPublicar() {
    setPublicando(true);
    setErrorModal("");
    try {
      const publicado = await publicarEvento(modal.evento.id_evento);
      actualizarEventoLocal({ ...modal.evento, ...publicado });
      setAviso(`Evento "${publicado.nombre_evento}" publicado. Ya es visible en el catálogo público.`);
      setModal(null);
    } catch (err) {
      setErrorModal(err.message || "No se pudo publicar el evento.");
    } finally {
      setPublicando(false);
    }
  }

  const eventosFiltrados = useMemo(() => {
    return eventos.filter((e) => {
      const coincideEstado = filtro === "TODOS" || e.estado_gestion === filtro;
      const coincideBusqueda = e.nombre_evento?.toLowerCase().includes(busqueda.toLowerCase());
      return coincideEstado && coincideBusqueda;
    });
  }, [eventos, filtro, busqueda]);

  return (
    <div className="mis-eventos-page">
      {aviso && (
        <div role="status" style={{ backgroundColor: "var(--color-success-bg)", color: "var(--color-success-text)", padding: "var(--space-3)", borderRadius: "var(--radius-control)", marginBottom: "var(--space-3)" }}>
          {aviso}
        </div>
      )}

      <div className="mis-eventos-page__encabezado">
        <div>
          <h1>Mis eventos</h1>
          <p className="descripcion">
            Crea y publica los eventos de tu cartelera. Los cambios se reflejan en el catálogo público.
          </p>
        </div>
        <Boton variante="primario" onClick={() => navigate("/mis-eventos/nuevo")}>
          + Nuevo evento
        </Boton>
      </div>

      <PestanasPantalla activa="listado" />

      <FiltrosEventos
        eventos={eventos}
        filtroActivo={filtro}
        onCambiarFiltro={setFiltro}
        busqueda={busqueda}
        onCambiarBusqueda={setBusqueda}
        enfocarBuscador={location.state?.enfocarBuscador}
      />

      {eventosFiltrados.length === 0 ? (
        <div className="mis-eventos-page__vacio">
          <p>No hay eventos que coincidan con este filtro.</p>
        </div>
      ) : (
        <div className="mis-eventos-page__lista">
          {eventosFiltrados.map((evento) => (
            <TarjetaEvento
              key={evento.id_evento}
              evento={evento}
              onPublicar={(e) => setModal({ tipo: "publicar", evento: e })}
              onEditar={(e) => navigate(`/mis-eventos/${e.id_evento}/editar`)}
              onEliminar={(e) => setModal({ tipo: "eliminar", evento: e })}
            />
          ))}
        </div>
      )}

      {modal?.tipo === "publicar" && (
        <Modal
          titulo="¿Publicar este evento?"
          onCerrar={cerrarModal}
          acciones={<>
            <Boton variante="secundario" onClick={cerrarModal} disabled={publicando}>Cancelar</Boton>
            <Boton variante="primario" onClick={confirmarPublicar} disabled={publicando}>{publicando ? "Publicando..." : "Publicar"}</Boton>
          </>}
        >
          {/* Texto exacto acordado en el checklist visual (fila 33) */}
          <p>¿Publicar este evento? Será visible en el catálogo público.</p>
          <p><strong>{modal.evento.nombre_evento}</strong></p>
          {errorModal && <p style={{ color: "var(--color-danger-text)" }}>{errorModal}</p>}
        </Modal>
      )}

      {modal?.tipo === "eliminar" && (
        <Modal
          titulo={`¿Eliminar «${modal.evento.nombre_evento}»?`}
          onCerrar={cerrarModal}
          acciones={<>
            <Boton variante="secundario" onClick={cerrarModal} disabled={eliminando}>Cancelar</Boton>
            <Boton variante="peligro" onClick={confirmarEliminar} disabled={eliminando}>{eliminando ? "Eliminando..." : "Eliminar"}</Boton>
          </>}
        >
          <p>Si es un borrador o no tiene entradas vendidas, se elimina. Si ya vendió entradas, se cancela y se avisa a los compradores.</p>
          {errorModal && <p style={{ color: "var(--color-danger-text)" }}>{errorModal}</p>}
        </Modal>
      )}

      {modal?.tipo === "sprint" && (
        <Modal
          titulo="Disponible en un próximo sprint"
          onCerrar={cerrarModal}
          acciones={<Boton variante="primario" onClick={cerrarModal}>Entendido</Boton>}
        >
          <p>{modal.mensaje}</p>
        </Modal>
      )}
    </div>
  );
}
