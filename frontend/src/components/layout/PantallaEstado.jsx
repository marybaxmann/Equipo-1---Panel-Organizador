import "./PantallaEstado.css";
import Boton from "../ui/Boton.jsx";

/**
 * Pantallas de estado a pantalla completa para HU-06:
 * cargando / no autenticado / sin permiso / error.
 * El copy sigue la guía "errores no se disculpan, dicen qué pasó y cómo seguir".
 */
export default function PantallaEstado({ tipo, mensaje, onReintentar, urlLogin }) {
  if (tipo === "cargando") {
    return (
      <div className="pantalla-estado">
        <div className="pantalla-estado__spinner" aria-hidden="true" />
        <p>Verificando tu sesión…</p>
      </div>
    );
  }

  if (tipo === "no_autenticado") {
    return (
      <div className="pantalla-estado">
        <h2>Inicia sesión para continuar</h2>
        <p>Tu sesión no es válida o expiró. Debes iniciar sesión para ver tus eventos.</p>
        <a href={urlLogin}>
          <Boton variante="primario">Ir a iniciar sesión</Boton>
        </a>
      </div>
    );
  }

  if (tipo === "sin_permiso") {
    return (
      <div className="pantalla-estado">
        <h2>No tienes permisos de organizador</h2>
        <p>Esta sección es exclusiva para cuentas con rol organizador.</p>
      </div>
    );
  }

  return (
    <div className="pantalla-estado">
      <h2>No se pudo cargar la información</h2>
      <p>{mensaje || "Ocurrió un error inesperado."}</p>
      {onReintentar && (
        <Boton variante="secundario" onClick={onReintentar}>
          Reintentar
        </Boton>
      )}
    </div>
  );
}
