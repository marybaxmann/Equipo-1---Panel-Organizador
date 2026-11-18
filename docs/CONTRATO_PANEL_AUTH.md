# Contrato de interfaz: Auth ↔ Panel Organizador

**Versión:** 1.1 — Actualización de integración, Avance 4  
**Fecha de actualización:** 18/11/2026  
**Proveedor:** Auth  
**Consumidor:** Panel Organizador  
**Protocolo:** HTTP/REST — Comunicación interna entre backends  
**Contrato de referencia:** [CONTRATO_INTEGRACION_AUTH.md v1.1](https://github.com/equipo-auth/arquitectura/blob/main/CONTRATO_INTEGRACION_AUTH.md)

---

## 1. Propósito

Definir la validación de sesión e identidad utilizada por **Panel Organizador** antes de ejecutar operaciones protegidas.

**Auth** es responsable de autenticar usuarios, emitir y validar JWT, verificar la vigencia de las sesiones y entregar la identidad y el rol actual del usuario.

**Panel Organizador** aplica las reglas de autorización propias sobre sus eventos, incluyendo la verificación del rol `organizador` y la propiedad de cada evento.

La integración utiliza comunicación HTTP/REST entre backends. Panel no extrae, modifica, decodifica ni valida localmente el JWT para autenticar usuarios.

La versión 1.1 incorpora autenticación entre servicios mediante la cabecera obligatoria `x-api-key`, conforme al contrato publicado por Auth.

---

## 2. Acuerdos confirmados

### 2.1 Validación de sesión

Panel consulta directamente al servicio Auth mediante el endpoint privado:

```http
GET /internal/validar-sesion
```

La solicitud debe incluir dos cabeceras obligatorias:

```http
Cookie: jwt=<JWT_ORIGINAL>
x-api-key: <CLAVE_INTERNA_COMPARTIDA>
```

- `Cookie`: contiene el JWT original emitido por Auth y recibido desde el frontend.
- `x-api-key`: identifica una solicitud autorizada entre servicios mediante el conocimiento de una clave compartida del entorno.

La llamada se realiza exclusivamente entre backends dentro de la red interna.

Panel no debe consultar este endpoint a través del API Gateway público.

**Flujo de validación:**

1. El usuario inicia sesión mediante Auth.
2. Auth entrega una cookie de sesión `jwt`.
3. El frontend realiza una solicitud protegida a Panel Organizador.
4. Panel reenvía la cookie original a Auth junto con la cabecera `x-api-key`.
5. Auth valida la clave interna, el JWT y el estado vigente del usuario.
6. Auth responde con la identidad y el rol autenticado.
7. Panel aplica las reglas de autorización correspondientes antes de ejecutar la operación.

La validación debe realizarse para cada petición protegida que requiera identidad o rol, sin reutilizar indefinidamente validaciones anteriores.

### 2.2 Respuesta de Auth

Auth devuelve una respuesta exitosa HTTP `200` con la siguiente estructura:

```json
{
  "valido": true,
  "usuario": {
    "id_usuario": "3f1e2c1a-4b8d-4a2e-9c3f-7d1e2f9b2d4a",
    "nombre_completo": "Javier Romero",
    "rut": "12.345.678-5",
    "correo_electronico": "javier@ejemplo.cl",
    "rol": "organizador"
  }
}
```

Panel utiliza:

- `usuario.id_usuario`: identidad autenticada y referencia para comprobar propiedad de eventos.
- `usuario.nombre_completo`: nombre mostrado en el Panel.
- `usuario.rol`: autorización de operaciones según el rol vigente.

Los valores contractuales del campo `usuario.rol` son:

| Rol | Tratamiento en Panel |
|---|---|
| `organizador` | Puede acceder a operaciones de gestión de sus propios eventos. |
| `staff` | Puede consultar los endpoints expresamente autorizados para integraciones, como el GET de respaldo utilizado por Check-in. |
| `usuario` | No tiene permisos para administrar eventos como organizador. |

Los campos `rut` y `correo_electronico` forman parte de la respuesta de Auth, pero Panel no necesita almacenarlos para sus operaciones de gestión de eventos.

El RUT se entrega normalizado con puntos, guion y dígito verificador.

No se utilizarán identificadores ni roles proporcionados directamente por el frontend como fuente de identidad o autorización.

### 2.3 Manejo de errores

| Código HTTP | Significado | Tratamiento en Panel |
|---|---|---|
| `200` | Sesión válida y autenticada | Continuar con la autorización correspondiente. |
| `401` | Cookie ausente, inválida, expirada o revocada | Detener la operación y devolver `401`. |
| `403` | Clave `x-api-key` ausente o incorrecta | Bloquear la operación y registrar el problema sin revelar secretos. |
| `500` | Error interno de Auth | Abortar la operación y responder con un error técnico. |
| `503` | Servicio indisponible o timeout | Aplicar Fail-Secure, sin ejecutar la operación protegida. |

Formato de error definido por Auth:

```json
{
  "valido": false,
  "codigo_http": 401,
  "error": "unauthorized",
  "mensaje": "Sesión ausente, inválida, expirada o revocada"
}
```

La ausencia o invalidez de `x-api-key` se considera un error de autenticación entre servicios (`403`), mientras que una sesión de usuario inválida corresponde a `401`.

Si Auth no está disponible, Panel no debe asumir que el usuario está autenticado ni permitir que continúe la operación protegida.

### 2.4 Responsabilidades

| Responsabilidad | Servicio |
|---|---|
| Emisión y validación del JWT | Auth |
| Validación de la sesión y su vigencia | Auth |
| Verificación de `x-api-key` | Auth |
| Identidad y rol vigente del usuario | Auth |
| Protección y configuración de la clave interna del lado consumidor | Panel Organizador |
| Autorización sobre operaciones de eventos | Panel Organizador |
| Validación de propiedad del evento | Panel Organizador |
| Conservación de la cookie durante el enrutamiento | API Gateway / infraestructura |

Panel debe mantener protegidas las credenciales y no registrar cookies completas, JWT, contraseñas ni claves internas en logs.

### 2.5 Configuración del ambiente de integración

El equipo Auth confirmó los siguientes parámetros para el Avance 4:

| Parámetro | Valor confirmado |
|---|---|
| Servicio Docker | `auth-service` |
| Nombre del contenedor | `ticketu-auth-service` |
| Puerto interno | `10000` |
| URL interna | `http://auth-service:10000` |
| Red Docker | `plataforma-eventos-net` |
| Endpoint interno | `GET /internal/validar-sesion` |

La configuración del backend de Panel debe incluir:

```dotenv
AUTH_SERVICE_URL=http://auth-service:10000
AUTH_INTERNAL_API_KEY=<CLAVE_CONFIGURADA_EN_ENTORNO_PRIVADO>
AUTH_TIMEOUT_MS=1000
```

`AUTH_INTERNAL_API_KEY` corresponde al nombre de variable sugerido por el contrato oficial de Auth. El backend de Panel debe utilizar el nombre que efectivamente lea su implementación.

Auth confirmó que utiliza una clave compartida para el entorno Docker de desarrollo. La clave se entrega y configura de manera privada entre los servicios autorizados.

**No se debe publicar la clave real en GitHub, archivos versionados, frontend ni documentación pública.**

### 2.6 Login y cuentas de prueba

Auth confirmó que el login del organizador está disponible mediante:

```http
POST http://localhost:8080/api/auth/login
```

El cuerpo de la solicitud utiliza:

```json
{
  "email": "<CORREO_DE_PRUEBA>",
  "password": "<CONTRASENA_DE_PRUEBA>",
  "admin": true
}
```

La interfaz web de Auth se encuentra en:

```text
http://localhost:3001/admin/login
```

Auth confirmó la disponibilidad de cuentas QA correspondientes a:

- Dos usuarios con rol `organizador`.
- Un usuario con rol `staff`.

Estas cuentas requieren que el entorno de Auth haya ejecutado previamente su seed QA.

Las credenciales de acceso se comparten únicamente por canales privados y no se incluyen en este contrato.

### 2.7 Creación y recuperación de clave

El equipo Auth confirmó que dispone de:

- Frontend: `/crear-clave`.
- Backend: `/api/auth/update-password`.

Auth se encargará del flujo de creación o actualización de clave durante el Sprint 4.

La entrega del enlace correspondiente mediante correo electrónico depende de la integración real con el microservicio de Notificaciones, por lo que permanece pendiente.

Este flujo es responsabilidad de Auth y no requiere que Panel implemente un sistema propio de gestión de contraseñas.

---

## 3. Configuración operativa y condiciones de integración

### 3.1 SLA y timeout

El contrato oficial de Auth v1.1 no establece un SLA de latencia garantizado.

Panel había propuesto originalmente:

```text
SLA < 300 ms
Timeout = 1 segundo
```

Conforme a la nueva versión contractual, el SLA inferior a 300 ms no se considera confirmado.

Se mantiene como configuración inicial recomendada para Panel un timeout de introspección de 1000 ms, que debe verificarse durante las pruebas de integración.

```dotenv
AUTH_TIMEOUT_MS=1000
```

El timeout es una medida de protección del consumidor y no representa una garantía de respuesta del proveedor.

### 3.2 Reintentos y Fail-Secure

El contrato oficial Auth v1.1 establece que no se deben ejecutar reintentos automáticos por defecto durante la integración inicial.

Por lo tanto, la propuesta anterior de Panel de realizar un reintento automático ante indisponibilidad debe revisarse para alinearse con el contrato vigente.

Comportamiento esperado:

```text
Panel consulta a Auth
        |
        v
¿Auth responde correctamente?
        |
    Sí / No
     |    |
     v    v
Validar   Detener operación
rol       protegida
     |    |
     v    v
Continuar HTTP 503 ante
si está   timeout o
autorizado indisponibilidad
```

No se realizarán reintentos automáticos ante errores `401` o `403`.

Cualquier política futura de reintentos deberá estar acotada, respetar el timeout total y ser acordada con Auth.

### 3.3 Configuración del servicio

La URL base se configura mediante la variable de entorno:

```dotenv
AUTH_SERVICE_URL=http://auth-service:10000
```

La autenticación interna utiliza una variable privada para la clave compartida:

```dotenv
AUTH_INTERNAL_API_KEY=<CLAVE_PRIVADA_DEL_ENTORNO>
```

Panel debe enviar el valor configurado en esa variable mediante la cabecera HTTP:

```http
x-api-key: <CLAVE_INTERNA_COMPARTIDA>
```

La cookie `jwt` debe reenviarse sin alteraciones.

La configuración se aplica exclusivamente en el backend.

### 3.4 Seguridad de la integración

Las comunicaciones internas entre Panel y Auth deben realizarse mediante la red privada de Docker.

La clave de integración no debe:

- Incluirse directamente en el código fuente.
- Subirse a repositorios Git.
- Enviarse al frontend.
- Registrarse en logs.
- Incluirse en respuestas HTTP.
- Compartirse en documentación pública.

Si la clave compartida se compromete, deberá rotarse coordinadamente entre Auth y los servicios consumidores del mismo entorno.

---

## 4. Pendientes de integración y validación — Avance 4

### 4.1 Acuerdos confirmados por Auth

El equipo Auth confirmó:

1. La exigencia de `x-api-key` para las llamadas internas.
2. La existencia de una clave compartida para el entorno Docker de desarrollo.
3. El hostname `auth-service`.
4. El puerto interno `10000`.
5. La URL `http://auth-service:10000`.
6. La pertenencia del contenedor a `plataforma-eventos-net`.
7. La disponibilidad de cuentas QA de organizador y staff.
8. La ruta de login del organizador y su interfaz web.
9. La implementación de `/crear-clave` y `/api/auth/update-password`.
10. La disponibilidad del equipo Auth para coordinar pruebas conjuntas.

El equipo proveedor informó haber validado sus usuarios QA contra Auth y el Gateway.

Esta confirmación corresponde al funcionamiento reportado por Auth y **no constituye todavía una validación de extremo a extremo del Panel Organizador**.

### 4.2 Pendientes del lado de Panel Organizador

| Pendiente | Responsable | Estado |
|---|---|---|
| Configurar `AUTH_SERVICE_URL` con puerto 10000 | Backend Panel | Por verificar |
| Incorporar `x-api-key` en la llamada interna | Backend Panel | Por verificar |
| Configurar la clave compartida mediante variable privada | Backend Panel | Por verificar |
| Validar cookie `jwt` y clave con Auth real | Backend / Integración | Pendiente de prueba |
| Probar login real desde frontend hacia Panel | Frontend / Integración | Pendiente de prueba |
| Comprobar acceso de organizador y restricciones de rol | Backend / Integración | Pendiente de prueba |
| Verificar respuestas `401`, `403` y `503` | Backend / Integración | Pendiente de prueba |
| Confirmar compatibilidad de timeouts y política de reintentos | Backend / Integración | Pendiente de revisión |

### 4.3 Pruebas mínimas requeridas

Para cerrar la integración con Auth deberán verificarse, como mínimo:

1. **Sesión válida:** cookie y `x-api-key` correctas producen respuesta `200`.
2. **JWT inválido o ausente:** Auth devuelve `401` y Panel rechaza la operación.
3. **Clave interna ausente o incorrecta:** Auth devuelve `403` y Panel bloquea la operación.
4. **Auth indisponible:** Panel responde `503` sin modificar datos.
5. **Control de roles:** un usuario con rol `organizador` puede gestionar sus eventos; usuarios sin autorización reciben `403`.
6. **Identidad y propiedad:** Panel utiliza el `id_usuario` devuelto por Auth, sin confiar en identificadores suministrados por el frontend.
7. **Integración completa:** el usuario inicia sesión en Auth, accede a Panel y ejecuta una operación protegida correctamente.
8. **Seguridad:** ninguna credencial interna, cookie completa ni JWT aparece en logs o respuestas públicas.

### 4.4 Criterio de cierre

La integración se considerará completada cuando Panel Organizador utilice el servicio Auth real con la configuración acordada, se ejecuten satisfactoriamente las pruebas de autenticación y autorización, y exista evidencia de funcionamiento conjunto entre frontend, backend, Gateway y Auth.

La disponibilidad de documentación y credenciales de prueba permite avanzar en la integración, pero no reemplaza las pruebas funcionales.

---

## 5. Referencias y control de cambios

### 5.1 Documentación de referencia

- [Contrato oficial Auth v1.1](https://github.com/equipo-auth/arquitectura/blob/main/CONTRATO_INTEGRACION_AUTH.md)
- [Repositorio Panel Organizador](https://github.com/marybaxmann/Equipo-1---Panel-Organizador)
- `docs/hostnames-integracion.md`
- `docs/api/auth-consumido.yaml`
- Issue INT-01 — Cliente de Auth.
- Issue INT-11 (#34) — Actualización al contrato Auth v1.1 (`x-api-key`).

### 5.2 Cambios incorporados para el Avance 4

1. Se incorpora la cabecera obligatoria `x-api-key`.
2. Se confirma la dirección interna `http://auth-service:10000`.
3. Se documentan los roles `usuario`, `organizador` y `staff`.
4. Se incorporan las rutas de login y gestión de clave confirmadas por Auth.
5. Se identifica la configuración segura mediante variables de entorno.
6. Se ajusta el tratamiento de errores conforme al contrato oficial v1.1.
7. Se elimina la consideración de SLA menor a 300 ms como acuerdo confirmado.
8. Se actualiza la política de reintentos conforme a Auth v1.1.
9. Se diferencian los acuerdos operativos confirmados de las pruebas de integración pendientes.

**Estado del documento:** Actualizado con los acuerdos de Auth v1.1 para el Avance 4. Integración técnica de extremo a extremo pendiente de validación.
