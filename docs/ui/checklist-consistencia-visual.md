# Checklist de Consistencia Visual — Ticket-U (Panel Organizador)

Valores acordados por los equipos front-end de todos los squads. Fuente: *Documentacion Front_End.docx* (Equipo Front-End Ticket-U).
Implementación: [`frontend/src/styles/tokens.css`](../../frontend/src/styles/tokens.css). Decisión: [ADR-0008](../adr/0008-frontend-estandar-visual-y-login-simulado.md).

## A. Lineamientos generales (aplican a todo el sistema)

| # | Categoría | Punto a acordar | Valor acordado |
|---|---|---|---|
| 1 | Color | Color de fondo principal (hex exacto) | #FFFFFF (contenido) / #F8F9FA (paneles internos) |
| 2 | Color | Color de superficie / tarjetas (si es distinto al fondo) | #FFFFFF con borde sutil; banner de contexto #EEF1F8 |
| 3 | Color | Color de texto primario y texto secundario/muted | Primario #2F4374 · Secundario #6B7A9A |
| 4 | Color | Color de acento / marca (botones principales, links) | #2F4374 (azul marino TicketAzul) |
| 5 | Color | Colores de estado: éxito, error, advertencia, información (hex exacto) | Éxito: texto #1A6640 / fondo #E2F4EA · Peligro: texto #B3261E / fondo #FDF0F2 · Info: texto #2F4374 / fondo #EEF1F8 |
| 6 | Color | Modo claro/oscuro: ¿uno solo o ambos? Valores de cada uno | Un solo modo: claro (fondo blanco, header azul marino) |
| 7 | Tipografía | Familia tipográfica principal (nombre exacto) | Poppins — títulos y números destacados (600–700) |
| 8 | Tipografía | Familia tipográfica secundaria/mono (si se usa) | Inter — cuerpo de texto y UI general (400–600) |
| 9 | Tipografía | Tamaños de fuente: H1, H2/H3, párrafo, caption, botones | H1 28px · H2 20px · H3 16px · Párrafo 14px · Caption 12px · Botones 14px |
| 10 | Tipografía | Pesos de fuente permitidos y en qué elementos va cada uno | 400 regular (cuerpo) · 600 semibold (botones, labels) · 700 bold (títulos) |
| 11 | Tipografía | Interlineado (line-height) estándar | 1.5 en párrafos · 1.2 en títulos |
| 12 | Espaciado y estructura | Sistema de espaciado (múltiplos de 4px u 8px) | Base 8px — escala 4 / 8 / 16 / 24 / 32 / 48 |
| 13 | Espaciado y estructura | Ancho máximo de contenido / grid y gutters | 1200px máx., grid de 12 columnas, gutters de 24px |
| 14 | Espaciado y estructura | Breakpoints responsive (móvil, tablet, escritorio) | Móvil <640px · Tablet 641–1024px · Escritorio >1024px |
| 15 | Componentes compartidos | Header: elementos, orden, alto exacto (px), sticky o no | Header TicketAzul: logo izq. + Inicio/Mis eventos/Promociones/Configuración/Mi cuenta; buscar + carrito + avatar der. Alto 64px, sticky. |
| 16 | Componentes compartidos | Botones: radio de esquina, alto, estados, variantes | Fondo #2F4374, texto blanco, alto 40px, radio 8px; hover 10% más oscuro; disabled 40% opacidad |
| 17 | Componentes compartidos | Inputs y formularios: alto, radio, estilo de foco y error | Alto 40px, radio 8px, borde #D8DFF0; foco: borde #2F4374 + halo 2px; error: borde #B3261E + texto de ayuda debajo |
| 18 | Componentes compartidos | Badges/pills de estado: forma, tamaño, color por significado | Activa: texto #1A6640 / fondo #E2F4EA · Inactiva: texto #6B7A9A / fondo #F0F0F5. Forma: pill (radio 999px) |
| 19 | Componentes compartidos | Modales/confirmaciones: tamaño, overlay, animación de entrada | Pequeño 480px / grande 720px; overlay negro 40%; entrada con fade + scale 150ms |
| 20 | Componentes compartidos | Iconografía: set de íconos, grosor de trazo, tamaño estándar | Set outline (Lucide/Feather), trazo 2px, tamaño 20px |
| 21 | Bordes, radios y sombras | Radio de esquina estándar por tipo de elemento | 8px botones/inputs · 12px tarjetas · 999px badges (pill) |
| 22 | Bordes, radios y sombras | Estilo de bordes (grosor, color) | 1px sólido, color #D8DFF0 |
| 23 | Bordes, radios y sombras | Sombras/elevación (si se usan, en qué casos) | Tarjetas: sombra suave (8% opacidad) · Modales: sombra más marcada (15% opacidad) |
| 24 | Accesibilidad | Contraste mínimo texto/fondo | 4.5:1 mínimo para texto normal (WCAG AA) |
| 25 | Accesibilidad | Tamaño mínimo de área táctil en botones/íconos (mobile) | 44×44px mínimo |
| 26 | Accesibilidad | Foco visible al navegar con teclado | Outline 2px sólido #2F4374, separado 2px del elemento |
| 27 | Documentación y control | Dónde vive la fuente de verdad (Figma / Notion / este doc) | Archivo Figma “Ticket-U — Design System”, página “Tokens” |
| 28 | Documentación y control | Nomenclatura de pantallas/componentes en Figma | [Módulo]/[Pantalla]/[Estado] — ej. PanelOrganizador/Listado/Default |
| 29 | Documentación y control | Checklist de verificación por sección antes de entregar | Cada sección marca ✓ en este documento antes de la entrega final |

## B. Lineamientos específicos (Panel Organizador)

| # | Categoría | Punto a acordar | Valor acordado |
|---|---|---|---|
| 30 | Estados de evento | Colores de estado (Borrador, Publicado, Finalizado, Cancelado) — mismo color en todo el sistema | Borrador: texto #6B7A9A / fondo #F0F0F5 · Publicado: texto #1A6640 / fondo #E2F4EA · Finalizado: texto #2F4374 / fondo #EEF1F8 · Cancelado: texto #B3261E / fondo #FDF0F2 |
| 31 | Componente evento | Estilo de la tarjeta de evento (medidas, comportamiento) | Card blanca con borde 1px #D8DFF0, radio 12px; franja lateral de color según estado, tal como el bloque de % en Promociones |
| 32 | Formularios | Mensajes de error/validación (texto exacto, color, ubicación) | Texto en #B3261E, 12px, debajo del campo, con ícono de alerta |
| 33 | Textos de UI | Textos exactos de confirmación (ej. '¿Eliminar este evento?') | “¿Eliminar este evento? Esta acción no se puede deshacer.” / “¿Publicar este evento? Será visible en el catálogo público.” |
| 34 | Estados de UI | Comportamiento de botones deshabilitados (ej. 'Editar' en eventos cancelados) | Opacidad 40%, cursor not-allowed, sin cambios al pasar el mouse |
