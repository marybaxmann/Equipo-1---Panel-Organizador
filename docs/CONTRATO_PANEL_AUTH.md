# Contrato de interfaz: Auth ↔ Panel Organizador

**Versión:** 1.1  
**Proveedor:** Auth  
**Consumidor:** Panel Organizador

---

## 1. Propósito

Definir la validación de sesión e identidad utilizada por **Panel Organizador** antes de ejecutar operaciones protegidas.

**Auth** valida la autenticación y entrega la identidad vigente. **Panel Organizador** aplica las reglas de autorización propias sobre sus eventos.

---

## 2. Acuerdos confirmados

### 2.1 Validación de sesión

Panel consulta:

```http
GET /internal/validar-sesion
```

enviando la cookie original recibida desde el Frontend:

```http
Cookie: jwt=...
```

Panel no extrae, modifica ni valida localmente el JWT.

### 2.2 Respuesta de Auth

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

Panel utiliza `usuario.id_usuario` como identidad autenticada y `usuario.rol` para aplicar sus reglas de autorización.

No se utilizará un `id_usuario` enviado directamente por el Frontend como fuente de identidad.

### 2.3 Manejo de errores

| Código | Tratamiento |
|---|---|
| `401` | Panel detiene la operación protegida. |
| `403` | Panel bloquea la operación. |
| `500` | Panel aborta la operación. |
| `503` | Ante timeout o indisponibilidad de Auth, Panel aplica Fail-Secure. |

### 2.4 Responsabilidades

| Responsabilidad | Servicio |
|---|---|
| Validación de sesión y JWT | Auth |
| Identidad y rol vigente | Auth |
| Autorización sobre operaciones de eventos | Panel Organizador |
| Validación de propiedad del evento | Panel Organizador |

---

## 3. Propuestas de Panel pendientes de confirmación

### 3.1 SLA y timeout

**Panel propone:**

```text
SLA < 300 ms
Timeout = 1 segundo
```

Si Auth no responde dentro del timeout, Panel considera que la identidad no pudo validarse.

### 3.2 Reintentos

**Panel propone:** realizar como máximo **1 reintento** ante timeout, conexión rechazada o indisponibilidad temporal.

```text
Primer intento falla
→ 1 reintento
→ si vuelve a fallar
→ Fail-Secure
→ Panel responde 503
```

No se realizan reintentos ante `401` o `403`.

### 3.3 Configuración del servicio

**Panel propone:** configurar la dirección de Auth mediante una variable de entorno:

```text
AUTH_SERVICE_URL
```

Auth deberá proporcionar el valor correspondiente para el ambiente de integración.

---

## 4. Pendientes de confirmación

Auth debe confirmar:

1. SLA `< 300 ms`.
2. Timeout de `1 segundo`.
3. Política de `1 reintento` ante indisponibilidad.
4. URL/base del servicio para el ambiente de integración.
5. Contactos responsables de ambos equipos.
