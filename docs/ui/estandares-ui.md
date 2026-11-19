# Estándares de UI — Panel Organizador

El estándar visual **no es propio del Panel**: lo acordaron los equipos front-end de todos los squads de Ticket-U.

- **Fuente de verdad:** [`checklist-consistencia-visual.md`](checklist-consistencia-visual.md) (42 valores: color, tipografía, espaciado, header, footer, botones, inputs, badges, modales, íconos, accesibilidad y textos exactos de confirmación).
- **Implementación oficial integrada:** La interfaz oficial del Panel del Organizador vive y se ejecuta en el **Frontend Unificado** (`FWizav/FrontendTitec`) en la ruta `/organizador`, integrada mediante la rama `feature/organizador-panel`.
- **Implementación local de desarrollo:** [`frontend/src/styles/tokens.css`](../../frontend/src/styles/tokens.css). Los componentes usan tokens; no se escriben colores, radios ni tamaños a mano. El proxy de desarrollo (`frontend/vite.config.js`) apunta al API Gateway en `http://localhost:8080`.
- **Decisión y reglas del frontend:** [ADR-0008](../adr/0008-frontend-estandar-visual-y-login-simulado.md).

## Cómo se aplica en el Panel

| Fila del checklist | Dónde |
|---|---|
| 1–6 Colores, un solo modo claro | `tokens.css` (`--color-*`) y `src/modules/organizador/styles/organizador.module.css` en Frontend Unificado |
| 7–11 Poppins (títulos) / Inter (cuerpo), escala tipográfica | `tokens.css` + `styles/global.css` y CSS Modules en el Frontend Unificado |
| 15, 35–40 Header TicketAzul, 64 px, sticky, BUSCAR + campana + avatar | Provisto por el Layout global del Frontend Unificado (`components/layout/Header.tsx`) |
| 41–42 Footer TicketAzul | Provisto por el Layout global del Frontend Unificado (`components/layout/Footer.tsx`) |
| 16–17 Botones e inputs de 40 px, radio 8 px, foco y error | `components/ui/Boton.*`, `components/ui/CampoFormulario.*` |
| 18, 30 Badges pill con colores por estado | `components/ui/BadgeEstado.*` |
| 19, 33 Modales de 480 px, overlay 40 %, textos de confirmación | `components/ui/Modal.*` · `pages/MisEventosPage.jsx` · `pages/EventoDetallePage.jsx` (publicar y eliminar) |
| 20 Íconos outline 2 px, 20 px | `lucide-react` en `TarjetaEvento.*`, `Header.*` y `CampoFormulario.*` |
| 31 Tarjeta con franja lateral por estado | `components/events/TarjetaEvento.*` |
| 32 Error en rojo, 12 px, bajo el campo con ícono de alerta | `CampoFormulario.*` (mensajes que vienen del backend) |
| 33 Modal «¿Eliminar este evento?» | `MisEventosPage.*` y `EventoDetallePage.*` con `Modal.*` (Sprint 4, HU-03) |
| 34 Deshabilitados: opacidad 40 %, `not-allowed` | `TarjetaEvento.*`, `Boton.*` |

## Desviaciones resueltas con la integración al Frontend Unificado

Las desviaciones temporales anteriores (filas 15 y 35–40 relativas a pestañas y header compartido) quedan **formalmente resueltas** con la integración de la interfaz en el Frontend Unificado (`FWizav/FrontendTitec`), donde la navegación, el header y el footer son gestionados directamente por la plataforma común de TicketU.
