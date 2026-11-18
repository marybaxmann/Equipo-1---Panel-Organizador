# ADR-0017 — Sobre dentro del cuerpo del mensaje para Entradas (`{ envelope, payload }`)

- **Estado:** Propuesta · implementado (Sprint 4)
- **Fecha:** 2026-11-16
- **Responsables:** Backend (Joaquín) · Integración (Etienne)
- **Reemplaza en parte a:** ADR-0013, sólo en el formato del cuerpo para los tópicos configurados
- **Afecta a:** `outbox.relay.ts`, variable `BROKER_TOPICOS_CON_SOBRE`, contrato Entradas §3.1

---

## 1. Contexto

ADR-0013 dejó el cuerpo de cada mensaje igual al del contrato de cada squad y puso el sobre (`tipo`, `id_evento`, `version`, `fecha_cambio`) en las propiedades AMQP.

El 16/11 revisamos el consumidor real de Entradas (`back-end/services/broker_service.py` de su repo, commit `fa38b83`). Ese consumidor lee el cuerpo como `{ envelope, payload }`, igual que su `docs/contratos/contrato-mensajeria-panel.md`. Con nuestro cuerpo plano, `payload` le queda vacío, no encuentra `id_evento` y **descarta el mensaje sin error**. La evidencia de la Evaluación 2 usaba una cola de control propia, así que el problema no se había visto.

## 2. Decisión

- El relay acepta una lista de tópicos (`BROKER_TOPICOS_CON_SOBRE`, separados por coma). En esos tópicos el cuerpo es:

  ```json
  {
    "envelope": { "id_mensaje": "<_id del outbox>", "tipo": "evento_publicado", "id_evento": "…", "version": 1, "fecha_cambio": "…", "timestamp": "…" },
    "payload": { "id_evento": "…", "id_usuario": "…", "nombre_evento": "…", "fecha_evento": "…", "hora_evento": "…", "cantidad_entradas": 300, "tipo_entrada": "GRATUITA", "estado_gestion": "PUBLICADO", "precio": null }
  }
  ```

- Hoy la lista es sólo `panel.evento.entradas.v1` (`.env.example` y `docker-compose.integracion.yml`). Los demás squads siguen recibiendo el cuerpo plano de su contrato.
- Las propiedades AMQP no cambian: el sobre también sigue en las cabeceras.
- El mensaje a Entradas suma `precio`, porque su inventario guarda `precio_unitario` (sin el campo asume 10000).

Se eligió que el Panel se adapte porque depende sólo de nosotros y la integración I1 se prueba el 17/11.

## 3. Consecuencias

- Entradas procesa `evento_creado`, `evento_publicado` y `evento_actualizado` sin cambiar su código.
- **Pendiente de Entradas** (su código, no el nuestro):
  1. Leer `envelope.tipo`. Hoy trata todo mensaje `panel.*` como alta o actualización: un `evento_eliminado` (sin `cantidad_entradas`) quedaría guardado como PUBLICADO con 100 entradas.
  2. No reiniciar `stock_actual` en cada actualización: hoy se pierde lo vendido, y HU-03 decidiría borrar un evento que sí tenía ventas.
  3. Con `evento_cancelado`, dejar de vender las entradas del evento (contrato Entradas §3.5).
