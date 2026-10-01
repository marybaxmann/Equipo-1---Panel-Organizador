# Estándares de UI — Panel Organizador

El estándar visual **no es propio del Panel**: lo acordaron los equipos front-end de todos los squads de Ticket-U.

- **Fuente de verdad:** [`checklist-consistencia-visual.md`](checklist-consistencia-visual.md) (34 valores: color, tipografía, espaciado, header, botones, inputs, badges, modales, íconos, accesibilidad y textos exactos de confirmación).
- **Implementación:** [`frontend/src/styles/tokens.css`](../../frontend/src/styles/tokens.css). Los componentes usan tokens; no se escriben colores, radios ni tamaños a mano.
- **Decisión y reglas del frontend:** [ADR-0008](../adr/0008-frontend-estandar-visual-y-login-simulado.md).

## Cómo se aplica en el Panel

| Fila del checklist | Dónde |
|---|---|
| 1–6 Colores, un solo modo claro | `tokens.css` (`--color-*`) |
| 7–11 Poppins (títulos) / Inter (cuerpo), escala tipográfica | `tokens.css` + `styles/global.css` |
| 15 Header TicketAzul, 64 px, sticky | `components/layout/Header.jsx` |
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
| 32 | El mensaje de error todavía no lleva el ícono de alerta | Sprint 2 |
| 33 | Falta el modal "¿Eliminar este evento?…": la eliminación es del Sprint 3 y hoy muestra un aviso | Sprint 3 (HU-03) |
| 1–6 | Las páginas `LoginSimuladoPage.jsx` y `EventoDetallePage.jsx` usan estilos inline con tokens que no existen (`--fuente-principal`, `--color-peligro-text`) y un verde fijo | Sprint 2 |
| 15 | Las pestañas de otros módulos (Inicio, Promociones…) están deshabilitadas: pertenecen a otros squads | Al integrar el frontend común |
