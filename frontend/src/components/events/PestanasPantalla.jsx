import { useNavigate } from "react-router-dom";
import "./PestanasPantalla.css";

/**
 * Pestañas "01 · Listado / 02 · Crear-Editar / 03 · Eliminar" del mockup del equipo.
 *
 * En la app real solo "Listado" y "Crear/Editar" son pantallas propias
 * (rutas /mis-eventos y /mis-eventos/nuevo). "Eliminar" no es una pantalla aparte:
 * se hace por evento, con el ícono de papelera en cada fila + confirmación.
 * Se deja aquí por fidelidad visual con el mockup, mostrando esa aclaración.
 */
export default function PestanasPantalla({ activa }) {
  const navigate = useNavigate();

  return (
    <div className="pestanas-pantalla" role="tablist" aria-label="Secciones de Mis eventos">
      <button
        role="tab"
        aria-selected={activa === "listado"}
        className={"pestana" + (activa === "listado" ? " pestana--activa" : "")}
        onClick={() => navigate("/mis-eventos")}
      >
        01 · Listado
      </button>
      <button
        role="tab"
        aria-selected={activa === "crear"}
        className={"pestana" + (activa === "crear" ? " pestana--activa" : "")}
        onClick={() => navigate("/mis-eventos/nuevo")}
      >
        02 · Crear / Editar
      </button>
      <button
        role="tab"
        aria-selected={false}
        className="pestana"
        title="Se elimina desde cada evento (Sprint 3 · HU-03)"
        disabled
      >
        03 · Eliminar
      </button>
    </div>
  );
}
