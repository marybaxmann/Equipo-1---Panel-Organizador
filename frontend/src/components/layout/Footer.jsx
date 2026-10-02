import "./Footer.css";

/** Footer común de Ticket-U, según Acuerdos-Header-Footer (equipo front-end). */
export default function Footer() {
  return (
    <footer className="footer">
      <span className="footer__copyright">TICKET-U © 2026</span>
      <button className="footer__enlace" type="button" title="Módulo de otro equipo">Centro de Ayuda</button>
      <button className="footer__enlace" type="button" title="Módulo de otro equipo">Términos de Servicio</button>
    </footer>
  );
}
