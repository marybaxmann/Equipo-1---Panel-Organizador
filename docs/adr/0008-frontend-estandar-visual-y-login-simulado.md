# ADR-0008 — Frontend: base del equipo, estándar visual acordado y login simulado

- **Estado:** Propuesta (implementado en Sprint 1; pendiente de revisión del equipo)
- **Fecha:** 2026-09-30
- **Responsable del área:** UI/UX (Alonso Vera)
- **Afecta a:** rúbrica UI1–UI3 · `frontend/`

---

## 1. Contexto

Existían dos frontends:
- uno mínimo en TypeScript, conectado a la API real pero sin el estándar visual común;
- el de Alonso, en React + JavaScript, que implementa el **Checklist de Consistencia Visual** acordado entre los frontends
  de todos los squads (header TicketAzul, tarjetas con franja de estado, Poppins/Inter, tokens), pero que funcionaba sólo con mocks.

UI3 evalúa si se "respetan los estándares de UI acordados con otros módulos".

## 2. Decisión

**Se adopta el frontend del equipo como base** y se conecta a la API real. Del otro se portaron el cliente de API,
el login simulado, la pantalla de detalle y los errores por campo.

| Tema | Decisión |
|---|---|
| Estándar visual | [`docs/ui/checklist-consistencia-visual.md`](../ui/checklist-consistencia-visual.md) (34 valores) → `frontend/src/styles/tokens.css`. **Ningún color, radio ni tamaño se escribe a mano en un componente** |
| Acceso a la API | Sólo por `src/api/eventsApi.js` → `src/api/httpClient.js`. Base: `VITE_API_BASE_URL` (`/api/v1/panel`) |
| Cookie de sesión | Proxy de Vite (`/api` → `:3000`): front y API en el mismo origen, así la cookie `jwt` viaja sin CORS |
| Sesión (HU-06) | `SesionContext.jsx`: la carga de "mis eventos" define el estado (200 autorizado · 401 inicia sesión · 403 sin permiso · 503/error con reintentar) |
| Login | `/login` **simulado** (sólo desarrollo y demo): fija la cookie con los tokens del mock de Auth. En integración, `VITE_AUTH_LOGIN_URL` apunta al login real de Auth |
| Errores de validación | `detalles[]` del backend → mensaje bajo cada campo (fila 32) |
| Confirmaciones | `components/ui/Modal.jsx` (fila 19: 480 px, overlay 40 %, 150 ms). Prohibidos `window.confirm` / `window.alert` |
| Íconos | `lucide-react`, outline 2 px, 20 px (fila 20) |
| Acciones fuera del sprint | Se muestran y abren un aviso ("contemplado en el Sprint 2/3"), o quedan deshabilitadas con opacidad 40 % (fila 34) |
| Datos de otros squads | No se muestran (la "capacidad" del mock se retiró; ver ADR-0007) |
| Lenguaje | JavaScript (JSX). El chequeo de tipos del proyecto está en el backend (ADR-0004) |

## 3. Lo que este ADR NO decide

- La integración con el login real de Auth (Sprint 4).
- Los modales de edición y eliminación reales (HU-02, HU-03).
- Si el header muestra el nombre del usuario: el backend no lo envía hoy (ADR-0005).

## 4. Consecuencias

- **Para agregar una pantalla:** la ruta va en `src/App.jsx` (dentro de `ContenidoProtegido` si requiere sesión), la llamada en `eventsApi.js` y los estilos con tokens.
- **Si el equipo de frontends cambia un valor del checklist:** se actualizan `checklist-consistencia-visual.md` y `tokens.css` en el mismo PR.
- Verificación: `npm run build -w frontend && npm run lint -w frontend`. El CI compila el frontend.
- Deuda conocida: 4 warnings de oxlint (`SesionContext.jsx`, `httpClient.js`, `TarjetaEvento.jsx`) y los estilos inline de las páginas de login y detalle, que usan tokens inexistentes (`--fuente-principal`, `--color-peligro-text`).

## 5. Cómo se revierte

El frontend anterior está en el historial de la rama `sprint-1` (antes del commit "adopt team frontend"). Sólo hablan con la
API `eventsApi.js` y `httpClient.js`, así que cambiar de frontend no afecta al backend.
