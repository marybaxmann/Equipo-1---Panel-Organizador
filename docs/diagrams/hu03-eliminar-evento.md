# HU-03 — Eliminar un evento

## Objetivo

Permitir que un organizador autorizado elimine un evento, considerando previamente si existen entradas asociadas al evento.

## Diagrama de secuencia

```mermaid
sequenceDiagram
    actor O as Organizador
    participant F as Frontend Panel
    participant G as API Gateway
    participant P as Panel Organizador
    participant A as Auth
    participant E as Entradas / Inventario
    participant DB as Base de datos
    participant B as Broker

    O->>F: Solicita eliminar evento
    F->>G: DELETE /events/{eventId}
    G->>P: Solicitud de eliminación

    P->>A: Validar autenticación y obtener datos
    A-->>P: userId + rol + autorización

    P->>DB: Buscar evento por eventId
    DB-->>P: Datos del evento

    P->>P: Verificar que el evento pertenece al organizador

    P->>E: Consultar si existen entradas asociadas
    E-->>P: Resultado de la consulta

    alt No existen entradas asociadas
        P->>DB: Eliminar evento
        DB-->>P: Evento eliminado

        P->>B: Publicar event.deleted

        P-->>G: 200 OK
        G-->>F: Evento eliminado
        F-->>O: Confirmación
    else Existen entradas asociadas
        P-->>G: Operación no permitida / pendiente regla
        G-->>F: Informar restricción
        F-->>O: Mostrar mensaje
    end
