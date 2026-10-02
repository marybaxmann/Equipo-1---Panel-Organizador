import Header from "./Header.jsx";
import BarraContexto from "./BarraContexto.jsx";
import Footer from "./Footer.jsx";
import { useSesion } from "../../context/SesionContext.jsx";

export default function Layout({ children }) {
  const { usuario } = useSesion();

  return (
    <div className="layout">
      <Header nombreUsuario={usuario?.nombre_completo} />
      <BarraContexto />
      <main className="contenedor" style={{ paddingTop: "32px" }}>
        {children}
      </main>
      <Footer />
    </div>
  );
}
