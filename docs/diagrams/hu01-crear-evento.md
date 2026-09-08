# HU-01 — Crear un evento

## Objetivo
Permitir que un organizador autorizado cree un evento.

## Diagrama de secuencia

```mermaid
sequenceDiagram
    actor O as Organizador
    participant F as Frontend Panel
    participant G as API Gateway
    participant P as Panel Organizador
    participant A as Auth
    participant DB as Base de datos

    O->>F: Completa formulario
    F->>G: POST /events
    G->>P: Solicitud de creación
    P->>A: Validar identidad y rol
    A-->>P: userId + autorización
    P->>DB: Guardar evento
    DB-->>P: Evento creado
    P-->>G: 201 Created
    G-->>F: Datos del evento
    F-->>O: Confirmación


