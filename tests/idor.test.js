// Un usuario no puede ver ni modificar la agenda o la actividad de otro, aunque
// mande el id del otro en la URL o en el body.
jest.mock('../src/config/db', () => ({ query: jest.fn(), transaction: jest.fn() }));
jest.mock('../src/utils/logger', () => ({ logActividad: jest.fn() }));

const request = require('supertest');
const db = require('../src/config/db');
const app = require('../src/app');
const { USUARIO_A, USUARIO_B, auth, filas } = require('./helpers');

// "Base de datos" de prueba: un turno de cada usuario
const TURNOS = [
    { id: 1, usuario_id: USUARIO_A.id, cliente_id: 3, motivo: 'Audiencia de Ana', estado: 'pendiente' },
    { id: 2, usuario_id: USUARIO_B.id, cliente_id: 3, motivo: 'Reunión de Bruno', estado: 'pendiente' }
];

// Emula las consultas de turnos con el mismo filtro que el SQL real
function emularTurnos(sql, params) {
    if (/WHERE t\.usuario_id = \$1/.test(sql)) {
        return filas(...TURNOS.filter((t) => t.usuario_id === params[0]));
    }
    if (/WHERE t\.cliente_id = \$1 AND t\.usuario_id = \$2/.test(sql)) {
        return filas(...TURNOS.filter((t) => t.cliente_id === Number(params[0]) && t.usuario_id === params[1]));
    }
    if (/WHERE t\.id = \$1 AND t\.usuario_id = \$2/.test(sql) || /DELETE FROM turnos WHERE id = \$1 AND usuario_id = \$2/.test(sql)) {
        return filas(...TURNOS.filter((t) => t.id === Number(params[0]) && t.usuario_id === params[1]));
    }
    if (/UPDATE turnos SET estado = \$1 WHERE id = \$2 AND usuario_id = \$3/.test(sql)) {
        return filas(...TURNOS.filter((t) => t.id === Number(params[1]) && t.usuario_id === params[2]));
    }
    if (/UPDATE turnos[\s\S]*WHERE id = \$9 AND usuario_id = \$10/.test(sql)) {
        return filas(...TURNOS.filter((t) => t.id === Number(params[8]) && t.usuario_id === params[9]));
    }
    if (/INSERT INTO turnos/.test(sql)) {
        return filas({ id: 3, usuario_id: params[2] });
    }
    throw new Error(`Consulta no emulada: ${sql}`);
}

beforeEach(() => {
    jest.resetAllMocks();
    db.query.mockImplementation(async (sql, params) => emularTurnos(sql, params));
});

const motivos = (res) => res.body.map((t) => t.motivo);

describe('agenda (turnos)', () => {
    test('cada usuario ve solo sus turnos', async () => {
        const resA = await request(app).get('/api/turnos').set(auth(USUARIO_A));
        const resB = await request(app).get('/api/turnos').set(auth(USUARIO_B));
        expect(motivos(resA)).toEqual(['Audiencia de Ana']);
        expect(motivos(resB)).toEqual(['Reunión de Bruno']);
    });

    test('pedir la agenda de otro por URL devuelve la propia', async () => {
        const res = await request(app).get(`/api/turnos/usuario/${USUARIO_B.id}`).set(auth(USUARIO_A));
        expect(res.status).toBe(200);
        expect(motivos(res)).toEqual(['Audiencia de Ana']);
    });

    test('los turnos de un cliente compartido se filtran por usuario', async () => {
        const res = await request(app).get('/api/turnos/cliente/3').set(auth(USUARIO_A));
        expect(motivos(res)).toEqual(['Audiencia de Ana']);
    });

    test('no se puede leer un turno ajeno por id', async () => {
        const res = await request(app).get('/api/turnos/2').set(auth(USUARIO_A));
        expect(res.status).toBe(404);
    });

    test('no se puede editar, cambiar de estado ni borrar un turno ajeno', async () => {
        const datos = { fecha: '2026-11-10', hora: '10:00', motivo: 'Hackeado', tipo_evento: 'Otro' };
        const editar = await request(app).put('/api/turnos/2').set(auth(USUARIO_A)).send(datos);
        const estado = await request(app).put('/api/turnos/2/estado').set(auth(USUARIO_A)).send({ estado: 'cancelado' });
        const borrar = await request(app).delete('/api/turnos/2').set(auth(USUARIO_A));

        expect([editar.status, estado.status, borrar.status]).toEqual([404, 404, 404]);
    });

    test('el dueño sí puede borrar su turno', async () => {
        const res = await request(app).delete('/api/turnos/1').set(auth(USUARIO_A));
        expect(res.status).toBe(200);
    });

    test('al crear un turno se ignora el usuario_id del body', async () => {
        const res = await request(app)
            .post('/api/turnos')
            .set(auth(USUARIO_A))
            .send({ usuario_id: USUARIO_B.id, fecha: '2026-11-10', hora: '10:00', motivo: 'Audiencia', tipo_evento: 'Audiencia' });

        expect(res.status).toBe(201);
        const [, params] = db.query.mock.calls.find(([sql]) => /INSERT INTO turnos/.test(sql));
        expect(params[2]).toBe(USUARIO_A.id);
    });
});

describe('actividad reciente', () => {
    test('se toma el usuario del token aunque la URL pida otro', async () => {
        db.query.mockResolvedValue(filas());
        await request(app).get(`/api/actividad/usuario/${USUARIO_B.id}`).set(auth(USUARIO_A));
        await request(app).get('/api/actividad').set(auth(USUARIO_A));

        for (const [sql, params] of db.query.mock.calls) {
            expect(sql).toMatch(/WHERE a\.usuario_id = \$1/);
            expect(params).toEqual([USUARIO_A.id]);
        }
    });
});

describe('notas rápidas', () => {
    test('solo se borran notas propias', async () => {
        db.query.mockResolvedValue(filas());
        const res = await request(app).delete('/api/notas-rapidas/5').set(auth(USUARIO_A));
        expect(res.status).toBe(404);
        expect(db.query).toHaveBeenCalledWith(expect.stringMatching(/WHERE id = \$1 AND usuario_id = \$2/), ['5', USUARIO_A.id]);
    });
});
