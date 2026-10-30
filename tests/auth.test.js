jest.mock('../src/config/db', () => ({ query: jest.fn(), transaction: jest.fn() }));

const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../src/config/db');
const app = require('../src/app');
const { USUARIO_A, token, filas } = require('./helpers');

const HASH = bcrypt.hashSync('clave-correcta', 4);
const fila = { id: USUARIO_A.id, nombre: 'Ana', email: USUARIO_A.email, password_hash: HASH, rol: 'abogado' };

// Cada test usa una IP distinta para que el rate limit de un test no afecte a otro
let ip = 0;
const login = (body) =>
    request(app)
        .post('/api/auth/login')
        .set('X-Forwarded-For', `10.0.0.${++ip}`)
        .send(body);

beforeEach(() => {
    jest.resetAllMocks();
    db.query.mockImplementation(async (sql, params) => (params[0] === USUARIO_A.email ? filas(fila) : filas()));
});

describe('POST /api/auth/login', () => {
    test('con credenciales correctas devuelve un JWT con el id del usuario', async () => {
        const res = await login({ email: USUARIO_A.email, password: 'clave-correcta' });

        expect(res.status).toBe(200);
        expect(res.body.usuario).toEqual({ id: USUARIO_A.id, nombre: 'Ana', rol: 'abogado' });
        const payload = jwt.verify(res.body.token, process.env.JWT_SECRET);
        expect(payload).toMatchObject({ id: USUARIO_A.id, rol: 'abogado' });
        expect(res.body).not.toHaveProperty('usuario.password_hash');
    });

    test('con contraseña incorrecta responde 401', async () => {
        const res = await login({ email: USUARIO_A.email, password: 'otra' });
        expect(res.status).toBe(401);
        expect(res.body).not.toHaveProperty('token');
    });

    test('con un email que no existe responde 401 con el mismo mensaje', async () => {
        const res = await login({ email: 'nadie@estudio.test', password: 'clave-correcta' });
        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Credenciales inválidas');
    });
});

describe('rate limit del login', () => {
    test('después de 10 intentos fallidos desde la misma IP responde 429', async () => {
        const intentar = (password) =>
            request(app).post('/api/auth/login').set('X-Forwarded-For', '10.9.9.9').send({ email: USUARIO_A.email, password });

        for (let i = 0; i < 10; i++) {
            expect((await intentar('mal')).status).toBe(401);
        }
        const bloqueado = await intentar('clave-correcta');
        expect(bloqueado.status).toBe(429);
        expect(bloqueado.body.error).toMatch(/Demasiados intentos/);
    });

    test('los logins exitosos no cuentan para el límite', async () => {
        const entrar = () =>
            request(app).post('/api/auth/login').set('X-Forwarded-For', '10.8.8.8').send({ email: USUARIO_A.email, password: 'clave-correcta' });

        for (let i = 0; i < 12; i++) {
            expect((await entrar()).status).toBe(200);
        }
    });
});

describe('middleware de autenticación', () => {
    beforeEach(() => db.query.mockResolvedValue(filas()));

    test('sin token responde 401', async () => {
        const res = await request(app).get('/api/clientes');
        expect(res.status).toBe(401);
    });

    test('con un token mal formado responde 401', async () => {
        const res = await request(app).get('/api/clientes').set('Authorization', 'Bearer no-es-un-jwt');
        expect(res.status).toBe(401);
    });

    test('con un token vencido responde 401', async () => {
        const vencido = token(USUARIO_A, { expiresIn: -10 });
        const res = await request(app).get('/api/clientes').set('Authorization', `Bearer ${vencido}`);
        expect(res.status).toBe(401);
    });

    test('con un token firmado con otro secreto responde 401', async () => {
        const falso = jwt.sign(USUARIO_A, 'otro-secreto');
        const res = await request(app).get('/api/clientes').set('Authorization', `Bearer ${falso}`);
        expect(res.status).toBe(401);
    });

    test('rechaza un token sin firma (alg: none)', async () => {
        const sinFirma = jwt.sign(USUARIO_A, null, { algorithm: 'none' });
        const res = await request(app).get('/api/clientes').set('Authorization', `Bearer ${sinFirma}`);
        expect(res.status).toBe(401);
    });

    test('con un token válido deja pasar', async () => {
        const res = await request(app).get('/api/clientes').set('Authorization', `Bearer ${token()}`);
        expect(res.status).toBe(200);
    });
});

describe('CORS y headers de seguridad', () => {
    test('permite el origen configurado en CORS_ORIGINS', async () => {
        const res = await request(app).get('/').set('Origin', 'https://frontend.test');
        expect(res.headers['access-control-allow-origin']).toBe('https://frontend.test');
    });

    test('no habilita otros orígenes', async () => {
        const res = await request(app).get('/').set('Origin', 'https://sitio-malicioso.test');
        expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    test('helmet agrega los headers de seguridad', async () => {
        const res = await request(app).get('/');
        expect(res.headers['x-content-type-options']).toBe('nosniff');
        expect(res.headers['content-security-policy']).toContain("frame-ancestors 'none'");
        expect(res.headers['x-powered-by']).toBeUndefined();
    });
});
