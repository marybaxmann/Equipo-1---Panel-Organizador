import "./FiltrosEventos.css";

const OPCIONES = [
  { valor: "TODOS", etiqueta: "Todos" },
  { valor: "BORRADOR", etiqueta: "Borrador" },
  { valor: "PUBLICADO", etiqueta: "Publicado" },
  { valor: "FINALIZADO", etiqueta: "Finalizado" },
  { valor: "CANCELADO", etiqueta: "Cancelado" },
];

export default function FiltrosEventos({ eventos, filtroActivo, onCambiarFiltro, busqueda, onCambiarBusqueda }) {
  const contarPorEstado = (estado) =>
    estado === "TODOS" ? eventos.length : eventos.filter((e) => e.estado_gestion === estado).length;

  return (
    <div className="filtros-eventos">
      <div className="filtros-eventos__pills" role="tablist" aria-label="Filtrar por estado">
        {OPCIONES.map((op) => (
          <button
            key={op.valor}
            role="tab"
            aria-selected={filtroActivo === op.valor}
            className={"pill" + (filtroActivo === op.valor ? " pill--activo" : "")}
            onClick={() => onCambiarFiltro(op.valor)}
          >
            {op.etiqueta} <span className="pill__contador">{contarPorEstado(op.valor)}</span>
          </button>
        ))}
      </div>

      <label className="buscador">
        <span className="visually-hidden">Buscar evento</span>
        <input
          type="search"
          placeholder="Buscar evento..."
          value={busqueda}
          onChange={(e) => onCambiarBusqueda(e.target.value)}
        />
      </label>
    </div>
  );
}
