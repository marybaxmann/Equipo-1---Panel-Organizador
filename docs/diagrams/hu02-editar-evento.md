# HU-02 — Editar un evento

## Objetivo

Permitir que un organizador autorizado edite los datos de un evento creado previamente.

## Diagrama de secuencia

```mermaid
sequenceDiagram
    actor O as Organizador
    participant F as Frontend Panel
    participant G as API Gateway
    participant P as Panel Organizador
    participant A as Auth
    participant DB as Base de datos
    participant B as Broker

    O->>F: Selecciona evento y modifica datos
    F->>G: PATCH /events/{eventId}
    G->>P: Solicitud de edición
    P->>A: Validar autenticación y obtener datos
    A-->>P: userId + rol + autorización

    P->>DB: Buscar evento por eventId
    DB-->>P: Datos del evento

    P->>P: Verificar que el evento pertenece al organizador

    P->>DB: Actualizar datos del evento
    DB-->>P: Evento actualizado

    opt Cambio debe notificarse a otros microservicios
        P->>B: Publicar event.updated
    end

    P-->>G: 200 OK + evento actualizado
    G-->>F: Datos actualizados
    F-->>O: Confirmación de edición
