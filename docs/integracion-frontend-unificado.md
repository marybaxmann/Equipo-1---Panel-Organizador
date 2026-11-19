# Integración del Panel del Organizador en el Frontend Unificado

Este documento detalla la integración de la interfaz de usuario del Panel del Organizador (Equipo 1) dentro del repositorio central **Frontend Unificado** (`FWizav/FrontendTitec`), reemplazando el placeholder original de la ruta `/organizador`.

---

## 1. Contexto y Objetivos

- **Meta:** Sustituir `OrganizadorPlaceholder.tsx` por la interfaz real del panel antes de la entrega final.
- **Repositorio de integración:** `FWizav/FrontendTitec` (Next.js 14, App Router, TypeScript, CSS Modules).
- **Rama de integración:** `feature/organizador-panel`.
- **API Gateway:** Conexión centralizada vía `http://localhost:8080/api/organizador/v1/panel/eventos` preservando cookies HttpOnly (`jwt`).

---

## 2. Componentes y Rutas Integradas

| Ruta | Archivo en FrontendTitec | Responsabilidad |
|---|---|---|
| `/organizador` | `src/app/organizador/layout.tsx` | Layout del módulo. Envuelve con `SesionProvider` y aplica `.panelOrganizador` + `BarraContexto`. |
| `/organizador` | `src/app/organizador/page.tsx` | Listado de mis eventos (`MisEventosPage.tsx`), filtros por estado, búsqueda en tiempo real, modales de publicar y eliminar. |
| `/organizador/[idEvento]` | `src/app/organizador/[idEvento]/page.tsx` | Detalle completo del evento (`EventoDetallePage.tsx`) con publicación y eliminación. |
| `/organizador/nuevo` | `src/app/organizador/nuevo/page.tsx` | Ruta de creación (botón en listado deshabilitado con "Disponible en la entrega final"). |
| `/organizador/[idEvento]/editar` | `src/app/organizador/[idEvento]/editar/page.tsx` | Ruta de edición (botón en detalle deshabilitado con "Disponible en la entrega final"). |

---

## 3. Manejo de Sesión y Autorización (HU-06)

* **401 Unauthorized:** Al ingresar sin cookie `jwt` activa o con sesión expirada, se redirige inmediatamente a `window.location.assign("/auth/admin/login")`. No se renderiza ningún dato del panel.
* **403 Forbidden:** Si el usuario no tiene rol organizador (ej. rol comprador), se muestra la pantalla de protección:
  > **Acceso restringido a organizadores**
  > *Esta sección es exclusiva para usuarios con rol de organizador.*
* **Autenticación sin simulación:** Se eliminó cualquier mecanismo de login simulado; el JWT viaja exclusivamente en la cookie `jwt` con `credentials: "include"` y `cache: "no-store"`.

---

## 4. Estilos y Aislamiento

* Se migraron todos los componentes a **CSS Modules** (`*.module.css`) para garantizar que las clases no colisionen con los módulos de Catálogo, Entradas, Check-in o Pagos.
* Los design tokens se aislaron dentro del scope `.panelOrganizador`, sin contaminar el selector `:root` global.
* Se utiliza el Header y Footer provistos por el layout común de TicketU.
* El diseño cuenta con reglas responsive completas para visualización en teléfonos móviles.

---

## 5. Verificación

* `next build` ejecutado en `FrontendTitec` sin errores de compilación ni de TypeScript.
* Proxy local en `frontend/vite.config.js` actualizado a `http://localhost:8080`.
