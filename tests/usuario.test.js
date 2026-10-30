jest.mock('../src/config/db', () => ({ query: jest.fn() }));

const bcrypt = require('bcryptjs');
const db = require('../src/config/db');
const Usuario = require('../src/models/Usuario');

beforeEach(() => {
    jest.resetAllMocks();
    db.query.mockImplementation(async (sql, params) => ({
        rows: [{ id: 1, nombre: params[0], email: params[1], password_hash: params[2], rol: params[3] }]
    }));
});

describe('Usuario.guardar', () => {
    test('al crear guarda el hash bcrypt, nunca la contraseña en texto plano', async () => {
        const creado = await new Usuario({
            nombre: 'Ana',
            email: 'ana@estudio.test',
            password: 'una-clave-larga'
        }).guardar();

        const [sql, params] = db.query.mock.calls[0];
        expect(sql).toMatch(/INSERT INTO usuarios/);
        expect(params).not.toContain('una-clave-larga');
        expect(params[2]).toMatch(/^\$2[aby]\$10\$/);
        expect(await bcrypt.compare('una-clave-larga', params[2])).toBe(true);
        expect(creado).not.toHaveProperty('password_hash');
    });

    test('al actualizar sin contraseña conserva la anterior', async () => {
        await new Usuario({ id: 1, nombre: 'Ana', email: 'ana@estudio.test' }).guardar();

        const [sql, params] = db.query.mock.calls[0];
        expect(sql).toMatch(/password_hash = COALESCE\(\$3, password_hash\)/);
        expect(params[2]).toBeNull();
    });

    test('no permite crear un usuario sin contraseña', async () => {
        await expect(new Usuario({ nombre: 'Ana', email: 'ana@estudio.test' }).guardar()).rejects.toThrow(/contraseña/);
        expect(db.query).not.toHaveBeenCalled();
    });
});
