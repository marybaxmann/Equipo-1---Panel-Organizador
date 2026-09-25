# Contrato de interfaz: Panel Organizador ↔ Notificaciones

**Versión:** 1.0

**Equipos consumidor/proveedor:** Notificaciones / Panel Organizador

**Basado en:** HU-04 Publicar evento; HU-07 Notificar cambios de estado.

---

## 1. Propósito

Panel Organizador comunica a Notificaciones los cambios relevantes de un evento para que dicho servicio pueda generar las notificaciones correspondientes a los usuarios afectados.

---

# 2. Operación: Notificar cambio de evento

## 2.1 Descripción

Panel Organizador publica un mensaje cuando ocurre un cambio en un evento que deba ser comunicado a los usuarios.

## 2.2 Quién la expone

Equipo Panel Organizador.

## 2.3 Quién la consume

Equipo Notificaciones.

## 2.4 Canal de comunicación

La comunicación será asíncrona mediante un **broker de mensajes**.

**Nombre propuesto del tópico:**

```text
panel.evento.notificaciones.v1
```

Se propone este nombre para identificar los mensajes publicados por Panel destinados a Notificaciones y diferenciarlos de los tópicos utilizados por otros microservicios.

> El nombre del tópico y la convención de versionado quedan pendientes de confirmación con Notificaciones.

## 2.5 Request — mensaje enviado

| Campo          | Tipo       | Obligatorio | Descripción                                       |
| -------------- | ---------- | :---------: | ------------------------------------------------- |
| `tipo`         | string     |      Sí     | Tipo de mensaje. Propuesto: `evento_actualizado`. |
| `id_evento`    | string     |      Sí     | Identificador del evento modificado.              |
| `nuevo_estado` | string     |      Sí     | Nuevo estado del evento.                          |
| `fecha_cambio` | fecha-hora |      Sí     | Fecha y hora en que se realizó el cambio.         |

**Ejemplo:**

```json
{
  "tipo": "evento_actualizado",
  "id_evento": "evt-001",
  "nuevo_estado": "CANCELADO",
  "fecha_cambio": "2026-09-10T12:00:00"
}
```

El campo `tipo` se mantiene dentro del mensaje según la propuesta de Notificaciones. Queda pendiente confirmar si este campo es necesario considerando que el tipo de mensaje también puede quedar identificado mediante el tópico.

---

## 2.6 Comunicación posterior

Al tratarse de una comunicación asíncrona mediante broker, no existe una respuesta síncrona de negocio asociada al mensaje.

Notificaciones propone informar posteriormente el resultado del procesamiento mediante una comunicación asíncrona hacia Panel, incluyendo información como:

* `id_evento`
* `estado_envio`
* `usuarios_notificados`
* `usuarios_faltantes`
* `fecha_envio`
* `mensaje`

La forma exacta de esta comunicación queda pendiente de definición.

---

## 2.7 Códigos de error

Al tratarse de una comunicación asíncrona, no se utilizan códigos HTTP como respuesta del evento.

Los errores de procesamiento serán gestionados por Notificaciones.

Notificaciones propone realizar hasta **3 intentos** antes de registrar el error correspondiente.

---

## 2.8 Tiempo de respuesta esperado

Notificaciones propone que Panel publique el evento inmediatamente después del cambio correspondiente, con un tiempo máximo de **5 segundos**.

---

# 3. Reglas de uso

1. Panel publica el mensaje cuando ocurre un cambio de evento que deba ser comunicado.
2. Notificaciones permanece suscrito al tópico mediante el broker.
3. Notificaciones identifica el evento mediante `id_evento`.
4. Notificaciones obtiene los usuarios que poseen entradas activas para el evento.
5. Notificaciones genera y almacena las notificaciones correspondientes.
6. Notificaciones realiza hasta 3 intentos en caso de error.
7. Una vez finalizado el procesamiento, Notificaciones podrá informar el resultado a Panel, sujeto a la definición de la comunicación posterior.

---

# 4. Estados del evento

Panel utiliza los siguientes estados:

| Estado       | Descripción                          |
| ------------ | ------------------------------------ |
| `BORRADOR`   | Evento creado pero no publicado.     |
| `PUBLICADO`  | Evento disponible para operaciones.  |
| `FINALIZADO` | Evento realizado y cerrado.          |
| `CANCELADO`  | Evento cancelado por el organizador. |

Notificaciones propone además el estado:

```text
REPROGRAMADO
```

### Pendiente de aclaración

Se debe confirmar con Notificaciones si `REPROGRAMADO` corresponde a:

* un estado adicional que Panel debe manejar, o
* un cambio de fecha/hora del evento que debe generar una notificación, sin convertirse necesariamente en un estado permanente.

También se debe confirmar qué estados requieren una notificación y si todos los cambios indicados deben ser enviados mediante este contrato.

---

# 5. Versionado y cambios

Los cambios en la estructura del mensaje deberán ser versionados cuando sean incompatibles con la versión anterior.

Por ejemplo:

```text
panel.evento.notificaciones.v1
```

podría evolucionar a:

```text
panel.evento.notificaciones.v2
```

ante un cambio incompatible.

Los cambios de versión deberán ser comunicados y coordinados entre ambos equipos.

---

# 6. Pendientes a acordar

* [ ] Confirmar el nombre `panel.evento.notificaciones.v1`.
* [ ] Confirmar la convención de versionado del tópico.
* [ ] Confirmar si el campo `tipo` es necesario además del tópico.
* [ ] Confirmar qué significa exactamente la comunicación de confirmación desde Notificaciones hacia Panel.
* [ ] Confirmar si el resultado del procesamiento (`estado_envio`, `usuarios_notificados`, etc.) debe ser enviado a Panel.
* [ ] Confirmar cómo se manejará el ACK técnico del broker y los errores de entrega/procesamiento.
* [ ] Confirmar qué estados generan una notificación.
* [ ] Confirmar si `REPROGRAMADO` es un estado o representa un cambio de fecha/hora.
