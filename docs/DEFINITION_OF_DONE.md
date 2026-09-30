# Definition of Done — Panel Organizador

Una historia de usuario o tarea se considera **terminada** solo cuando cumple todos los puntos:

## Funcionalidad
- [ ] Cumple todos sus criterios de aceptación.
- [ ] Cumple la política de autorización definida en la HU.
- [ ] Los errores se informan al usuario (validación de campos, `401`, `403`, `404`, `503`).

## Calidad
- [ ] Tiene pruebas automatizadas de los criterios de aceptación y de los casos de autorización (`401` / `403`).
- [ ] Todas las pruebas pasan y el CI está en verde.
- [ ] Sin errores de compilación ni de lint.

## Revisión e integración
- [ ] Se integró mediante Pull Request revisado y aprobado por al menos un integrante distinto del autor.
- [ ] El PR cierra la issue (`Closes #n`).
- [ ] Respeta los contratos de integración vigentes en `docs/`. Si cambia un contrato, se actualizó el documento y se avisó al equipo afectado.

## Documentación
- [ ] Swagger / OpenAPI actualizado con los endpoints nuevos o modificados.
- [ ] README o documentación en `docs/` actualizada si cambia la instalación, la configuración o el uso.

## Gestión
- [ ] La tarjeta está en **Done** en el tablero del proyecto.
- [ ] Se puede demostrar funcionando en local siguiendo el README.
