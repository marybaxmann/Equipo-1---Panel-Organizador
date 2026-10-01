import "./BadgeEstado.css";

const ETIQUETAS = {
  BORRADOR: "Borrador",
  PUBLICADO: "Publicado",
  FINALIZADO: "Finalizado",
  CANCELADO: "Cancelado",
};

/** Badge de estado_gestion del evento. Colores según Checklist_Consistencia_Visual (fila 30). */
export default function BadgeEstado({ estado }) {
  const clase = `badge-estado badge-estado--${estado?.toLowerCase() || "desconocido"}`;
  return <span className={clase}>{ETIQUETAS[estado] || estado}</span>;
}
