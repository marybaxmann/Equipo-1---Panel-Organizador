# HU-07 — Notificar cambios de estado

## Objetivo

Permitir que el Panel Organizador informe a otros microservicios cuando un evento cambia de estado.

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

    O->>F: Ejecuta acción sobre el evento
    F->>G: Solicitud de cambio
    G->>P: Solicitud recibida

    P->>A: Validar autenticación y obtener datos
    A-->>P: userId + rol + autorización

    P->>DB: Actualizar estado del evento
    DB-->>P: Estado actualizado

    P->>B: Publicar cambio de estado

    B-->>C: Notificar cambio
    B-->>E: Notificar cambio
    B-->>N: Notificar cambio

    P-->>G: Operación exitosa
    G-->>F: Confirmación
    F-->>O: Mostrar resultado
