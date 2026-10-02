import { NavLink, useNavigate } from "react-router-dom";
import { Bell, Search, Ticket } from "lucide-react";
import "./Header.css";

/** Header común de Ticket-U, según Acuerdos-Header-Footer (equipo front-end). */
export default function Header({ nombreUsuario }) {
  const navigate = useNavigate();

  const iniciales = nombreUsuario
    ? nombreUsuario
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "OR";

  // Atajo: lleva al listado principal y pone el cursor en su buscador
  const handleBuscar = () => {
    navigate("/mis-eventos", { state: { enfocarBuscador: Date.now() } });
  };

  const handleLogout = () => {
    document.cookie = "jwt=; path=/; max-age=0";
    window.location.assign("/login");
  };

  return (
    <header className="header">
      <div className="header__marca">
        <Ticket size={28} strokeWidth={2} aria-hidden="true" />
        <span className="header__logo">TICKET-U</span>
      </div>

      <nav className="header__nav" aria-label="Navegación principal">
        <span className="header__nav-item header__nav-item--disabled" title="Módulo de otro equipo">Inicio</span>
        <NavLink to="/mis-eventos" className={({ isActive }) => "header__nav-item" + (isActive ? " header__nav-item--activo" : "")}>Mis eventos</NavLink>
        <span className="header__nav-item header__nav-item--disabled" title="Módulo de otro equipo">Promociones</span>
        <span className="header__nav-item header__nav-item--disabled" title="Módulo de otro equipo">Configuración</span>
        <span className="header__nav-item header__nav-item--disabled" title="Módulo de otro equipo">Mi cuenta</span>
      </nav>

      <div className="header__acciones">
        <button className="header__buscar" type="button" onClick={handleBuscar}>
          <Search size={20} strokeWidth={2} aria-hidden="true" />
          <span className="header__buscar-texto">BUSCAR</span>
        </button>
        <button className="header__circulo-tactil" type="button" aria-label="Notificaciones" title="Notificaciones (módulo de otro equipo)">
          <span className="header__campana">
            <Bell size={20} strokeWidth={2} aria-hidden="true" />
          </span>
        </button>
        <button className="header__circulo-tactil" type="button" aria-label="Cerrar sesión" title="Cerrar sesión" onClick={handleLogout}>
          <span className="header__avatar">{iniciales}</span>
        </button>
      </div>
    </header>
  );
}
