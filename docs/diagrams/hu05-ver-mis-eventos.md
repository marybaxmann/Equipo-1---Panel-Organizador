# HU-05 — Ver mis eventos

## Objetivo

Permitir que un organizador autenticado visualice los eventos asociados a su cuenta.

## Diagrama de secuencia

```mermaid
sequenceDiagram
    actor O as Organizador
    participant F as Frontend Panel
    participant G as API Gateway
    participant P as Panel Organizador
    participant A as Auth
    participant DB as Base de datos

    O->>F: Ingresa a "Mis eventos"
    F->>G: GET /events/mine
    G->>P: Solicitud de eventos del organizador

    P->>A: Validar autenticación y obtener datos
    A-->>P: userId + rol + autorización

    P->>DB: Buscar eventos por organizerId
    DB-->>P: Lista de eventos asociados

    P-->>G: 200 OK + lista de eventos
    G-->>F: Lista de eventos
    F-->>O: Mostrar eventos

