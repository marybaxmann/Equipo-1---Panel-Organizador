import { useNavigate } from "react-router-dom";
import { MapPin, Pencil, Check, Trash2 } from "lucide-react";
import BadgeEstado from "../ui/BadgeEstado.jsx";
import "./TarjetaEvento.css";

const MESES = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

function formatearFecha(fechaISO) {
  if (!fechaISO) return { mes: "—", dia: "—" };
  const [anio, mes, dia] = fechaISO.split("-").map(Number);
  return { mes: MESES[(mes || 1) - 1], dia: String(dia || "—").padStart(2, "0") };
}

export default function TarjetaEvento({ evento, onPublicar, onEditar, onEliminar }) {
  const navigate = useNavigate();
  const { mes, dia } = formatearFecha(evento.fecha_evento);
  const estadoClase = evento.estado_gestion?.toLowerCase();
  const esBorrador = evento.estado_gestion === "BORRADOR";
  // Los botones no deben abrir el detalle al hacer clic
  const accion = (fn) => (e) => { e.stopPropagation(); fn?.(evento); };

  const manejarClickTarjeta = () => {
    navigate(`/mis-eventos/${evento.id_evento}`);
  };

  const manejarTeclaTarjeta = (e) => {
    if (e.key === "Enter") manejarClickTarjeta();
  };

  return (
    <div
      className={`tarjeta-evento tarjeta-evento--${estadoClase}`}
      onClick={manejarClickTarjeta}
      onKeyDown={manejarTeclaTarjeta}
      role="link"
      tabIndex={0}
      style={{ cursor: "pointer" }}
    >
      <div className="tarjeta-evento__fecha">
        <span className="mes">{mes}</span>
        <span className="dia">{dia}</span>
        <span className="hora">{evento.hora_evento || "—"}</span>
      </div>

      <div className="tarjeta-evento__cuerpo">
        <div className="tarjeta-evento__info">
          <h3>{evento.nombre_evento}</h3>
          <div className="tarjeta-evento__meta">
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <MapPin size={20} strokeWidth={2} /> {evento.direccion_evento}
            </span>
          </div>
        </div>

        <BadgeEstado estado={evento.estado_gestion} />

        <div className="tarjeta-evento__acciones">
          <button
            className="accion"
            title="Editar (Sprint 2 — HU-02)"
            aria-label="Editar"
            onClick={accion(onEditar)}
          >
            <Pencil size={20} strokeWidth={2} />
          </button>
          <button
            className="accion accion--success"
            title={esBorrador ? "Publicar evento" : "Sólo un evento en Borrador puede publicarse"}
            aria-label="Publicar"
            disabled={!esBorrador}
            onClick={accion(onPublicar)}
          >
            <Check size={20} strokeWidth={2} />
          </button>
          <button
            className="accion accion--danger"
            title="Eliminar evento (Sprint 3 — HU-03)"
            aria-label="Eliminar"
            onClick={accion(onEliminar)}
          >
            <Trash2 size={20} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
