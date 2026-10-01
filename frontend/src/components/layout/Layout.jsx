import Header from "./Header.jsx";
import BarraContexto from "./BarraContexto.jsx";
import { useSesion } from "../../context/SesionContext.jsx";

export default function Layout({ children }) {
  const { usuario } = useSesion();

  function enfocarBuscador() {
    document.querySelector('input[type="search"]')?.focus();
  }

  return (
    <div className="layout">
      <Header nombreUsuario={usuario?.nombre_completo} onBuscarClick={enfocarBuscador} />
      <BarraContexto />
      <main className="contenedor" style={{ paddingTop: "32px", paddingBottom: "64px" }}>
        {children}
      </main>
    </div>
  );
}
