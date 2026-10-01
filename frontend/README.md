# Ticket-U — Panel Organizador (Frontend)

Frontend del microservicio **Panel Organizador**, construido con **Vite + React**.

Implementa el **Sprint 1** según `docs/sprints.md` del repo principal:

- **HU-06** — Verificación de autorización del organizador
- **HU-01** — Crear un evento
- **HU-05** — Ver mis eventos

También deja listos (pero no completos) los puntos de entrada para HU-02, HU-03 y HU-04 (Sprint 2/3), para no tener que tocar la arquitectura después.

---

## 1. Cómo levantarlo (modo actual: sin backend)

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`. Verás la app funcionando **con datos de ejemplo** (mock), sin necesitar que el backend ni el API Gateway estén corriendo. Esto se controla con la variable `VITE_USE_MOCK_API=true` en tu archivo `.env` (ya viene configurado así).

Los datos de ejemplo se guardan en `localStorage` del navegador, así que crear/publicar/eliminar eventos persiste entre recargas (F5), pero es solo local a tu navegador — no hay servidor real detrás todavía.

## 2. Cómo lo conecta tu compañero al backend real

Cuando el backend de Panel Organizador + el API Gateway estén levantados:

1. Copiar `.env.example` a `.env` (si no existe ya).
2. Cambiar dos líneas en `.env`:
   ```
   VITE_USE_MOCK_API=false
   VITE_API_BASE_URL=http://localhost:PUERTO_DEL_GATEWAY/api
   ```
3. Reiniciar `npm run dev`.

**No hay que tocar ningún componente ni página.** Toda la app llama únicamente a las funciones de `src/api/eventsApi.js`, que a su vez usan `src/api/httpClient.js`. Ese archivo es el único lugar que decide si habla con el mock o con el backend real.

Las rutas ya están escritas exactamente como en los diagramas de secuencia del repo (`docs/diagrams/`):

| Acción | Método y ruta |
|---|---|
| Ver mis eventos (HU-05) / verificar sesión (HU-06) | `GET /events/mine` |
| Crear evento (HU-01) | `POST /events` |
| Editar evento (HU-02, Sprint 2) | `PATCH /events/:id` |
| Publicar evento (HU-04, Sprint 2) | `PATCH /events/:id/publish` |
| Eliminar evento (HU-03, Sprint 3) | `DELETE /events/:id` |

Todas las peticiones se hacen con `credentials: "include"` para que la cookie de sesión (`jwt=...`) viaje automáticamente, tal como espera Auth según `docs/CONTRATO_PANEL_AUTH.md`. El frontend nunca lee ni valida el JWT — eso es responsabilidad del backend.

### Manejo de sesión (HU-06)

`GET /events/mine` cumple doble función: trae la lista de eventos **y** sirve como verificación de sesión.

- Respuesta `200` → se asume sesión válida y rol organizador; se muestran los eventos.
- Respuesta `401` → se muestra pantalla "Inicia sesión" con un botón que redirige a `VITE_AUTH_LOGIN_URL` (ajustar esa variable cuando el equipo de Auth confirme la URL real de su login).
- Respuesta `403` → se muestra pantalla "No tienes permisos de organizador".
- Cualquier otro error o el servidor caído → pantalla de error genérica con botón "Reintentar".

El backend debe responder con esta forma (o avísenme si cambia y ajustamos `src/context/SesionContext.jsx`):

```json
{
  "usuario": { "id_usuario": "...", "nombre_completo": "...", "rol": "organizador" },
  "eventos": [ { "id_evento": "...", "nombre_evento": "...", "...": "..." } ]
}
```

## 3. Datos que NO son responsabilidad de Panel Organizador (hoy están mockeados)

Para que la lista de eventos se viera completa según el mockup de Figma del equipo, se muestran dos campos que en realidad pertenecen a **Entradas/Inventario**, no a Panel:

- `capacidad_reservada`
- `capacidad_total`

Hoy están **hardcodeados** en `src/api/mockData.js` con un comentario explicando esto. Cuando el backend de Panel resuelva cómo obtener esta información (consultando a Entradas, o mediante el broker), lo ideal es que `GET /events/mine` ya devuelva estos números resueltos, para no tener que llamar a otro servicio desde el frontend.

Todos los demás campos del evento (`nombre_evento`, `descripcion`, `direccion_evento`, `fecha_evento`, `hora_evento`, `imagen`, `categoria`, `precio`, `tipo_entrada`, `estado_gestion`, `estado_disponibilidad`) sí son de Panel, según `docs/CONTRATO_PANEL_CATALOGO.md`, y los nombres ya están escritos exactamente así en el código.

## 4. Estructura del proyecto

```
src/
  api/
    httpClient.js     -> único lugar que decide mock vs. backend real
    eventsApi.js       -> funciones que usa la UI (obtenerMisEventos, crearEvento, ...)
    mockData.js        -> datos de ejemplo + qué campos son mock de verdad
    mockServer.js       -> "backend falso" en localStorage, mismas rutas que el real
  context/
    SesionContext.jsx  -> HU-06: verificación de sesión, estado global de eventos
  components/
    layout/            -> Header, barra de contexto, pantallas de error/carga
    events/            -> tarjeta de evento, filtros, pestañas
    ui/                -> botón, campo de formulario, badge de estado (reutilizables)
  pages/
    MisEventosPage.jsx  -> HU-05
    NuevoEventoPage.jsx -> HU-01
  styles/
    tokens.css          -> variables de diseño acordadas por el equipo front-end
    global.css
```

## 5. Diseño

Los colores, tipografía, espaciado y radios están tomados directamente de `Documentacion_Front_End.docx` (checklist acordado con el resto de los front-end) y viven como variables CSS en `src/styles/tokens.css`. Si el equipo cambia algún valor del checklist, basta con actualizar ese archivo — no hay valores de diseño repetidos "a mano" en los componentes.

## 6. Pendiente para Sprint 2 / 3 (a propósito no incluido aún)

- Pantalla de edición de evento reutilizando el formulario de HU-01 (HU-02).
- Reglas de eliminación cuando existen entradas asociadas (HU-03, ver `docs/diagrams/hu03-eliminar-evento.md`).
- Publicación de eventos hacia Catálogo vía broker (`panel.evento.catalogo.v1`) — hoy la publicación solo cambia el estado localmente en el mock/backend propio (HU-04, HU-07).
