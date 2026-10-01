import { useEffect, useRef } from "react";
import "./Modal.css";

/**
 * Ventana emergente según el checklist visual (fila 19): 480px, overlay negro 40%, fade + scale 150ms.
 * Se cierra con Escape o clic fuera. Reemplaza a window.confirm / window.alert.
 */
export default function Modal({ titulo, children, acciones, onCerrar }) {
  const dialogoRef = useRef(null);

  useEffect(() => {
    dialogoRef.current?.focus();
    const alPresionar = (e) => { if (e.key === "Escape") onCerrar(); };
    document.addEventListener("keydown", alPresionar);
    return () => document.removeEventListener("keydown", alPresionar);
  }, [onCerrar]);

  return (
    <div className="modal__overlay" onClick={onCerrar}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-titulo"
        tabIndex={-1}
        ref={dialogoRef}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="modal-titulo" className="modal__titulo">{titulo}</h2>
        <div className="modal__cuerpo">{children}</div>
        <div className="modal__acciones">{acciones}</div>
      </div>
    </div>
  );
}
