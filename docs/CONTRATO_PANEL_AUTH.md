# Contrato de interfaz: Auth ↔ Panel Organizador

**Versión:** 1.0

**Equipo consumidor:** Panel Organizador

**Equipo proveedor:** Auth

**Basado en:** HU-01 Crear evento; HU-02 Editar evento; HU-03 Eliminar evento; HU-04 Publicar evento; HU-05 Ver mis eventos; HU-06 Verificación de autorización.

---

## 1. Propósito

El Panel Organizador necesita validar la sesión e identificar al usuario autenticado antes de ejecutar operaciones protegidas sobre eventos. Auth es el proveedor de identidad y sesión, y retorna al Panel un perfil vigente y normalizado.

Auth valida la autenticación; Panel Organizador aplica las reglas de autorización propias de su dominio, por ejemplo comprobar que el usuario tenga el rol correspondiente y que pueda operar sobre un evento específico.

---

## 2. Operación: Validar sesión y obtener identidad

### 2.1 Descripción

Valida la vigencia de la sesión y retorna la identidad y el rol vigente del usuario.

### 2.2 Quién la expone

Equipo Auth.

### 2.3 Quién la consume

Equipo Panel Organizador, inmediatamente antes de procesar una operación que requiera autenticación o conocer la identidad real del usuario.

### 2.4 Endpoint

```http
GET /internal/validar-sesion
```

### 2.5 Request (lo que se envía)

| Campo / Header | Tipo | Obligatorio | Descripción |
|---|---|:---:|---|
| `Cookie` | string | Sí | Cookie original recibida desde el Frontend; debe contener `jwt=...`. |

**Ejemplo:**

```http
GET /internal/validar-sesion HTTP/1.1
Host: auth-service.internal
Cookie: jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> **Importante:** Panel Organizador no debe extraer, modificar, reconstruir ni validar localmente el JWT. Debe reenviar la cookie original a Auth.

### 2.6 Response (lo que se recibe)

| Campo | Tipo | Obligatorio | Descripción |
|---|---|:---:|---|
| `valido` | boolean | Sí | Indica que la sesión está vigente. |
| `usuario.id_usuario` | string (UUID v4) | Sí | Identidad autenticada que Panel debe usar para sus reglas de negocio. |
| `usuario.nombre_completo` | string | Sí | Nombre normalizado del usuario. |
| `usuario.rut` | string | Sí | RUT retornado por Auth. |
| `usuario.correo_electronico` | string | Sí | Correo del usuario. |
| `usuario.rol` | string | Sí | Rol vigente del usuario. |

**Ejemplo:**

```json
{
  "valido": true,
  "usuario": {
    "id_usuario": "3f1e2c1a-4b8d-4a2e-9c3f-7d1e2f9b2d4a",
    "nombre_completo": "Javier Romero",
    "rut": "21.xxx.xxx-x",
    "correo_electronico": "javier@ejemplo.cl",
    "rol": "organizador"
  }
}
```

> **Nota de diseño:** Panel debe usar `id_usuario` y `rol` retornados por Auth como fuente vigente para aplicar sus reglas de autorización. No debe confiar en un ID de identidad enviado directamente por el Frontend.

### 2.7 Códigos de error

| Código | Significado |
|---|---|
| `401` | Sesión/token ausente, inválido, expirado, revocado o usuario inexistente/bloqueado. |
| `403` | El servicio consumidor no está autorizado para acceder al endpoint interno. |
| `500` | Error interno de Auth. |
| `503` | Auth no disponible, timeout o conexión rechazada. |

### 2.8 Tiempo de respuesta esperado (SLA)

**Pendiente de acordar con Auth.**

---

## 3. Reglas de uso (lado consumidor)

1. Panel recibe la solicitud del Frontend con la cookie de sesión.
2. Antes de ejecutar lógica de negocio protegida, consulta `GET /internal/validar-sesion`.
3. Reenvía la cookie original sin alterar el JWT.
4. Si Auth responde `200`, utiliza `usuario.id_usuario` y `usuario.rol`.
5. Panel aplica sus propias reglas de autorización sobre los eventos.
6. Ante `401`, `403`, `500` o indisponibilidad, detiene la operación protegida.
7. Ante timeout o caída de Auth, aplica Fail-Secure y responde `503`.
8. No registra el token completo en logs.

---

## 4. Versionado y cambios

- Cualquier cambio en request/response debe ser versionado y comunicado.
- Los breaking changes requieren un período de transición acordado entre ambos equipos.
- El contrato publicado por Auth es la fuente técnica de verdad para esta operación.

## 5. Dueños del contrato

| Rol | Equipo | Contacto |
|---|---|---|
| Dueño del contrato | Auth | Pendiente |
| Consumidor principal | Panel Organizador | Pendiente |

---

## 6. Pendientes a acordar

- [ ] Confirmar SLA.
- [ ] Confirmar timeout de la llamada interna.
- [ ] Confirmar política de reintentos.
- [ ] Confirmar URL/base de servicio en el ambiente de integración.
- [ ] Completar contactos de ambos equipos.
