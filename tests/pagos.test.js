// Validación de pagos en el backend (antes solo existía en el formulario).
jest.mock('../src/config/db', () => ({ query: jest.fn(), transaction: jest.fn() }));
jest.mock('../src/utils/logger', () => ({ logActividad: jest.fn() }));

const request = require('supertest');
const db = require('../src/config/db');
const app = require('../src/app');
const { auth, filas } = require('./helpers');

// Cliente 3 con un honorario (id 10) de $120.000 y $50.000 pagados -> saldo $70.000
function baseConSaldo({ honorarios = 120000, pagos = 50000 } = {}) {
    db.query.mockImplementation(async (sql, params) => {
        if (/FROM clientes WHERE id = \$1/.test(sql))
            return params[0] === 3 ? filas({ id: 3, nombre_completo: 'Cliente' }) : filas();
        if (/FROM expedientes WHERE id = \$1/.test(sql)) {
            const honorariosPorId = { 10: { id: 10, cliente_id: 3 }, 20: { id: 20, cliente_id: 4 } };
            return honorariosPorId[params[0]] ? filas(honorariosPorId[params[0]]) : filas();
        }
        if (/AS total_honorarios/.test(sql)) {
            return filas({
                total_honorarios: String(honorarios),
                cuotas_totales_plan: '6',
                total_pagos: String(pagos)
            });
        }
        if (/INSERT INTO pagos/.test(sql)) {
            const [cliente_id, expediente_id, monto, fecha_pago, metodo_pago] = params;
            return filas({ id: 1, cliente_id, expediente_id, monto, fecha_pago, metodo_pago });
        }
        throw new Error(`Consulta no emulada: ${sql}`);
    });
}

const pagar = (body) => request(app).post('/api/pagos').set(auth()).send(body);
const pagoValido = {
    cliente_id: 3,
    expediente_id: 10,
    monto: '20000',
    metodo_pago: 'Efectivo',
    fecha_pago: '2026-10-30'
};
const insertsDePago = () => db.query.mock.calls.filter(([sql]) => /INSERT INTO pagos/.test(sql));

beforeEach(() => {
    jest.resetAllMocks();
    baseConSaldo();
});

describe('POST /api/pagos: validación', () => {
    test.each([
        ['negativo', '-500'],
        ['cero', '0'],
        ['texto', 'abc'],
        ['vacío', ''],
        ['infinito', 'Infinity'],
        ['null', null]
    ])('rechaza un monto %s', async (_caso, monto) => {
        const res = await pagar({ ...pagoValido, monto });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/monto/);
        expect(insertsDePago()).toHaveLength(0);
    });

    test('rechaza un pago sin cliente', async () => {
        const res = await pagar({ monto: '1000' });
        expect(res.status).toBe(400);
        expect(res.body.detalles.map((d) => d.campo)).toContain('cliente_id');
    });

    test('rechaza una fecha inválida', async () => {
        const res = await pagar({ ...pagoValido, fecha_pago: '30/10/2026' });
        expect(res.status).toBe(400);
    });

    test('rechaza un pago mayor al saldo deudor', async () => {
        const res = await pagar({ ...pagoValido, monto: '70001' });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/saldo deudor/);
        expect(insertsDePago()).toHaveLength(0);
    });

    test('rechaza un pago si el cliente no debe nada', async () => {
        baseConSaldo({ honorarios: 1000, pagos: 1000 });
        const res = await pagar({ ...pagoValido, monto: '1' });
        expect(res.status).toBe(400);
    });

    test('rechaza aplicar el pago a un honorario de otro cliente', async () => {
        const res = await pagar({ ...pagoValido, expediente_id: 20 });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/no pertenece/);
    });

    test('404 si el cliente no existe', async () => {
        const res = await pagar({ ...pagoValido, cliente_id: 99 });
        expect(res.status).toBe(404);
    });

    test('registra un pago válido con el monto convertido a número', async () => {
        const res = await pagar(pagoValido);

        expect(res.status).toBe(201);
        const [[, params]] = insertsDePago();
        expect(params.slice(0, 5)).toEqual([3, 10, 20000, '2026-10-30', 'Efectivo']);
    });

    test('se puede pagar exactamente el saldo', async () => {
        const res = await pagar({ ...pagoValido, monto: '70000' });
        expect(res.status).toBe(201);
    });
});
