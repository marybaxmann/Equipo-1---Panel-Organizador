import { useNavigate } from "react-router-dom";
import { crearEvento } from "../api/eventsApi.js";
import { useSesion } from "../context/SesionContext.jsx";
import PestanasPantalla from "../components/events/PestanasPantalla.jsx";
import FormularioEvento from "../components/events/FormularioEvento.jsx";
import "./NuevoEventoPage.css";

export default function NuevoEventoPage() {
  const { actualizarEventoLocal } = useSesion();
  const navigate = useNavigate();

  async function guardarNuevoEvento(payload) {
    const nuevoEvento = await crearEvento(payload);
    actualizarEventoLocal(nuevoEvento);
    navigate("/mis-eventos", { state: { aviso: `Evento "${nuevoEvento.nombre_evento}" creado como Borrador.` } });
  }

  return (
    <div className="nuevo-evento-page">
      <PestanasPantalla activa="crear" />
      <div className="nuevo-evento-page__encabezado">
        <h1>Nuevo evento</h1>
        <span className="etiqueta-borrador">Se guarda como borrador</span>
      </div>
      <p className="descripcion">
        Completa los datos principales. Podrás publicarlo desde “Mis eventos” cuando esté listo.
      </p>

      <FormularioEvento
        modo="crear"
        textoBoton="Guardar evento"
        onGuardar={guardarNuevoEvento}
        onCancelar={() => navigate("/mis-eventos")}
      />
    </div>
  );
}
