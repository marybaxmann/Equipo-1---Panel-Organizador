import "./CampoFormulario.css";

/**
 * Campo de formulario con label, input/textarea/select y mensaje de error.
 * Cubre UI2 (info necesaria para la tarea: validaciones y mensajes) del checklist.
 */
export default function CampoFormulario({
  etiqueta,
  nombre,
  error,
  ayuda,
  as = "input",
  children,
  ...props
}) {
  const Componente = as;
  return (
    <div className="campo-formulario">
      <label htmlFor={nombre}>{etiqueta}</label>
      {as === "select" ? (
        <select id={nombre} name={nombre} className={error ? "con-error" : ""} {...props}>
          {children}
        </select>
      ) : (
        <Componente
          id={nombre}
          name={nombre}
          className={error ? "con-error" : ""}
          aria-invalid={!!error}
          aria-describedby={error ? `${nombre}-error` : undefined}
          {...props}
        />
      )}
      {ayuda && !error && <p className="campo-ayuda">{ayuda}</p>}
      {error && (
        <p className="campo-error" id={`${nombre}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}
