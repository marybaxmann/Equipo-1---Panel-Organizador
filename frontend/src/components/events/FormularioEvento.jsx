import { useState } from "react";
import { AlertCircle } from "lucide-react";
import CampoFormulario from "../ui/CampoFormulario.jsx";
import Boton from "../ui/Boton.jsx";
import { ApiError } from "../../api/httpClient.js";
import "./FormularioEvento.css";

export default function FormularioEvento({
  eventoInicial = {},
  onGuardar,
  onCancelar,
  textoBoton = "Guardar evento",
  modo = "crear",
  deshabilitado = false,
  avisoBloqueo = "",
}) {
  const [form, setForm] = useState({
    nombre_evento: eventoInicial.nombre_evento ?? "",
    descripcion: eventoInicial.descripcion ?? "",
    fecha_evento: eventoInicial.fecha_evento ?? "",
    hora_evento: eventoInicial.hora_evento ?? "",
    hora_fin_evento: eventoInicial.hora_fin_evento ?? "",
    direccion_evento: eventoInicial.direccion_evento ?? "",
    categoria: eventoInicial.categoria ?? "",
    tipo_entrada: eventoInicial.tipo_entrada ?? "GRATUITA",
    precio: eventoInicial.precio ?? "",
    cantidad_entradas: eventoInicial.cantidad_entradas ?? "",
  });

  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState("");
  const [aviso409, setAviso409] = useState(avisoBloqueo);

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
    if (deshabilitado) return;
    setErrorGeneral("");
    setAviso409("");
    if (!validar()) return;

    setEnviando(true);
    try {
      const payload = {
        nombre_evento: form.nombre_evento.trim(),
        descripcion: form.descripcion.trim(),
        fecha_evento: form.fecha_evento,
        hora_evento: form.hora_evento,
        hora_fin_evento: form.hora_fin_evento || null,
        direccion_evento: form.direccion_evento.trim(),
        categoria: form.categoria?.trim() ? form.categoria.trim() : null,
        tipo_entrada: form.tipo_entrada || null,
      };

      if (form.tipo_entrada === "PAGADA") {
        payload.precio = form.precio !== "" && form.precio !== null ? Number(form.precio) : null;
      } else {
        payload.precio = null;
      }

      if (form.cantidad_entradas !== "" && form.cantidad_entradas !== null && form.cantidad_entradas !== undefined) {
        payload.cantidad_entradas = Number(form.cantidad_entradas);
      } else if (modo === "editar") {
        payload.cantidad_entradas = null;
      }

      await onGuardar(payload);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409 || err.codigo === "EVENT_NOT_EDITABLE") {
          setAviso409(err.message || "Sólo un evento en Borrador o Publicado puede editarse.");
          return;
        }
        if (err.status === 400 && err.detalles?.length > 0) {
          const mapaErrores = {};
          err.detalles.forEach((d) => {
            mapaErrores[d.campo] = d.mensaje;
          });
          setErrores(mapaErrores);
          setErrorGeneral(err.message || "Hay campos con errores.");
          return;
        }
        setErrorGeneral(err.message || "No se pudo guardar el evento.");
      } else {
        setErrorGeneral(err.message || "No se pudo guardar el evento.");
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className="formulario-evento" onSubmit={manejarEnvio} noValidate>
      {aviso409 && (
        <div className="formulario-evento__aviso-409" role="alert">
          <AlertCircle size={20} strokeWidth={2} aria-hidden="true" />
          <span>{aviso409}</span>
        </div>
      )}

      <CampoFormulario
        etiqueta="Nombre del evento *"
        nombre="nombre_evento"
        value={form.nombre_evento}
        onChange={(e) => actualizarCampo("nombre_evento", e.target.value)}
        error={errores.nombre_evento}
        placeholder="Ej. Noche de Rock Sinfónico"
        disabled={deshabilitado}
      />

      <CampoFormulario
        as="textarea"
        etiqueta="Descripción *"
        nombre="descripcion"
        value={form.descripcion}
        onChange={(e) => actualizarCampo("descripcion", e.target.value)}
        error={errores.descripcion}
        placeholder="Cuéntale al público qué va a encontrar en este evento..."
        disabled={deshabilitado}
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
          disabled={deshabilitado}
        />
        <CampoFormulario
          etiqueta="Hora *"
          nombre="hora_evento"
          type="time"
          value={form.hora_evento}
          onChange={(e) => actualizarCampo("hora_evento", e.target.value)}
          error={errores.hora_evento}
          disabled={deshabilitado}
        />
        <CampoFormulario
          etiqueta="Hora de término"
          nombre="hora_fin_evento"
          type="time"
          value={form.hora_fin_evento}
          onChange={(e) => actualizarCampo("hora_fin_evento", e.target.value)}
          error={errores.hora_fin_evento}
          ayuda="Obligatoria para publicar. Si es menor que la de inicio, termina al día siguiente."
          disabled={deshabilitado}
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
          disabled={deshabilitado}
        />
        <CampoFormulario
          etiqueta="Categoría"
          nombre="categoria"
          value={form.categoria}
          onChange={(e) => actualizarCampo("categoria", e.target.value)}
          error={errores.categoria}
          placeholder="Ej. Música, Gastronomía..."
          disabled={deshabilitado}
        />
      </div>

      <div className="campo-fila">
        <CampoFormulario
          as="select"
          etiqueta="Tipo de entrada *"
          nombre="tipo_entrada"
          value={form.tipo_entrada}
          onChange={(e) => actualizarCampo("tipo_entrada", e.target.value)}
          disabled={deshabilitado}
        >
          <option value="GRATUITA">Gratuita</option>
          <option value="PAGADA">Pagada</option>
        </CampoFormulario>

        <CampoFormulario
          etiqueta={form.tipo_entrada === "PAGADA" ? "Precio (CLP) *" : "Precio (CLP)"}
          nombre="precio"
          type="number"
          min="0"
          disabled={deshabilitado || form.tipo_entrada === "GRATUITA"}
          value={form.tipo_entrada === "GRATUITA" ? "" : form.precio}
          onChange={(e) => actualizarCampo("precio", e.target.value)}
          error={errores.precio}
          placeholder="0"
        />

        <CampoFormulario
          etiqueta="Cantidad de entradas"
          nombre="cantidad_entradas"
          type="number"
          min="1"
          max="100000"
          value={form.cantidad_entradas}
          onChange={(e) => actualizarCampo("cantidad_entradas", e.target.value)}
          error={errores.cantidad_entradas}
          placeholder="Ej. 100"
          ayuda="Obligatoria para publicar."
          disabled={deshabilitado}
        />
      </div>

      {errorGeneral && <p className="formulario-evento__error">{errorGeneral}</p>}

      <div className="formulario-evento__acciones">
        <Boton variante="secundario" type="button" onClick={onCancelar}>
          Cancelar
        </Boton>
        <Boton variante="primario" type="submit" disabled={enviando || deshabilitado}>
          {enviando ? "Guardando..." : textoBoton}
        </Boton>
      </div>
    </form>
  );
}
