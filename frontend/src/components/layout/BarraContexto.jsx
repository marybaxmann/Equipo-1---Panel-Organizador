import "./BarraContexto.css";

/** Barra "MICROSERVICIO · PANEL ORGANIZADOR" debajo del header, según el mockup del equipo. */
export default function BarraContexto() {
  return (
    <div className="barra-contexto">
      <div className="contenedor barra-contexto__inner">
        <span>MICROSERVICIO</span>
        <span className="separador">·</span>
        <span className="destacado">PANEL ORGANIZADOR</span>
      </div>
    </div>
  );
}
