import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { obtenerEvento, publicarEvento } from "../api/eventsApi.js";
import { ApiError } from "../api/httpClient.js";
import { useSesion } from "../context/SesionContext.jsx";
import Boton from "../components/ui/Boton.jsx";
import BadgeEstado from "../components/ui/BadgeEstado.jsx";
import Modal from "../components/ui/Modal.jsx";

export default function EventoDetallePage() {
  const { idEvento } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { actualizarEventoLocal } = useSesion();

  const [evento, setEvento] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(location.state?.aviso ?? "");

  const [modalPublicar, setModalPublicar] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [errorModal, setErrorModal] = useState("");

  useEffect(() => {
    const abortCtrl = new AbortController();
    const fetchDetalle = async () => {
      try {
        setLoading(true);
        if (!idEvento) return;
        const data = await obtenerEvento(idEvento, abortCtrl.signal);
        setEvento(data);
      } catch (err) {
        if (err.name === "AbortError") return;
        if (err instanceof ApiError) {
          if (err.codigo === "EVENT_NOT_OWNED") {
            setError({ type: "403", msg: "Este evento no te pertenece." });
          } else if (err.status === 404) {
            setError({ type: "404", msg: "Evento no encontrado." });
          } else {
            setError({ type: "generic", msg: err.message });
          }
        } else {
          setError({ type: "generic", msg: "Error al cargar el evento." });
        }
      } finally {
        setLoading(false);
      }
    };
    fetchDetalle();
    return () => abortCtrl.abort();
  }, [idEvento]);

  async function confirmarPublicar() {
    setPublicando(true);
    setErrorModal("");
    try {
      const publicado = await publicarEvento(evento.id_evento);
      setEvento((prev) => ({ ...prev, ...publicado }));
      actualizarEventoLocal({ ...evento, ...publicado });
      setAviso(`Evento "${publicado.nombre_evento}" publicado. Ya es visible en el catálogo público.`);
      setModalPublicar(false);
    } catch (err) {
      setErrorModal(err.message || "No se pudo publicar el evento.");
    } finally {
      setPublicando(false);
    }
  }

  if (loading) return <div style={{ padding: "var(--space-5)", textAlign: "center", color: "var(--color-text-secondary)" }}>Cargando evento...</div>;
  if (error) {
    return (
      <div style={{ padding: "var(--space-5)", textAlign: "center" }}>
        <h2>Error {error.type === "403" ? "403" : error.type === "404" ? "404" : ""}</h2>
        <div style={{ color: "var(--color-danger-text)", marginBottom: "var(--space-4)" }}>{error.msg}</div>
        <Boton variante="primario" onClick={() => navigate("/mis-eventos")}>Volver a Mis eventos</Boton>
      </div>
    );
  }
  if (!evento) return null;

  const esBorrador = evento.estado_gestion === "BORRADOR";

  return (
    <div style={{ padding: "var(--space-5)", maxWidth: "900px", margin: "0 auto", fontFamily: "var(--font-body)" }}>
      {aviso && (
        <div role="status" style={{ backgroundColor: "var(--color-success-bg)", color: "var(--color-success-text)", padding: "var(--space-3)", borderRadius: "var(--radius-control)", marginBottom: "var(--space-4)" }}>
          {aviso}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)", flexWrap: "wrap", gap: "var(--space-3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <Boton variante="secundario" onClick={() => navigate("/mis-eventos")}>← Volver</Boton>
          <h2 style={{ margin: 0, fontFamily: "var(--font-display)", color: "var(--color-text-primary)" }}>{evento.nombre_evento}</h2>
          <BadgeEstado estado={evento.estado_gestion} />
        </div>
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          <Boton
            variante="secundario"
            onClick={() => navigate(`/mis-eventos/${evento.id_evento}/editar`)}
          >
            Editar
          </Boton>
          <Boton
            variante="primario"
            disabled={!esBorrador}
            title={esBorrador ? "Publicar evento" : "Sólo un evento en Borrador puede publicarse"}
            onClick={() => setModalPublicar(true)}
          >
            Publicar
          </Boton>
          <Boton variante="peligro" disabled title="Disponible en Sprint 3 (HU-03)">
            Eliminar
          </Boton>
        </div>
      </div>

      <div style={{ background: "var(--color-surface)", padding: "var(--space-4)", borderRadius: "var(--radius-card)", border: "var(--border-standard)", boxShadow: "var(--shadow-card)" }}>
        <h3 style={{ marginTop: 0, fontFamily: "var(--font-display)", color: "var(--color-text-primary)" }}>Detalles del evento</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--space-3)" }}>
          <div>
            <p><strong>Descripción:</strong> {evento.descripcion}</p>
            <p><strong>Ubicación:</strong> {evento.direccion_evento}</p>
            <p><strong>Fecha:</strong> {evento.fecha_evento}</p>
            <p><strong>Hora:</strong> {evento.hora_evento} {evento.hora_fin_evento ? `- ${evento.hora_fin_evento}` : ""}</p>
            <p><strong>Categoría:</strong> {evento.categoria || "Sin categoría"}</p>
          </div>
          <div>
            <p><strong>ID Evento:</strong> {evento.id_evento}</p>
            <p><strong>Tipo entrada:</strong> {evento.tipo_entrada || "-"}</p>
            {evento.tipo_entrada === "PAGADA" && <p><strong>Precio:</strong> ${evento.precio}</p>}
            <p><strong>Cantidad de entradas:</strong> {evento.cantidad_entradas ?? "-"}</p>
            <p><strong>Creado el:</strong> {new Date(evento.fecha_creacion).toLocaleString()}</p>
            <p><strong>Actualizado el:</strong> {new Date(evento.fecha_actualizacion).toLocaleString()}</p>
          </div>
        </div>
        {evento.imagen && (
          <div style={{ marginTop: "var(--space-3)" }}>
            <p><strong>Imagen:</strong></p>
            <img src={evento.imagen} alt="Imagen del evento" style={{ maxWidth: "100%", maxHeight: "300px", borderRadius: "var(--radius-control)" }} />
          </div>
        )}
      </div>

      {modalPublicar && (
        <Modal
          titulo="¿Publicar este evento?"
          onCerrar={() => { setModalPublicar(false); setErrorModal(""); }}
          acciones={
            <>
              <Boton variante="secundario" onClick={() => { setModalPublicar(false); setErrorModal(""); }} disabled={publicando}>
                Cancelar
              </Boton>
              <Boton variante="primario" onClick={confirmarPublicar} disabled={publicando}>
                {publicando ? "Publicando..." : "Publicar"}
              </Boton>
            </>
          }
        >
          {/* Texto exacto acordado en el checklist visual (fila 33) */}
          <p>¿Publicar este evento? Será visible en el catálogo público.</p>
          <p><strong>{evento.nombre_evento}</strong></p>
          {errorModal && <p style={{ color: "var(--color-danger-text)" }}>{errorModal}</p>}
        </Modal>
      )}
    </div>
  );
}
