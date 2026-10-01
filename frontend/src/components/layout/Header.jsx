import { NavLink } from "react-router-dom";
import { Search, ShoppingBag } from "lucide-react";
import "./Header.css";

export default function Header({ nombreUsuario, onBuscarClick }) {
  const iniciales = nombreUsuario
    ? nombreUsuario
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "OR";

  const handleLogout = () => {
    document.cookie = "jwt=; path=/; max-age=0";
    window.location.assign("/login");
  };

  return (
    <header className="header">
      <div className="header__marca">
        <div className="header__logo-mark">U</div>
        <span className="header__logo">Ticket-U</span>
      </div>

      <nav className="header__nav" aria-label="Navegación principal">
        <span className="header__nav-item header__nav-item--disabled" title="Módulo de otro equipo">Inicio</span>
        <NavLink to="/mis-eventos" className={({ isActive }) => "header__nav-item" + (isActive ? " header__nav-item--activo" : "")}>Mis eventos</NavLink>
        <span className="header__nav-item header__nav-item--disabled" title="Módulo de otro equipo">Promociones</span>
        <span className="header__nav-item header__nav-item--disabled" title="Módulo de otro equipo">Configuración</span>
        <span className="header__nav-item header__nav-item--disabled" title="Módulo de otro equipo">Mi cuenta</span>
      </nav>

      <div className="header__acciones">
        <button className="header__buscar" type="button" onClick={onBuscarClick}>
          <Search size={20} strokeWidth={2} /> Buscar
        </button>
        <button className="header__icono" aria-label="Carrito" title="No aplica a este módulo" type="button" disabled>
          <ShoppingBag size={20} strokeWidth={2} />
        </button>
        <button className="header__avatar" title="Cerrar sesión" aria-label="Cerrar sesión" onClick={handleLogout} style={{ border: "none", cursor: "pointer" }}>
          {iniciales}
        </button>
      </div>
    </header>
  );
}
