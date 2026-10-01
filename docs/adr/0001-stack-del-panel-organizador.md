# ADR-0001 — Stack del Panel Organizador

- **Estado:** Rechazado — el equipo acordó Node.js; ver [ADR-0004](0004-stack-node-typescript.md)
- **Fecha:** 2026-09-21
- **Autor:** Joaquín Martínez
- **Decide:** Equipo 1 — Panel Organizador
- **Afecta a:** HU-01, HU-02, HU-03, HU-04, HU-05, HU-06, HU-07 y TASK-08 (Despliegue)

---

## 1. Contexto

El Panel Organizador es uno de los microservicios de TicketU. A la fecha de este
documento el repositorio del equipo contiene **únicamente documentación**: seis
contratos de integración, seis diagramas de secuencia y la planificación por
sprints. No existe código, ni estructura de proyecto, ni decisión escrita sobre
el lenguaje o el framework.

Esto es bloqueante. El Sprint 1 vence el **01/10/2026** e incluye HU-06, HU-01 y
HU-05. Ninguna de las tres puede empezar sin esta definición.

### Qué tiene que hacer este servicio

De los contratos y los diagramas de secuencia se desprenden cuatro
responsabilidades técnicas concretas:

1. **Exponer una API REST** detrás de un API Gateway. Los diagramas nombran al
   menos `POST /events` (HU-01) y `GET /events/mine` (HU-05).
2. **Llamar a Auth de forma síncrona** en cada operación protegida:
   `GET /internal/validar-sesion`, reenviando la cookie `jwt` original **sin
   decodificarla ni modificarla**, y usando el `id_usuario` y `rol` que Auth
   devuelve.
3. **Publicar mensajes en un broker** hacia Catálogo, Entradas, Notificaciones,
   Check-in y Promociones. El nombre del tópico está pendiente de acuerdo, pero
   el esquema de los mensajes ya está especificado campo por campo.
4. **Persistir eventos** con su ciclo de vida (Borrador → Publicado →
   Finalizado / Cancelado) y su asociación al organizador dueño.

### Restricciones que condicionan la decisión

- **Tiempo:** diez días hasta la primera entrega.
- **Fidelidad a los contratos:** los mensajes al broker tienen nombres de campo
  fijos y en español (`id_evento`, `nombre_evento`, `direccion_evento`,
  `fecha_cambio`). Cualquier desviación rompe la integración con los otros
  equipos, y TASK-02 es explícitamente "pruebas de contratos de integración".
- **Equipo universitario:** niveles dispares, sin infraestructura previa.
- **Hay que desplegarlo** (TASK-08), no sólo correrlo en local.

---

## 2. Opciones consideradas

### Opción A — Python + FastAPI

API REST con FastAPI, validación con Pydantic, cliente HTTP con `httpx`,
persistencia con SQLAlchemy, pruebas con `pytest`.

**A favor**
- Pydantic modela los contratos de forma literal: cada tabla de campos de los
  `CONTRATO_PANEL_*.md` se convierte en un modelo con los mismos nombres y tipos,
  y la validación de esquema sale gratis. Esto ataca TASK-02 de frente.
- FastAPI genera OpenAPI automáticamente, que es lo que los otros equipos van a
  pedir para integrar.
- Es el stack más fuerte de quien escribe esto, lo que reduce el riesgo de las
  tres HU del Sprint 1.
- Huella chica: un microservicio de un solo recurso arranca en pocos archivos.
- Clientes de broker maduros para las alternativas realistas (`pika` para RabbitMQ,
  `aiokafka` para Kafka).

**En contra**
- Requiere decidir y cablear a mano cosas que un framework opinado ya trae
  resueltas (estructura de carpetas, migraciones, inyección de dependencias).
- Si el resto del equipo no sabe Python, la carga de trabajo se concentra.

### Opción B — PHP + Laravel

**A favor**
- Trae de fábrica ORM, migraciones, validación, colas y tests.
- Es el otro stack fuerte de quien escribe esto.

**En contra**
- Pesado para un microservicio que gestiona **un solo recurso**. Se paga el costo
  de un framework full-stack para exponer cuatro endpoints.
- Su sistema de colas está pensado para trabajo asíncrono *interno* de la app, no
  para publicar en un broker compartido entre equipos. Habría que saltearlo y
  usar un cliente AMQP directo, con lo cual se pierde la ventaja principal.
- Imagen de despliegue notablemente más grande.

### Opción C — Node + NestJS

**A favor**
- NestJS tiene transportes de microservicios de primera clase (RabbitMQ, Kafka).
- Si los otros equipos ya eligieron Node, la homogeneidad ayuda a la integración.

**En contra**
- Validación de esquemas menos directa que Pydantic: hay que sumar `class-validator`
  o Zod y mantener los tipos sincronizados a mano.
- Más ceremonia inicial (módulos, providers, decoradores) para llegar al primer
  endpoint funcionando.
- Es el stack donde el equipo tiene menos rodaje.

---

## 3. Decisión propuesta

**Adoptar la Opción A: Python + FastAPI.**

| Capa | Elección | Por qué |
|---|---|---|
| Framework HTTP | FastAPI | OpenAPI automático, async nativo para las llamadas a Auth |
| Validación / esquemas | Pydantic v2 | Los contratos se traducen uno a uno a modelos |
| Cliente HTTP | httpx | Async, timeouts explícitos — necesario para el fail-secure de Auth |
| ORM | SQLAlchemy 2.x + Alembic | Estándar, migraciones versionadas |
| Pruebas | pytest + httpx.AsyncClient | TASK-02, TASK-03 y TASK-05 son todas de pruebas |
| Empaquetado | Docker | TASK-08 pide despliegue |

El criterio que desempata es el tiempo: de las tres opciones, ésta es la que llega
más rápido a tener HU-06 funcionando, y HU-06 es la dependencia de todo lo demás.

---

## 4. Lo que este ADR NO decide

Estos puntos quedan explícitamente abiertos y necesitan su propio ADR o un
acuerdo entre equipos. Listarlos evita que se den por resueltos por omisión.

| Tema | Quién decide | Nota |
|---|---|---|
| Motor de base de datos | Equipo 1 | Candidato: PostgreSQL. Va en ADR-0002. |
| Tecnología del broker | Plataforma / todos los equipos | Panel es consumidor de la decisión, no dueño. |
| Nombre de los tópicos | Acuerdo con cada equipo consumidor | Pendiente en los 5 contratos de broker. |
| Destino de despliegue | Equipo 1 + cátedra | TASK-08. |
| Formato de `horario` y `fecha_evento` | Acuerdo con Catálogo | Pendiente declarado en el contrato. |

---

## 5. Consecuencias

**Positivas**
- El Sprint 1 puede arrancar de inmediato: HU-06, HU-01 y HU-05 dependen sólo del
  contrato de Auth, que es el único de los seis que está cerrado y completo.
- Los esquemas de mensajes quedan expresados como código verificable, no como
  tablas en un `.md` que nadie valida.
- El servicio queda chico y desplegable sin infraestructura pesada.

**Negativas**
- Si otro equipo eligió un stack distinto, el proyecto termina políglota. Es
  aceptable —- es la premisa de una arquitectura de microservicios—- pero encarece
  compartir utilidades entre equipos.
- Al no ser un framework opinado, las convenciones de estructura hay que
  escribirlas y sostenerlas nosotros.

**Riesgo asumido**
- Los cinco contratos de broker están sin cerrar. Esta decisión **no** los
  desbloquea. Mitigación: aislar la publicación detrás de una interfaz propia
  (`EventPublisher`) para que cambiar de broker o de nombre de tópico sea un
  cambio localizado y no una refactorización del dominio.

---

## 6. Cómo se revierte

Hasta que exista lógica de dominio significativa, el costo de cambiar es bajo: se
descarta el proyecto y se rehace en el stack elegido. A partir del Sprint 2 el
costo sube de forma apreciable. **La ventana para discutir esto es ahora.**
