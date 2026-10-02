# Estándares de UI — Panel Organizador

El estándar visual **no es propio del Panel**: lo acordaron los equipos front-end de todos los squads de Ticket-U.

- **Fuente de verdad:** [`checklist-consistencia-visual.md`](checklist-consistencia-visual.md) (42 valores: color, tipografía, espaciado, header, footer, botones, inputs, badges, modales, íconos, accesibilidad y textos exactos de confirmación).
- **Implementación:** [`frontend/src/styles/tokens.css`](../../frontend/src/styles/tokens.css). Los componentes usan tokens; no se escriben colores, radios ni tamaños a mano.
- **Decisión y reglas del frontend:** [ADR-0008](../adr/0008-frontend-estandar-visual-y-login-simulado.md).

## Cómo se aplica en el Panel

| Fila del checklist | Dónde |
|---|---|
| 1–6 Colores, un solo modo claro | `tokens.css` (`--color-*`) |
| 7–11 Poppins (títulos) / Inter (cuerpo), escala tipográfica | `tokens.css` + `styles/global.css` |
| 15, 35–40 Header TicketAzul, 64 px, sticky, BUSCAR + campana + avatar | `components/layout/Header.*` |
| 41–42 Footer TicketAzul | `components/layout/Footer.*` |
| 16–17 Botones e inputs de 40 px, radio 8 px, foco y error | `components/ui/Boton.*`, `components/ui/CampoFormulario.*` |
| 18, 30 Badges pill con colores por estado | `components/ui/BadgeEstado.*` |
| 19, 33 Modales de 480 px, overlay 40 %, textos de confirmación | `components/ui/Modal.*` · `pages/MisEventosPage.jsx` (publicar) |
| 20 Íconos outline 2 px, 20 px | `lucide-react` en `TarjetaEvento.jsx` y `Header.jsx` |
| 31 Tarjeta con franja lateral por estado | `components/events/TarjetaEvento.*` |
| 32 Error en rojo, 12 px, bajo el campo | `CampoFormulario.jsx` (mensajes que vienen del backend) |
| 34 Deshabilitados: opacidad 40 %, `not-allowed` | `TarjetaEvento.css`, `Boton.css` |

## Desviaciones conocidas

| Fila | Desviación | Cuándo se corrige |
|---|---|---|
| 33 | Falta el modal "¿Eliminar este evento?…": la eliminación es del Sprint 3 y hoy muestra un aviso | Sprint 3 (HU-03) |
| 15 | Las pestañas de otros módulos (Inicio, Promociones…) están deshabilitadas: pertenecen a otros squads | Al integrar el frontend común |
| 35–40 | Header <640px: el logo baja a 20px y BUSCAR muestra sólo la lupa (el texto queda para lectores de pantalla); a 375px no caben logo de 24px, BUSCAR y los dos íconos en una fila. Campana, "Centro de Ayuda" y "Términos de Servicio" no navegan: son de otros squads | Al integrar el frontend común |
