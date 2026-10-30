# Minuta: coordinación con otros squads 

- **Período:** 30/09/2026 al 29/10/2026
- **Modalidad:** coordinación asíncrona con cada squad (mensajería y documentos compartidos)
- **Redacta:** Mariajosé Baxmann (Scrum Master · negociación de contratos, Panel Organizador)
- **Participantes:** Panel Organizador (Mariajosé; Joaquín vía mensaje reenviado) · Notificaciones · Entradas/Inventario · Auth (Diego Peña) · Promociones (Diego) · Check-in

---

## 1. Notificaciones

**Fecha:** sábado 24/10

**Tema:** qué cambios de estado del evento le sirven a Notificaciones.

- Notificaciones revisó el contrato. Su duda: para qué le sirven los estados BORRADOR y FINALIZADO, si no pueden avisarle eso a los compradores.
- Preguntaron si `evento_actualizado` les llegaría solo con CANCELADO y `evento_reprogramado` con el cambio de fecha/hora.

**Acuerdo:** a Notificaciones solo le interesan dos casos:
1. cuando el evento se **cancela**;
2. cuando el evento se **reprograma** (cambio de fecha u hora).

BORRADOR, PUBLICADO y FINALIZADO se informaron como referencia, pero no se usan para notificar.

**Queda abierto:** si también necesitan aviso cuando un evento se **agota**. Ese dato viene de Entradas, no de Panel; hay que definir si lo reciben directo de Entradas.

**Impacto en Panel:** hoy el código publica `evento_actualizado` al **publicar** y no al **cancelar**. Hay que ajustar el mensaje de `panel.evento.notificaciones.v1` para que salga en CANCELADO (Etienne / Joaquín).

---

## 2. Entradas / Inventario

**Fecha:** 28/10 

**Tema:** levantar Panel para probar la integración.

- Entradas pidió la imagen de Panel. Se les respondió (respuesta de Joaquín):
  - el Dockerfile está en `main` (`backend/Dockerfile`) y está actualizado;
  - se construye desde la raíz con `docker build -f backend/Dockerfile -t panel-organizador .`, o con `docker-compose.integracion.yml`, que levanta también su Mongo en la red `plataforma-eventos-net`;
  - si quieren consultar `GET /panel/eventos/{id}`, necesitan Auth levantado en la misma red; sin Auth, el endpoint responde 503 (fail-secure).
- Entradas informó que **se conectó al exchange `ticketu.events` de RabbitMQ** desde su lado y lo verificó en la consola de RabbitMQ.
- Entradas envió el informe **"Diferencias Panel y Entradas"** (documento de 3 páginas elaborado por Entradas). Indica que lograron conectar los microservicios, pero que Panel tiene que cambiar algunas cosas para cumplir lo que pidió el ayudante.

**Qué dice el informe sobre Panel:**
1. **Nombres de los tópicos:** según Entradas, el ecosistema (`backendticketU`) usa claves de dominio como `evento.creado` o `pago.realizado`, y Panel publica con claves de 4 niveles (`panel.evento.entradas.v1`).
2. **Contenido de los mensajes:** Panel manda campos que a Entradas no le sirven (`nombre_evento`, `fecha_evento`) y le faltan campos que su base de datos exige (por ejemplo `cantidad_entrada_reservada`). Eso les daba error de validación en MongoDB (error 121).

**Qué corrigió Entradas de su lado (según el informe):**
- Escucha `panel.#` y `panel.evento.entradas.v1`, así que **ya recibe los mensajes de Panel** con los nombres actuales mientras se define el estándar.
- Agregó una capa que limpia los mensajes de Panel (`evento_creado`, `evento_publicado`, `evento_actualizado`) y completa los campos que faltan con valores por defecto.
- Llama a Panel en `http://organizador-service:3000` (variable `PANEL_SERVICE_URL`), que coincide con nuestro compose.
- Reenvía la cookie `jwt` del usuario al consultar a Panel, como dice nuestro contrato.
- Ya publica de verdad el stock en `entradas.evento.stock.v1` y `stock.agotado`.

**Acuerdos:**
- Entradas prueba con la imagen Docker de Panel en la red compartida.
- La conexión a RabbitMQ (`ticketu.events`) funciona desde el lado de Entradas y ya reciben los mensajes de Panel.
- Para las consultas de Entradas a Panel se reenvía el `jwt` del usuario. Con eso se responde la pregunta de cómo se autentican.

**Queda abierto:**
- **Nombre de los tópicos:** el repo de la plataforma propone `<recurso>.<hecho-en-pasado>` (por ejemplo `evento.creado`), pero lo presenta como propuesta, no como contrato cerrado (ver sección 6). Las claves de 4 niveles de Panel funcionan en un exchange topic, y el mismo arreglo de Entradas lo demuestra. Es una decisión de alineamiento, no un error técnico.
- **Contenido del mensaje para Entradas:** que Entradas nos pase la lista exacta de campos que exige su colección `inventario_evento`, para escribirla en el contrato y ajustar `evento.mapper.ts`.
- Responder si usan Panel solo por RabbitMQ o también por el GET (en ese caso necesitan Auth en la red).
- Sigue pendiente `capacidad_reservada` y la ruta del stock para eliminar eventos (INT-04, INT-05, HU-03).

---

## 3. Auth

**Fecha:** 28/10

**Tema:** levantar Auth para las pruebas.

- El equipo de Auth (Diego Peña) informó que subió el **Dockerfile de Auth** para que podamos automatizar o probar mejor.

**Acuerdo:** Auth disponible como imagen Docker para pruebas.

**Queda abierto:**
- Nombre del contenedor en `plataforma-eventos-net` y puerto. El Gateway de la plataforma espera `http://auth-service:3000`, igual que nuestro compose, pero se habló de que Auth corre en el puerto 10000. Auth tiene que confirmar cuál usa en Docker; si cambia, Joaquín ajusta `AUTH_SERVICE_URL`.
- Link al repo donde está el Dockerfile.
- Cómo se autentican las llamadas entre servicios sin usuario (token de servicio con rol `staff`).

---

## 4. Promociones

**Fecha:** 29/10

**Tema:** contrato Panel ↔ Promociones.

- Se compartió con Promociones la carpeta `docs` del repo y el contrato [`CONTRATO_PANEL_PROMOCIONES.md`](https://github.com/marybaxmann/Equipo-1---Panel-Organizador/blob/main/docs/CONTRATO_PANEL_PROMOCIONES.md).

**Acuerdo:** Promociones tiene el contrato para revisarlo.

**Queda abierto:** que respondan qué mecanismo usan (cola `panel.evento.promociones.v1` o `GET /eventos-disponibles` por el Gateway), en qué momento necesitan el evento (al publicar) y en qué sprint se integran.

---

## 5. Check-in

**Fecha:** 30/09 (envío) y 01/10 (respuesta)

**Tema:** contrato Panel ↔ Check-in.

- Se compartió con Check-in el contrato [`CONTRATO_PANEL_CHECKIN.md`](https://github.com/marybaxmann/Equipo-1---Panel-Organizador/blob/main/docs/CONTRATO_PANEL_CHECKIN.md).
- Check-in confirmó que ya lo tenía incorporado y que **no requiere cambios**.

**Acuerdo:** Check-in acepta el contrato tal como está.

**Queda abierto:** esa aceptación es anterior al Sprint 3. Falta confirmar con ellos lo nuevo: la ruta por el Gateway, su cola `panel.evento.checkin.v1` y el formato de error.

---

## 6. Referencia: repositorio de la plataforma (`FWizav/backendticketU`)

Revisado el 29/10 (último cambio del repo: 01/10). Contrastado con Panel:

| Tema | Plataforma | Panel | Estado |
|---|---|---|---|
| Red Docker | `plataforma-eventos-net` | Igual | ✅ Alineado |
| Nombre del servicio | `organizador-service:3000` | Igual | ✅ Alineado |
| Prefijo en el Gateway | `/api/organizador/*`, el path llega completo | Panel responde en `/api/organizador/v1/...` | ✅ Alineado |
| RabbitMQ | `ticketu-rabbitmq:5672`, exchange `ticketu.events` (topic) | Igual | ✅ Alineado |
| Colas | Una cola durable propia por consumidor | Igual (ADR-0014) | ✅ Alineado |
| Nombres de eventos | Propone `<recurso>.<hecho-en-pasado>`: Organizador publica `evento.creado`, `evento.actualizado` y `evento.cancelado`, y cada squad los escucha | Una clave por consumidor: `panel.evento.<squad>.v1` | ⚠️ Distinto. La plataforma lo marca como propuesta "a validar con los 9 grupos" |
| Formato del mensaje | Sobre en el cuerpo: `{ eventId, eventName, occurredAt, source, data }` | Sobre en las propiedades AMQP y datos en el cuerpo (ADR-0013) | ⚠️ Distinto. Es un ejemplo, no un contrato |
| CORS del Gateway | Por defecto solo `http://localhost:3000` | Nuestro front corre en `http://localhost:5173` | ⚠️ Pedir que agreguen el origen |

**Conclusión:** la infraestructura está alineada. Las dos diferencias de mensajería no son incumplimientos, porque la plataforma las presenta como propuesta. Aun así, conviene alinearse: con `evento.cancelado` y `evento.actualizado`, un solo mensaje sirve a Notificaciones, Catálogo, Entradas y Promociones a la vez, que es justo lo que se acordó con Notificaciones. Lo decide el equipo técnico (Joaquín / Etienne) y, si se cambia, se registra en un ADR.

---

## 7. Squads sin contacto todavía

| Squad | Qué falta |
|---|---|
| Catálogo | Confirmar routing key, campos y rutas por el Gateway |
| Plataforma (ayudante) | Cuándo se levantan Gateway y RabbitMQ compartidos; agregar `http://localhost:5173` a `CORS_ORIGINS`; si la convención de nombres de eventos ya es obligatoria |

---

## 8. Resumen de compromisos

| # | Compromiso | Responsable | Para cuándo |
|---|---|---|---|
| 1 | Publicar el mensaje a Notificaciones en CANCELADO y reprogramación (no en publicación) | Joaquín / Etienne | Sprint 3 (Avance 3, 05/11) |
| 2 | Preguntar al ayudante si la convención `evento.creado` / `evento.cancelado` ya es obligatoria, y pedir que agregue `http://localhost:5173` a `CORS_ORIGINS` | Mariajosé | Sprint 3 (Avance 3, 05/11) |
| 2b | Decidir si Panel cambia a `evento.creado` / `evento.actualizado` / `evento.cancelado` (y registrarlo en un ADR) | Joaquín / Etienne | Sprint 3 (Avance 3, 05/11) |
| 3 | Pedir a Entradas la lista de campos de `inventario_evento` y ajustar el mensaje de Panel y el contrato | Mariajosé pide · Etienne / Joaquín ajustan | Sprint 3 (Avance 3, 05/11) |
| 4 | Pedir a Auth el hostname, el puerto y el repo del Dockerfile | Mariajosé | Sprint 3 (Avance 3, 05/11) |
| 5 | Esperar respuesta de Promociones sobre mecanismo y sprint | Mariajosé | Sprint 3 (Avance 3, 05/11) |
| 6 | Confirmar con Check-in lo nuevo del Sprint 3 (Gateway, cola, formato de error) | Mariajosé | Sprint 3 (Avance 3, 05/11) |
| 7 | Contactar a Catálogo y Plataforma | Mariajosé | Sprint 3 (Avance 3, 05/11) |
| 8 | Preguntar a Notificaciones si necesitan "agotado" (Entradas ya lo publica en `stock.agotado`) | Mariajosé | Sprint 3 (Avance 3, 05/11) |
