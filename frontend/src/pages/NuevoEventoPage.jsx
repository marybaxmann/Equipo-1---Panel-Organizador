import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { crearEvento } from "../api/eventsApi.js";
import { ApiError } from "../api/httpClient.js";
import { useSesion } from "../context/SesionContext.jsx";
import PestanasPantalla from "../components/events/PestanasPantalla.jsx";
import CampoFormulario from "../components/ui/CampoFormulario.jsx";
import Boton from "../components/ui/Boton.jsx";
import "./NuevoEventoPage.css";

const VALOR_INICIAL = {
  nombre_evento: "",
  descripcion: "",
  fecha_evento: "",
  hora_evento: "",
  hora_fin_evento: "",
  direccion_evento: "",
  categoria: "",
  tipo_entrada: "GRATUITA",
  precio: "",
};

export default function NuevoEventoPage() {
  const [form, setForm] = useState(VALOR_INICIAL);
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState("");
  const { actualizarEventoLocal } = useSesion();
  const navigate = useNavigate();

  const [hoy] = useState(() => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date()));

  function actualizarCampo(nombre, valor) {
    setForm((prev) => ({ ...prev, [nombre]: valor }));
    setErrores((prev) => ({ ...prev, [nombre]: undefined }));
  }

  function validar() {
    const nuevosErrores = {};
    if (!form.nombre_evento.trim()) nuevosErrores.nombre_evento = "El nombre del evento es obligatorio.";
    if (!form.descripcion.trim()) nuevosErrores.descripcion = "La descripción es obligatoria.";
    if (!form.fecha_evento) nuevosErrores.fecha_evento = "La fecha es obligatoria.";
    if (!form.hora_evento) nuevosErrores.hora_evento = "La hora es obligatoria.";
    if (!form.direccion_evento.trim()) nuevosErrores.direccion_evento = "La ubicación es obligatoria.";
    if (form.tipo_entrada === "PAGADA" && (!form.precio || Number(form.precio) <= 0)) {
      nuevosErrores.precio = "Ingresa un precio válido para entradas pagadas.";
    }
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  }

  async function manejarEnvio(e) {
    e.preventDefault();
    setErrorGeneral("");
    if (!validar()) return;

    setEnviando(true);
    try {
      const payload = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ""));
      if (payload.tipo_entrada === "GRATUITA") delete payload.precio;
      else payload.precio = Number(payload.precio);
      const nuevoEvento = await crearEvento(payload);
      
      actualizarEventoLocal(nuevoEvento);
      navigate("/mis-eventos", { state: { aviso: `Evento "${nuevoEvento.nombre_evento}" creado como Borrador.` } });
    } catch (err) {
      if (err instanceof ApiError && err.detalles.length > 0) {
        setErrores(Object.fromEntries(err.detalles.map((d) => [d.campo, d.mensaje])));
      }
      setErrorGeneral(err.message || "No se pudo crear el evento.");
    } finally {
      setEnviando(false);
    }
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

      <form className="nuevo-evento-page__form" onSubmit={manejarEnvio} noValidate>
        <CampoFormulario
          etiqueta="Nombre del evento *"
          nombre="nombre_evento"
          value={form.nombre_evento}
          onChange={(e) => actualizarCampo("nombre_evento", e.target.value)}
          error={errores.nombre_evento}
          placeholder="Ej. Noche de Rock Sinfónico"
        />

        <CampoFormulario
          as="textarea"
          etiqueta="Descripción *"
          nombre="descripcion"
          value={form.descripcion}
          onChange={(e) => actualizarCampo("descripcion", e.target.value)}
          error={errores.descripcion}
          placeholder="Cuéntale al público qué va a encontrar en este evento..."
        />

        <div className="campo-fila">
          <CampoFormulario
            etiqueta="Fecha *"
            nombre="fecha_evento"
            type="date"
            min={hoy}
            value={form.fecha_evento}
            onChange={(e) => actualizarCampo("fecha_evento", e.target.value)}
            error={errores.fecha_evento}
          />
          <CampoFormulario
            etiqueta="Hora *"
            nombre="hora_evento"
            type="time"
            value={form.hora_evento}
            onChange={(e) => actualizarCampo("hora_evento", e.target.value)}
            error={errores.hora_evento}
          />
          <CampoFormulario
            etiqueta="Hora de término"
            nombre="hora_fin_evento"
            type="time"
            value={form.hora_fin_evento}
            onChange={(e) => actualizarCampo("hora_fin_evento", e.target.value)}
            error={errores.hora_fin_evento}
            ayuda="Obligatoria para publicar. Si es menor que la de inicio, termina al día siguiente."
          />
        </div>

        <div className="campo-fila">
          <CampoFormulario
            etiqueta="Ubicación *"
            nombre="direccion_evento"
            value={form.direccion_evento}
            onChange={(e) => actualizarCampo("direccion_evento", e.target.value)}
            error={errores.direccion_evento}
            placeholder="Ej. Teatro Municipal"
          />
          <CampoFormulario
            etiqueta="Categoría"
            nombre="categoria"
            value={form.categoria}
            onChange={(e) => actualizarCampo("categoria", e.target.value)}
            error={errores.categoria}
            placeholder="Ej. Música, Gastronomía..."
          />
        </div>

        <div className="campo-fila">
          <CampoFormulario
            as="select"
            etiqueta="Tipo de entrada *"
            nombre="tipo_entrada"
            value={form.tipo_entrada}
            onChange={(e) => actualizarCampo("tipo_entrada", e.target.value)}
          >
            <option value="GRATUITA">Gratuita</option>
            <option value="PAGADA">Pagada</option>
          </CampoFormulario>

          <CampoFormulario
            etiqueta={form.tipo_entrada === "PAGADA" ? "Precio (CLP) *" : "Precio (CLP)"}
            nombre="precio"
            type="number"
            min="0"
            disabled={form.tipo_entrada === "GRATUITA"}
            value={form.tipo_entrada === "GRATUITA" ? "" : form.precio}
            onChange={(e) => actualizarCampo("precio", e.target.value)}
            error={errores.precio}
            placeholder="0"
          />
        </div>

        {errorGeneral && <p className="nuevo-evento-page__error">{errorGeneral}</p>}

        <div className="nuevo-evento-page__acciones">
          <Boton variante="secundario" type="button" onClick={() => navigate("/mis-eventos")}>
            Cancelar
          </Boton>
          <Boton variante="primario" type="submit" disabled={enviando}>
            {enviando ? "Guardando..." : "Guardar evento"}
          </Boton>
        </div>
      </form>
    </div>
  );
}
