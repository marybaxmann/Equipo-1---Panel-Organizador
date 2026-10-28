# Mensajes de alineación técnica — Sprint 3 (Integración con la plataforma TicketU)

Este documento contiene los mensajes cortos listos para enviar a cada squad (Check-in, Entradas, Catálogo, Notificaciones, Promociones, Auth, Cátedra y Pagos) con el objetivo de cerrar los acuerdos del Sprint 3.

---

## 1. Check-in

**Destinatario:** Equipo Check-in  
**De:** Mariajosé Baxmann (Gestión y Negociación de Contratos) / Etienne Araya (Calidad e Integración · Panel Organizador)  
**Asunto:** [Sprint 3] Confirmación de contrato Check-in ↔ Panel Organizador (contrato v1.2, propuesta v1.3)

Hola equipo Check-in,

Desde Panel Organizador estamos cerrando las definiciones de integración para el Sprint 3 y queremos confirmar los siguientes puntos:

1. **Recepción vía Gateway y broker:**
   - **Broker:** Exchange topic `ticketu.events`, routing key `panel.evento.checkin.v1`. Panel publica con el sobre en propiedades AMQP (ADR-0013) y el payload acordado en el cuerpo.
   - **Respaldo REST:** Disponible en `GET /api/organizador/v1/panel/eventos/{id_evento}` vía API Gateway (o `GET /api/v1/panel/eventos/{id_evento}` directo). Requiere sesión con rol `staff` u `organizador` (validada con Auth).
2. **Formato de error en REST:** En su contrato v1.2 se indicó alineación con el formato de Auth `{ codigo_http, error, mensaje }`. En Panel mantenemos el estándar `{ error: { codigo, mensaje, detalles } }` (ADR-0006 y ADR-0011 §3). ¿Aceptan el formato de Panel o requieren mantener el formato plano de Auth? (Esto involucra la decisión común con Auth).
3. **Manejo de fechas:** Confirmar distinción entre `fecha_evento` (`AAAA-MM-DD`), `hora_evento` y `hora_fin_evento` (`HH:mm`, zona `America/Santiago`), y `fecha_cambio` (timestamp ISO 8601 del momento de actualización para control de concurrencia e idempotencia).
4. **Política de ACK y reintentos (Propuesta de Panel):** Proponemos cola durable propia de Check-in, ACK tras persistir localmente, hasta 3 reintentos con backoff, y descarte seguro por `fecha_cambio` (ver ADR-0014).
5. **Sprint de integración y contacto:** Confirmar en qué sprint se integrarán y quién es la persona de contacto técnico de su squad.

Quedamos atentos a sus comentarios.

---

## 2. Entradas / Inventario

**Destinatario:** Equipo Entradas / Inventario  
**De:** Mariajosé Baxmann (Gestión y Negociación de Contratos) / Etienne Araya (Calidad e Integración · Panel Organizador)  
**Asunto:** [Sprint 3] Integración y sincronización de eventos y stock (contrato v1.2, propuesta v1.3)

Hola equipo Entradas,

Para coordinar la integración del Sprint 3 entre Panel y Entradas, necesitamos acordar los siguientes aspectos:

1. **Canal de eventos y rutas:**
   - Panel publica cambios de eventos en el exchange `ticketu.events` con routing key `panel.evento.entradas.v1`.
   - Consulta REST de respaldo: `GET /api/organizador/v1/panel/eventos/{id_evento}` vía API Gateway (o `GET /api/v1/panel/eventos/{id_evento}` directo).
2. **Autenticación en la consulta REST:** Actualmente el endpoint exige sesión con rol `staff` u `organizador`. Como Entradas realiza consultas entre microservicios (M2M) sin un usuario interactivo, proponemos acordar un token de servicio con rol `staff` o credencial de servicio autorizada. ¿Cómo planean autenticar la llamada?
3. **Tipo de cambio y operaciones:** El cuerpo del mensaje actual no incluye un atributo `tipo_cambio` (viaja en las cabeceras AMQP `type`). ¿Requieren `tipo_cambio` explícito en el JSON (`CREADO`, `PUBLICADO`, `ACTUALIZADO`, `CANCELADO`)? Además, para eventos con `tipo_entrada = PAGADA`, falta incluir el atributo `precio`. ¿Lo requieren en el mensaje?
4. **Notificación de stock y disponibilidad:**
   - Confirmar el endpoint de consulta `GET /api/v1/entradas/eventos/{id_evento}/stock`.
   - Confirmar publicación en broker en la routing key `entradas.evento.stock.v1` cuando `stock = 0` (evento `AGOTADO`).
   - ¿Qué mensaje emiten si el stock vuelve a subir tras haber llegado a 0 (por devoluciones o reservas liberadas) para volver a `DISPONIBLE`?
5. **Comportamiento ante cancelación:** Al recibir `CANCELADO`, ¿Entradas bloquea ventas y anula entradas pendientes? ¿Cómo afecta esto a la regla de comparación `stock = cantidad_entradas` si un organizador edita la cantidad inicial tras registrar ventas?
6. **Sprint y contacto:** Confirmar sprint previsto de integración y contacto técnico responsable.

---

## 3. Catálogo de Eventos

**Destinatario:** Equipo Catálogo de Eventos  
**De:** Mariajosé Baxmann (Gestión y Negociación de Contratos) / Etienne Araya (Calidad e Integración · Panel Organizador)  
**Asunto:** [Sprint 3] Alineación de contrato Catálogo ↔ Panel Organizador (contrato v1.1, propuesta v1.2)

Hola equipo Catálogo,

Revisando la integración del Sprint 3, contrastamos el contrato documental con la implementación real del publicador (`backend/src/modules/mensajeria/evento.notifier.ts` y `evento.mapper.ts`) y detectamos diferencias que requerimos validar:

### Comparación exacta entre contrato y código real:
- **`hora_fin_evento`:** El código real **sí envía `hora_fin_evento`** (ej. `"23:30"` o `null`) en el payload del broker y en el detalle REST, pero el contrato v1.1 no lo contemplaba. Proponemos incorporarlo formalmente para mostrar el horario de término.
- **Formato de `fecha_evento`:** El contrato indicaba "ISO 8601" en la tabla pero el ejemplo mostraba `"2026-09-25"`. El código emite string fecha `AAAA-MM-DD`. Proponemos ratificar formato fecha `AAAA-MM-DD` y hora `HH:mm` (zona `America/Santiago`).
- **Estados que disparan mensaje:** En el código actual sólo se publica mensaje ante `PUBLICADO` (`evento_publicado`) y edición de publicados (`evento_actualizado`). **No se emite mensaje ante `CANCELADO`, `FINALIZADO` ni eliminación.** ¿Requieren que Panel publique en `panel.evento.catalogo.v1` cuando un evento sea cancelado o finalizado para darlo de baja de la cartelera?
- **`estado_disponibilidad`:** El código local calcula `PASADO` (si la fecha ya transcurrió en Santiago) o `DISPONIBLE`. El valor `AGOTADO` depende del aviso de Entradas. ¿Requieren que Panel mantenga este cálculo o Catálogo calcula `PASADO` por tiempo en su vista?

### Preguntas adicionales:
1. **Rutas vía Gateway:** Aclarar que vía Gateway las rutas son `GET /api/organizador/v1/organizador/eventos/proximos`, `POST /api/organizador/v1/organizador/eventos/buscar` y `GET /api/organizador/v1/organizador/eventos/{id_evento}`. Confirmar si son endpoints públicos (sin sesión).
2. **Criterios de búsqueda:** ¿Qué estructura exacta requiere el body de `/buscar` (ej. `{ texto: string, categoria?: string }`)?
3. **Broker y ACK:** Exchange `ticketu.events`, routing key `panel.evento.catalogo.v1`. Proponemos cola durable, ACK tras procesar y 3 reintentos (ADR-0014).
4. **Sprint y contacto:** Confirmar sprint acordado de integración y persona de contacto técnico.

---

## 4. Notificaciones

**Destinatario:** Gabriela Herrera y equipo Notificaciones  
**De:** Mariajosé Baxmann (Gestión y Negociación de Contratos) / Etienne Araya (Calidad e Integración · Panel Organizador)  
**Asunto:** [Sprint 3] Corrección de broker y detalles de mensajes en contrato Notificaciones (contrato v1.3, propuesta v1.4)

Hola Gabriela y equipo Notificaciones,

En el marco del Sprint 3, revisamos la implementación de mensajería (`evento.notifier.ts`) contra el contrato v1.3 y encontramos puntos cruciales a corregir y coordinar:

### Comparación exacta entre contrato y código real:
- **Exchange vs Routing Key (Corrección de concepto):** El contrato v1.3 llamaba "Exchange" a `panel.evento.notificaciones.v1`. En la plataforma compartida, el Exchange es `ticketu.events` (tipo topic) y `panel.evento.notificaciones.v1` es la **routing key**.
- **Ambigüedad de `fecha_cambio`:** En su contrato v1.3, en el mensaje `evento_reprogramado`, el campo `fecha_cambio` representaba la **nueva fecha del evento** (declarado como timestamptz, pero con ejemplo `"2026-09-13"`). El código real emite string `AAAA-MM-DD` para la fecha y `hora_cambio` como `"HH:mm:00"`. Además, en el sobre/cabecera AMQP viaja otro `fecha_cambio` que es el timestamp ISO 8601 del momento en que se grabó la actualización. Proponemos renombrar en el payload a `nueva_fecha_evento` y `nueva_hora_evento` para evitar confusiones.
- **Campos faltantes en el mensaje:**
  - `nombre_evento`: No está en el mensaje actual. Si no viaja, Notificaciones debe consultar a Panel por REST (`GET /api/organizador/v1/panel/eventos/{id_evento}`) para saber cómo se llama el evento a notificar. Proponemos agregarlo al payload.
  - `hora_fin_evento`: Si se reprograma la hora de término, actualmente no viaja en el payload de `evento_reprogramado`. Proponemos agregarlo.
  - Idempotencia: Proponemos usar la propiedad AMQP `messageId` (ID del outbox) para que descarten mensajes duplicados.
- **Consulta de respaldo REST:** Vía Gateway queda disponible en `GET /api/organizador/v1/panel/eventos/{id_evento}/cambios-estado` (y directo en `/api/v1/panel/eventos/{id_evento}/cambios-estado`), retornando el historial ordenado cronológicamente del más reciente al más antiguo.

### Preguntas operativas:
1. **Disparadores de eventos:** El código actual emite `evento_actualizado` ante publicación y `evento_reprogramado` ante cambio de fecha/hora. ¿Necesitan recibir mensaje cuando el evento pase a `CANCELADO`?
2. **Condición de carrera con Entradas:** Cuando un evento se cancela, Notificaciones busca los usuarios con entradas activas. Si Entradas recibe la cancelación primero e invalida las entradas de inmediato, Notificaciones podría encontrar 0 entradas y no notificar a nadie. ¿Cómo evitamos esta condición de carrera entre squads?
3. **Sprint de integración:** Confirmar el sprint acordado con Mariajosé para la prueba conjunta.

---

## 5. Promociones

**Destinatario:** Equipo Promociones  
**De:** Mariajosé Baxmann (Gestión y Negociación de Contratos) / Etienne Araya (Calidad e Integración · Panel Organizador)  
**Asunto:** [Sprint 3] Definición de mecanismo de integración Promociones ↔ Panel (contrato v1.1, propuesta v1.2)

Hola equipo Promociones,

En el contrato actual v1.1 todos los mecanismos quedaron como pendientes. Para el Sprint 3 proponemos definir la arquitectura definitiva:

1. **Mecanismo propuesto:** Publicación asíncrona mediante broker:
   - Exchange: `ticketu.events` (topic).
   - Routing key: `panel.evento.promociones.v1`.
   - Payload emitido al publicar evento: `{ id_evento: string, nombre_evento: string, fecha_evento: string }`.
   - Respaldo REST alternativo: `GET /api/organizador/v1/panel/eventos-disponibles` vía API Gateway (o `GET /api/v1/panel/eventos-disponibles` directo).
2. **Momento de notificación:** ¿En qué momento necesitan conocer el `id_evento`? ¿Al crearse en borrador o únicamente cuando pasa a `PUBLICADO`? (Panel propone al publicar, para no asociar descuentos a borradores incompletos).
3. **Datos adicionales:** ¿Requieren datos de precio base (`precio`), tipo de entrada (`GRATUITA`/`PAGADA`) o aviso cuando el evento pase a `CANCELADO` o `FINALIZADO` para deshabilitar promociones?
4. **Política de ACK y reintentos:** Proponemos cola durable, ACK tras persistir localmente y 3 reintentos (ADR-0014).
5. **Sprint y contacto:** Indicar sprint previsto de integración y contacto técnico responsable.

---

## 6. Auth

**Destinatario:** Equipo Auth  
**De:** Mariajosé Baxmann (Gestión y Negociación de Contratos) / Etienne Araya (Calidad e Integración · Panel Organizador)  
**Asunto:** [Sprint 3] Confirmación de pendientes operacionales y SLA (contrato v1.1, propuesta v1.2)

Hola equipo Auth,

Agradecemos la confirmación previa de los roles `staff` y `organizador`. Para cerrar el contrato en el Sprint 3 necesitamos resolver los siguientes puntos operativos:

1. **SLA, timeout y reintentos:** Panel propone SLA `< 300 ms`, timeout de `1 s` y `1 reintento` antes de aplicar Fail-Secure (503). ¿Confirman estos umbrales? Consideren que endpoints como `GET /api/organizador/v1/panel/eventos/{id}` consultados por Check-in y Entradas tienen un SLA comprometido de `< 300 ms`, por lo que si Auth tarda ~1 s más reintento (~2 s), el SLA ante los otros squads se degrada.
2. **Ambiente de integración (Confirmado en puerto 10000):** Se confirmó que el servicio de Auth opera en el **puerto 10000**. ¿Cuál es el hostname oficial del contenedor en la red Docker compartida `plataforma-eventos-net` (ej. `auth-service`)? En Panel la URL interna para consultar `GET /internal/validar-sesion` quedará configurada como `http://<hostname>:10000` (o `http://localhost:10000` si se ejecuta directamente en el host).
3. **Autenticación inter-servicios:** ¿Cómo debe un servicio sin usuario interactivo (ej. Entradas consultando a Panel) autenticar su petición ante `validar-sesion`? ¿Disponen de tokens de servicio o cuentas técnicas con rol `staff`?
4. **Traspaso de cookie por Gateway:** En `FWizav/backendticketU` ya se confirmó que el proxy del Gateway (`localhost:8080`) preserva y reenvía intacta la `Cookie: jwt` hacia los servicios internos sin recortarla.
5. **Formato de identificador y roles:** Confirmar que `id_usuario` se emite siempre en formato UUID (para estandarizar ejemplos documentales) y compartir la lista completa de valores posibles de `usuario.rol`.
6. **Sprint y contacto:** Registrar sprint de integración y persona de contacto de Auth.

---

## 7. Cátedra / Plataforma TicketU

**Destinatario:** Equipo de Plataforma / Cátedra TITECT  
**De:** Mariajosé Baxmann (Gestión y Negociación de Contratos) / Etienne Araya (Calidad e Integración · Panel Organizador)  
**Asunto:** [Sprint 3] Parámetros de conexión de RabbitMQ y API Gateway compartido

Estimado equipo de Plataforma y Profesores,

Agradecemos la aclaración del 27/10 confirmando el uso de RabbitMQ compartido (`FWizav/backendticketU`). Para completar la configuración de nuestro outbox relay (ADR-0013, ADR-0014) y pruebas de integración requerimos confirmar los siguientes datos técnicos:

1. **Parámetros del Broker RabbitMQ:**
   - Host y puerto dentro de la red Docker (`plataforma-eventos-net`): ¿es `ticketu-rabbitmq:5672`?
   - Virtual host (`vhost`), usuario y contraseña por defecto para el entorno local y de integración.
2. **Exchange y Colas:**
   - ¿El exchange `ticketu.events` (topic, durable) ya viene pre-declarado al levantar la plataforma, o cada servicio emisor debe declararlo de forma pasiva/activa?
   - ¿Existe convención o script de inicialización para declarar las colas durables de cada squad consumidor?
3. **API Gateway:**
   - Confirmar quién levanta el contenedor del Gateway en `http://localhost:8080` y si la variable `ORGANIZADOR_SERVICE_URL=http://organizador-service:3000` está preconfigurada en el compose de plataforma. (En Panel ya verificamos que soporta el prefijo `/api/organizador/v1/*` y reenvío transparente de cookies).
4. **Dead Letter Exchange (DLX):** ¿Existe definido un exchange compartido de mensajes no procesables (DLQ) en la plataforma?

---

## 8. Pagos

**Destinatario:** Equipo Pagos  
**De:** Mariajosé Baxmann (Gestión y Negociación de Contratos) / Etienne Araya (Calidad e Integración · Panel Organizador)  
**Asunto:** [Sprint 3] Definición de flujo de reembolsos ante eventos cancelados

Hola equipo Pagos,

En los contratos de Panel Organizador y Entradas / Inventario (§3.5) se establece que:
*"Las devoluciones o reembolsos quedan fuera de este contrato y corresponden al microservicio responsable de Pagos"*.

Dado que actualmente no existe un contrato bilateral formalizado entre Pagos y Panel Organizador, necesitamos acordar:

1. **Disparador de reembolsos:** Cuando un organizador cancela un evento en Panel, Panel emite un evento con `estado_gestion = CANCELADO` en el exchange `ticketu.events`.
   - **Propuesta de Panel:** Pagos se suscribe a los eventos de cancelación o Entradas notifica a Pagos la lista de órdenes/entradas a reembolsar.
   - ¿Requiere Pagos un evento específico desde Panel (ej. `panel.evento.pagos.v1`) con datos del evento cancelado, o Pagos coordina los reembolsos directamente con Entradas a partir de las transacciones registradas?
2. **Datos requeridos:** En caso de suscripción directa a Panel, ¿qué datos requiere Pagos (`id_evento`, `id_organizador`, motivo de cancelación)?
3. **Mecanismo:** Broker asíncrono o API REST.
4. **Contacto:** Persona de contacto técnico del squad Pagos para coordinar el contrato.
