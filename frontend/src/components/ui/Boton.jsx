import "./Boton.css";

/**
 * Botón base reutilizable.
 * variante: "primario" | "secundario" | "peligro"
 */
export default function Boton({ variante = "primario", type = "button", children, ...props }) {
  return (
    <button type={type} className={`boton boton--${variante}`} {...props}>
      {children}
    </button>
  );
}
