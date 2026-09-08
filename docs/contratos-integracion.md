# Contratos de integración — Panel Organizador

## CT-01 — Auth ↔ Panel Organizador

### Objetivo
Obtener la identidad y autorización del usuario autenticado.

### Datos recibidos
- Token o sesión
- Validación de autenticación
- ID del usuario
- Rol del usuario

### Estado
Pendiente confirmar estructura exacta con equipo Auth.

---

## CT-02 — Panel Organizador → Catálogo

### Objetivo
Informar cuando un evento es publicado o actualizado.

### Datos enviados
- ID del evento
- Datos del evento
- Nuevo estado
- Tipo de cambio
- Fecha del cambio

### Medio
Broker de eventos.

### Estado
Pendiente confirmar payload con equipo Catálogo.

---

## CT-03 — Panel Organizador ↔ Entradas / Inventario

### Objetivo
Coordinar información del evento y validar condiciones relacionadas con entradas.

### Datos enviados
- ID del evento
- Cantidad de entradas
- Precio de entradas

### Datos que Panel podría necesitar recibir
- Existencia de entradas vendidas o emitidas asociadas al evento

### Estado
Pendiente de definición con equipo Entradas / Inventario.

---

## CT-04 — Panel Organizador → Notificaciones

### Objetivo
Informar cambios relevantes del evento.

### Datos enviados
- ID del evento
- Nuevo estado
- Tipo de cambio
- Fecha del cambio

### Medio
Broker de eventos.

### Estado
Pendiente confirmar payload con equipo Notificaciones.
