# HU-04 — Publicar un evento

## Objetivo

Permitir que un organizador autorizado publique un evento previamente creado.

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
    participant C as Catálogo
    participant E as Entradas / Inventario
    participant N as Notificaciones

    O->>F: Solicita publicar evento
    F->>G: PATCH /events/{eventId}/publish
    G->>P: Solicitud de publicación

    P->>A: Validar autenticación y obtener datos
    A-->>P: userId + rol + autorización

    P->>DB: Buscar evento por eventId
    DB-->>P: Datos del evento

    P->>P: Verificar que el evento pertenece al organizador
    P->>P: Validar datos necesarios para publicación

    P->>DB: Cambiar estado a Publicado
    DB-->>P: Evento actualizado

    P->>B: Publicar evento de cambio de estado

    B-->>C: Evento publicado / actualizado
    B-->>E: Evento publicado
    B-->>N: Evento publicado

    P-->>G: 200 OK + evento publicado
    G-->>F: Datos actualizados
    F-->>O: Confirmación de publicación
