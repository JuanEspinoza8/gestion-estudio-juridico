// Integración con un Postgres real en memoria (PGlite): carga db/schema.sql y
// db/seed.sql y ejercita la API con el SQL verdadero de los modelos. Así el
// schema, el seed y las consultas no se desincronizan. Solo el storage se simula.
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { PGlite } = require('@electric-sql/pglite');

let mockPg;
jest.mock('../src/config/db', () => ({
    query: (texto, params) => mockPg.query(texto, params),
    transaction: (fn) => mockPg.transaction((tx) => fn({ query: (t, p) => tx.query(t, p) })),
    verificarConexion: async () => {}
}));
jest.mock('../src/services/storage', () => ({
    DURACION_URL_FIRMADA: 60,
    subirPdf: jest.fn(),
    urlFirmada: jest.fn(async (ruta) => `https://storage.test/firmada/${ruta}`),
    eliminar: jest.fn()
}));

const request = require('supertest');
const storage = require('../src/services/storage');
const app = require('../src/app');

const sql = (archivo) => fs.readFileSync(path.join(__dirname, '..', 'db', archivo), 'utf8');

let demo; // headers del usuario demo
let otro; // headers de un segundo usuario
let martina; // id de una clienta del seed

async function loguear(email, password) {
    const res = await request(app).post('/api/auth/login').send({ email, password });
    expect(res.status).toBe(200);
    return { Authorization: `Bearer ${res.body.token}` };
}

beforeAll(async () => {
    mockPg = new PGlite();
    await mockPg.exec(sql('schema.sql'));
    await mockPg.exec(sql('seed.sql'));
    // La migración tiene que poder correrse sobre una base ya creada con el schema
    await mockPg.exec(sql('migrations/001_documentos_ruta_archivo.sql'));

    // Segundo usuario, sin turnos
    await mockPg.query("INSERT INTO usuarios (nombre, email, password_hash) VALUES ('Otro', 'otro@estudio.test', $1)", [
        bcrypt.hashSync('otra-clave-1', 4)
    ]);

    demo = await loguear('demo@estudio.test', 'demo1234');
    otro = await loguear('otro@estudio.test', 'otra-clave-1');
    const { rows } = await mockPg.query("SELECT id FROM clientes WHERE dni = '30111222'");
    martina = rows[0].id;
}, 30000);

afterAll(() => mockPg.close());

test('saldo de un cliente: honorarios - pagos, y cuotas pagadas', async () => {
    // Seed: honorario de $600.000 en 6 cuotas y dos pagos de $100.000
    const res = await request(app).get(`/api/clientes/${martina}/saldo`).set(demo);
    expect(res.body).toEqual({ saldo_deudor: 400000, cuotas_plan_activo: 6, cuotas_pagadas: 2 });
});

test('deuda total del estudio y ranking de deudores', async () => {
    const total = await request(app).get('/api/clientes/deuda-total').set(demo);
    const deudores = await request(app).get('/api/clientes/deudores').set(demo);
    expect(total.body.deuda_total_calle).toBe(610000);
    expect(deudores.body.map((d) => d.nombre_completo)).toEqual(['Martina Gómez', 'Comercial Sur SRL']);
});

test('cada usuario ve solo su agenda (SQL real)', async () => {
    const delDemo = await request(app).get('/api/turnos').set(demo);
    const delOtro = await request(app).get('/api/turnos').set(otro);
    expect(delDemo.body).toHaveLength(5);
    expect(delOtro.body).toHaveLength(0);

    const turnoAjeno = delDemo.body[0].id;
    expect((await request(app).get(`/api/turnos/${turnoAjeno}`).set(otro)).status).toBe(404);
    expect((await request(app).delete(`/api/turnos/${turnoAjeno}`).set(otro)).status).toBe(404);
    expect((await request(app).get(`/api/turnos/${turnoAjeno}`).set(demo)).status).toBe(200);
});

test('un pago no puede superar el saldo; uno válido baja el saldo', async () => {
    const { rows } = await mockPg.query('SELECT id FROM expedientes WHERE cliente_id = $1', [martina]);
    const pago = { cliente_id: martina, expediente_id: rows[0].id, metodo_pago: 'Efectivo', fecha_pago: '2026-10-30' };

    const excedido = await request(app).post('/api/pagos').set(demo).send({ ...pago, monto: '400001' });
    expect(excedido.status).toBe(400);

    const valido = await request(app).post('/api/pagos').set(demo).send({ ...pago, monto: '100000' });
    expect(valido.status).toBe(201);
    const saldo = await request(app).get(`/api/clientes/${martina}/saldo`).set(demo);
    expect(saldo.body.saldo_deudor).toBe(300000);
});

test('borrar una causa borra sus documentos y deja sus turnos sin causa', async () => {
    const causa = await request(app)
        .post('/api/causas')
        .set(demo)
        .send({ cliente_id: martina, caratula: 'Causa de prueba', nro_expediente: '1/2026' });
    expect(causa.status).toBe(201);

    const doc = await request(app)
        .post('/api/documentos')
        .set(demo)
        .field('causa_id', String(causa.body.id))
        .attach('pdf', Buffer.from('%PDF-1.4 prueba'), { filename: 'escrito.pdf', contentType: 'application/pdf' });
    expect(doc.status).toBe(201);
    expect(doc.body).not.toHaveProperty('ruta_archivo');

    const url = await request(app).get(`/api/documentos/${doc.body.id}/url`).set(demo);
    expect(url.body.url).toMatch(/^https:\/\/storage\.test\/firmada\/expediente_\d+\/\d+_escrito\.pdf$/);

    const turno = await request(app)
        .post('/api/turnos')
        .set(demo)
        .send({ cliente_id: martina, causa_id: causa.body.id, fecha: '2026-12-01', hora: '10:00', motivo: 'Audiencia', tipo_evento: 'Audiencia' });
    expect(turno.status).toBe(201);

    const borrar = await request(app).delete(`/api/causas/${causa.body.id}`).set(demo);
    expect(borrar.status).toBe(200);
    expect(storage.eliminar).toHaveBeenLastCalledWith([expect.stringMatching(/_escrito\.pdf$/)]);

    const { rows: docs } = await mockPg.query('SELECT * FROM documentos_causa WHERE causa_id = $1', [causa.body.id]);
    const { rows: turnos } = await mockPg.query('SELECT causa_id FROM turnos WHERE id = $1', [turno.body.id]);
    expect(docs).toHaveLength(0);
    expect(turnos[0].causa_id).toBeNull();
});

test('borrar un cliente elimina en cascada sus pagos, honorarios y turnos', async () => {
    const res = await request(app).delete(`/api/clientes/${martina}`).set(demo);
    expect(res.status).toBe(200);

    const contar = async (tabla) =>
        (await mockPg.query(`SELECT count(*)::int AS n FROM ${tabla} WHERE cliente_id = $1`, [martina])).rows[0].n;
    expect(await contar('pagos')).toBe(0);
    expect(await contar('expedientes')).toBe(0);
    expect(await contar('turnos')).toBe(0);
});
