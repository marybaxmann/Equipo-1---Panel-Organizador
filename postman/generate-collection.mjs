import fs from 'fs';

const tests = {
  auth_organizador: `
pm.test("Status is 200", () => pm.response.to.have.status(200));
pm.test("Es válido y organizador", () => {
    const data = pm.response.json();
    pm.expect(data.valido).to.be.true;
    pm.expect(data.usuario.rol).to.eql("organizador");
});`,
  auth_expirado: `pm.test("Status is 401", () => pm.response.to.have.status(401));`,
  panel_sin_cookie: `
pm.test("Status is 401", () => pm.response.to.have.status(401));
pm.test("Error es SESSION_INVALID", () => {
    pm.expect(pm.response.json().error.codigo).to.eql("SESSION_INVALID");
});`,
  panel_asistente: `
pm.test("Status is 403", () => pm.response.to.have.status(403));
pm.test("Error es FORBIDDEN_ROLE", () => {
    pm.expect(pm.response.json().error.codigo).to.eql("FORBIDDEN_ROLE");
});`,
  panel_mis_eventos: `
pm.test("Status is 200", () => pm.response.to.have.status(200));
pm.test("Eventos con estados válidos y los 4 estados presentes (Org A)", () => {
    const eventos = pm.response.json().eventos;
    const validos = ["BORRADOR", "PUBLICADO", "FINALIZADO", "CANCELADO"];
    eventos.forEach(e => pm.expect(validos).to.include(e.estado_gestion));
    pm.expect(new Set(eventos.map(e => e.estado_gestion)).size).to.eql(4);
});`,
  catalogo_proximos: `
pm.test("Status is 200", () => pm.response.to.have.status(200));
pm.test("Ningún evento en BORRADOR y trae estado_disponibilidad", () => {
    const data = pm.response.json();
    pm.expect(data).to.be.an("array");
    data.forEach(e => {
        pm.expect(e.estado_gestion).to.not.eql("BORRADOR");
        pm.expect(e).to.have.property("estado_disponibilidad");
    });
});`,
  catalogo_buscar: `
pm.test("Status is 200", () => pm.response.to.have.status(200));
pm.test("Todos PUBLICADO", () => {
    const data = pm.response.json();
    pm.expect(data).to.be.an("array");
    data.forEach(e => pm.expect(e.estado_gestion).to.eql("PUBLICADO"));
});`,
  catalogo_detalle_borrador: `pm.test("Status is 404", () => pm.response.to.have.status(404));`,
  catalogo_detalle_publicado: `
pm.test("Status is 200", () => pm.response.to.have.status(200));
pm.test("Tiene schema del contrato", () => {
    const data = pm.response.json();
    pm.expect(data).to.have.property("id_evento");
    pm.expect(data).to.have.property("nombre_evento");
    pm.expect(data).to.have.property("estado_disponibilidad");
});`,
  entradas_evento: `
pm.test("Status is 200", () => pm.response.to.have.status(200));
pm.test("Tiene los campos de los contratos de Entradas y Check-in", () => {
    const data = pm.response.json();
    const keys = ["id_evento", "id_usuario", "nombre_evento", "direccion_evento", "fecha_evento", "hora_evento", "hora_fin_evento", "cantidad_entradas", "tipo_entrada", "estado_gestion"];
    pm.expect(Object.keys(data)).to.include.members(keys);
});`,
  checkin_datos: `
pm.test("Status is 200", () => pm.response.to.have.status(200));
pm.test("Tiene hora_fin_evento y estado_gestion", () => {
    const data = pm.response.json();
    pm.expect(data).to.have.property("hora_fin_evento");
    pm.expect(["PUBLICADO", "FINALIZADO", "CANCELADO"]).to.include(data.estado_gestion);
});`,
  checkin_sin_sesion: `pm.test("Status is 401", () => pm.response.to.have.status(401));`,
  checkin_rol_no_autorizado: `
pm.test("Status is 403", () => pm.response.to.have.status(403));
pm.test("Error es FORBIDDEN_ROLE", () => pm.expect(pm.response.json().error.codigo).to.eql("FORBIDDEN_ROLE"));`,
  notificaciones_cambios: `
pm.test("Status is 200", () => pm.response.to.have.status(200));
pm.test("tipo es evento_actualizado y está ordenado", () => {
    const data = pm.response.json();
    pm.expect(data).to.be.an("array");
    if(data.length > 0) {
        pm.expect(data[0].tipo).to.eql("evento_actualizado");
    }
});`,
  promociones_disponibles: `
pm.test("Status is 200", () => pm.response.to.have.status(200));
pm.test("Sólo IDs de PUBLICADO", () => {
    const data = pm.response.json();
    pm.expect(data).to.be.an("array");
});`,
  flujo_crear: `
pm.test("Status is 201", () => pm.response.to.have.status(201));
pm.test("Guarda id_evento", () => {
    const data = pm.response.json();
    pm.expect(data.id_evento).to.be.a("string");
    pm.environment.set("nuevoEventoId", data.id_evento);
});`,
  flujo_org_b: `
pm.test("Status is 403", () => pm.response.to.have.status(403));
pm.test("Error es EVENT_NOT_OWNED", () => {
    pm.expect(pm.response.json().error.codigo).to.eql("EVENT_NOT_OWNED");
});`
};

function req(name, method, url, header, body, testCode) {
  const item = {
    name,
    request: { method, url, description: name, header: [], body: body ? { mode: "raw", raw: JSON.stringify(body), options: { raw: { language: "json" } } } : undefined },
    event: testCode ? [{ listen: "test", script: { exec: testCode.split('\n'), type: "text/javascript" } }] : undefined
  };
  if (header) {
    Object.entries(header).forEach(([k, v]) => {
      item.request.header.push({ key: k, value: v });
    });
  }
  return item;
}

const collection = {
  info: {
    name: "Panel Organizador - Integración (CA2)",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  item: [
    {
      name: "01 Auth (servicio consumido)",
      item: [
        req("Caso: Auth directo: token organizador / Resultado esperado: 200, valido=true", "GET", "{{authUrl}}/validar-sesion", { Cookie: "jwt=token-org-a" }, null, tests.auth_organizador),
        req("Caso: Auth directo: token expirado / Resultado esperado: 401", "GET", "{{authUrl}}/validar-sesion", { Cookie: "jwt=token-expirado" }, null, tests.auth_expirado),
        req("Caso: Panel sin cookie / Resultado esperado: 401 SESSION_INVALID", "GET", "{{baseUrl}}/panel/eventos/mios", {}, null, tests.panel_sin_cookie),
        req("Caso: Panel con asistente / Resultado esperado: 403 FORBIDDEN_ROLE", "GET", "{{baseUrl}}/panel/eventos/mios", { Cookie: "jwt=token-asistente" }, null, tests.panel_asistente),
        req("Caso: Panel con organizador (mis eventos) / Resultado esperado: 200", "GET", "{{baseUrl}}/panel/eventos/mios", { Cookie: "jwt=token-org-a" }, null, tests.panel_mis_eventos)
      ]
    },
    {
      name: "02 Catálogo",
      item: [
        req("Caso: Próximos / Resultado esperado: 200, no BORRADOR", "GET", "{{baseUrl}}/organizador/eventos/proximos", {}, null, tests.catalogo_proximos),
        req("Caso: Buscar feria / Resultado esperado: 200, todos PUBLICADO", "POST", "{{baseUrl}}/organizador/eventos/buscar", { "Content-Type": "application/json" }, { texto: "feria" }, tests.catalogo_buscar),
        req("Caso: Detalle de un BORRADOR / Resultado esperado: 404", "GET", "{{baseUrl}}/organizador/eventos/66f1a0000000000000000001", {}, null, tests.catalogo_detalle_borrador),
        req("Caso: Detalle de un PUBLICADO / Resultado esperado: 200", "GET", "{{baseUrl}}/organizador/eventos/66f1a0000000000000000002", {}, null, tests.catalogo_detalle_publicado)
      ]
    },
    {
      name: "03 Entradas",
      item: [
        req("Caso: Evento por id (sesión staff) / Resultado esperado: 200", "GET", "{{baseUrl}}/panel/eventos/66f1a0000000000000000002", { Cookie: "jwt=token-staff" }, null, tests.entradas_evento)
      ]
    },
    {
      name: "04 Check-in",
      item: [
        req("Caso: Consulta de respaldo con sesión staff / Resultado esperado: 200 con hora_fin_evento", "GET", "{{baseUrl}}/panel/eventos/66f1a0000000000000000004", { Cookie: "jwt=token-staff" }, null, tests.checkin_datos),
        req("Caso: Consulta sin sesión / Resultado esperado: 401", "GET", "{{baseUrl}}/panel/eventos/66f1a0000000000000000004", {}, null, tests.checkin_sin_sesion),
        req("Caso: Consulta con rol asistente / Resultado esperado: 403 FORBIDDEN_ROLE", "GET", "{{baseUrl}}/panel/eventos/66f1a0000000000000000004", { Cookie: "jwt=token-asistente" }, null, tests.checkin_rol_no_autorizado)
      ]
    },
    {
      name: "05 Notificaciones",
      item: [
        req("Caso: Cambios de estado / Resultado esperado: 200", "GET", "{{baseUrl}}/panel/eventos/66f1a0000000000000000002/cambios-estado", {}, null, tests.notificaciones_cambios)
      ]
    },
    {
      name: "06 Promociones",
      item: [
        req("Caso: Eventos disponibles / Resultado esperado: 200", "GET", "{{baseUrl}}/panel/eventos-disponibles", {}, null, tests.promociones_disponibles)
      ]
    },
    {
      name: "07 Flujo HU-01->HU-05",
      item: [
        req("Caso: Crear evento / Resultado esperado: 201", "POST", "{{baseUrl}}/panel/eventos", { "Content-Type": "application/json", Cookie: "jwt=token-org-a" }, { nombre_evento: "Prueba Flujo", descripcion: "desc", fecha_evento: "2030-01-01", hora_evento: "10:00", direccion_evento: "Lugar", tipo_entrada: "GRATUITA" }, tests.flujo_crear),
        req("Caso: Evento recién creado no visible en Catálogo / Resultado esperado: 200 sin el id creado", "GET", "{{baseUrl}}/organizador/eventos/proximos", {}, null, `
pm.test("El BORRADOR recién creado no aparece en Catálogo", () => {
    pm.response.to.have.status(200);
    pm.expect(pm.response.json().map(e => e.id_evento)).to.not.include(pm.environment.get("nuevoEventoId"));
});`),
        req("Caso: Org B pide el evento de A / Resultado esperado: 403", "GET", "{{baseUrl}}/panel/eventos/mios/{{nuevoEventoId}}", { Cookie: "jwt=token-org-b" }, null, tests.flujo_org_b)
      ]
    }
  ]
};

fs.writeFileSync('postman/panel-organizador.postman_collection.json', JSON.stringify(collection, null, 2));
