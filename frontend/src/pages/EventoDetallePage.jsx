import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { obtenerEvento } from "../api/eventsApi.js";
import { ApiError } from "../api/httpClient.js";
import Boton from "../components/ui/Boton.jsx";
import BadgeEstado from "../components/ui/BadgeEstado.jsx";

export default function EventoDetallePage() {
  const { idEvento } = useParams();
  const navigate = useNavigate();
  const [evento, setEvento] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  if (loading) return <div style={{ padding: "40px", textAlign: "center" }}>Cargando evento...</div>;
  if (error) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <h2>Error {error.type === "403" ? "403" : error.type === "404" ? "404" : ""}</h2>
        <div style={{ color: "var(--color-danger-text)", marginBottom: "20px" }}>{error.msg}</div>
        <Boton variante="primario" onClick={() => navigate("/mis-eventos")}>Volver a Mis eventos</Boton>
      </div>
    );
  }
  if (!evento) return null;

  return (
    <div style={{ padding: "32px", maxWidth: "900px", margin: "0 auto", fontFamily: "var(--font-body)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <Boton variante="secundario" onClick={() => navigate("/mis-eventos")}>← Volver</Boton>
          <h2 style={{ margin: 0, fontFamily: "var(--font-display)", color: "var(--color-text-primary)" }}>{evento.nombre_evento}</h2>
          <BadgeEstado estado={evento.estado_gestion} />
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <Boton variante="secundario" disabled title="Disponible en Sprint 2/3">Editar</Boton>
          <Boton variante="primario" disabled title="Disponible en Sprint 2/3">Publicar</Boton>
          <Boton variante="peligro" disabled title="Disponible en Sprint 2/3">Eliminar</Boton>
        </div>
      </div>

      <div style={{ background: "var(--color-surface)", padding: "var(--space-4)", border: "var(--border-standard)", borderRadius: "var(--radius-card)", boxShadow: "var(--shadow-card)" }}>
        <h3 style={{ marginTop: 0, fontFamily: "var(--font-display)", color: "var(--color-text-primary)" }}>Detalles del evento</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
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
            <p><strong>Cantidad de entradas:</strong> {evento.cantidad_entradas || "-"}</p>
            <p><strong>Creado el:</strong> {new Date(evento.fecha_creacion).toLocaleString()}</p>
            <p><strong>Actualizado el:</strong> {new Date(evento.fecha_actualizacion).toLocaleString()}</p>
          </div>
        </div>
        {evento.imagen && (
          <div style={{ marginTop: "16px" }}>
            <p><strong>Imagen:</strong></p>
            <img src={evento.imagen} alt="Imagen del evento" style={{ maxWidth: "100%", maxHeight: "300px", borderRadius: "4px" }} />
          </div>
        )}
      </div>
    </div>
  );
}
