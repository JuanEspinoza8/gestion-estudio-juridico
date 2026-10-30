// Validación de entrada en el resto de las rutas que escriben.
jest.mock('../src/config/db', () => ({ query: jest.fn(), transaction: jest.fn() }));
jest.mock('../src/utils/logger', () => ({ logActividad: jest.fn() }));

const request = require('supertest');
const db = require('../src/config/db');
const app = require('../src/app');
const { auth, filas } = require('./helpers');

beforeEach(() => {
    jest.resetAllMocks();
    db.query.mockResolvedValue(filas({ id: 1 }));
});

describe('validación de entrada', () => {
    test.each([
        ['clientes sin nombre', 'post', '/api/clientes', { dni: '30111222' }],
        [
            'clientes con email inválido',
            'post',
            '/api/clientes',
            { nombre_completo: 'Ana', dni: '30111222', email: 'no-es-email' }
        ],
        ['honorario negativo', 'post', '/api/expedientes', { cliente_id: 1, honorarios_totales: '-1' }],
        [
            'honorario con 0 cuotas',
            'post',
            '/api/expedientes',
            { cliente_id: 1, honorarios_totales: '1000', cuotas_totales: 0 }
        ],
        ['causa sin carátula', 'post', '/api/causas', { cliente_id: 1 }],
        ['nota vacía', 'post', '/api/notas', { cliente_id: 1, contenido: '   ' }],
        ['estado de nota inventado', 'put', '/api/notas/1/estado', { estado: 'borrada' }],
        ['turno sin fecha', 'post', '/api/turnos', { hora: '10:00', motivo: 'Audiencia' }],
        ['turno con hora inválida', 'post', '/api/turnos', { fecha: '2026-11-10', hora: '25:00', motivo: 'Audiencia' }],
        [
            'turno con tipo inválido',
            'post',
            '/api/turnos',
            { fecha: '2026-11-10', hora: '10:00', motivo: 'x', tipo_evento: 'Fiesta' }
        ],
        ['estado de turno inventado', 'put', '/api/turnos/1/estado', { estado: 'borrado' }],
        ['nota rápida sin contenido', 'put', '/api/notas-rapidas/1', {}],
        ['login sin contraseña', 'post', '/api/auth/login', { email: 'a@b.com' }]
    ])('400 para %s', async (_caso, metodo, url, body) => {
        const res = await request(app)[metodo](url).set(auth()).send(body);
        expect(res.status).toBe(400);
        expect(res.body.error).toBeTruthy();
        expect(db.query).not.toHaveBeenCalled();
    });

    test('un id que no es número en la URL responde 400 sin tocar la base', async () => {
        const res = await request(app).get('/api/clientes/abc').set(auth());
        expect(res.status).toBe(400);
        expect(db.query).not.toHaveBeenCalled();
    });

    test('JSON mal formado responde 400', async () => {
        const res = await request(app)
            .post('/api/clientes')
            .set(auth())
            .set('Content-Type', 'application/json')
            .send('{"nombre_completo": ');
        expect(res.status).toBe(400);
    });

    test('los campos vacíos del formulario se guardan como null y se ignoran los desconocidos', async () => {
        db.query.mockResolvedValue(filas({ id: 1, nombre_completo: 'Ana' }));
        const res = await request(app).post('/api/clientes').set(auth()).send({
            nombre_completo: ' Ana ',
            dni: '30111222',
            email: '',
            telefono: '',
            notas: '',
            activo: false,
            rol: 'admin'
        });

        expect(res.status).toBe(201);
        const [sql, params] = db.query.mock.calls[0];
        expect(sql).toMatch(/INSERT INTO clientes/);
        expect(params).toEqual(['Ana', '30111222', null, null, null, true]);
    });

    test('un DNI repetido responde 409 con un mensaje claro', async () => {
        db.query.mockRejectedValue(Object.assign(new Error('duplicate key'), { code: '23505' }));
        const res = await request(app)
            .post('/api/clientes')
            .set(auth())
            .send({ nombre_completo: 'Ana', dni: '30111222' });
        expect(res.status).toBe(409);
        expect(res.body.error).toMatch(/DNI o Email/);
    });
});
