import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { obtenerEvento, editarEvento } from "../api/eventsApi.js";
import { ApiError } from "../api/httpClient.js";
import { useSesion } from "../context/SesionContext.jsx";
import BadgeEstado from "../components/ui/BadgeEstado.jsx";
import Boton from "../components/ui/Boton.jsx";
import FormularioEvento from "../components/events/FormularioEvento.jsx";
import "./EditarEventoPage.css";

export default function EditarEventoPage() {
  const { idEvento } = useParams();
  const navigate = useNavigate();
  const { actualizarEventoLocal } = useSesion();

  const [evento, setEvento] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);

  useEffect(() => {
    const abortCtrl = new AbortController();
    const fetchEvento = async () => {
      try {
        setLoading(true);
        if (!idEvento) return;
        const data = await obtenerEvento(idEvento, abortCtrl.signal);
        setEvento(data);
      } catch (err) {
        if (err.name === "AbortError") return;
        if (err instanceof ApiError) {
          if (err.codigo === "EVENT_NOT_OWNED") {
            setErrorCarga({ type: "403", msg: "Este evento no te pertenece." });
          } else if (err.status === 404) {
            setErrorCarga({ type: "404", msg: "Evento no encontrado." });
          } else {
            setErrorCarga({ type: "generic", msg: err.message });
          }
        } else {
          setErrorCarga({ type: "generic", msg: "Error al cargar el evento." });
        }
      } finally {
        setLoading(false);
      }
    };
    fetchEvento();
    return () => abortCtrl.abort();
  }, [idEvento]);

  if (loading) {
    return (
      <div style={{ padding: "var(--space-5)", textAlign: "center", color: "var(--color-text-secondary)" }}>
        Cargando evento...
      </div>
    );
  }

  if (errorCarga) {
    return (
      <div style={{ padding: "var(--space-5)", textAlign: "center" }}>
        <h2>Error {errorCarga.type === "403" ? "403" : errorCarga.type === "404" ? "404" : ""}</h2>
        <div style={{ color: "var(--color-danger-text)", marginBottom: "var(--space-4)" }}>
          {errorCarga.msg}
        </div>
        <Boton variante="primario" onClick={() => navigate("/mis-eventos")}>
          Volver a Mis eventos
        </Boton>
      </div>
    );
  }

  if (!evento) return null;

  const noEsEditable = evento.estado_gestion === "FINALIZADO" || evento.estado_gestion === "CANCELADO";

  async function guardarCambios(payload) {
    const eventoActualizado = await editarEvento(idEvento, payload);
    actualizarEventoLocal(eventoActualizado);
    navigate(`/mis-eventos/${idEvento}`, {
      state: { aviso: `Evento "${eventoActualizado.nombre_evento}" actualizado con éxito.` },
    });
  }

  return (
    <div className="editar-evento-page">
      <div style={{ marginBottom: "var(--space-3)" }}>
        <Boton variante="secundario" onClick={() => navigate(`/mis-eventos/${idEvento}`)}>
          ← Volver al detalle
        </Boton>
      </div>

      <div className="editar-evento-page__encabezado">
        <h1>Editar evento</h1>
        <BadgeEstado estado={evento.estado_gestion} />
      </div>
      <p className="descripcion">
        Modifica los datos del evento. Los cambios se guardarán manteniendo el estado actual.
      </p>

      <FormularioEvento
        modo="editar"
        eventoInicial={evento}
        textoBoton="Guardar cambios"
        deshabilitado={noEsEditable}
        avisoBloqueo={noEsEditable ? "Sólo un evento en Borrador o Publicado puede editarse." : ""}
        onGuardar={guardarCambios}
        onCancelar={() => navigate(`/mis-eventos/${idEvento}`)}
      />
    </div>
  );
}
