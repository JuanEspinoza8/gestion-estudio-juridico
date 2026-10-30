// Express sirve el frontend de public/ para poder levantar todo localmente.
jest.mock('../src/config/db', () => ({ query: jest.fn(), transaction: jest.fn() }));

const request = require('supertest');
const app = require('../src/app');

describe('frontend estático', () => {
    test('sirve login.html', async () => {
        const res = await request(app).get('/login.html');
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toMatch(/text\/html/);
        expect(res.text).toContain('js/config.js');
    });

    test('sirve los scripts con la política de seguridad de contenido', async () => {
        const res = await request(app).get('/js/api.js');
        expect(res.status).toBe(200);
        expect(res.headers['content-security-policy']).toContain("script-src 'self' https://cdn.jsdelivr.net");
    });

    test('/ sigue respondiendo el estado del servicio', async () => {
        const res = await request(app).get('/');
        expect(res.body.estado).toBe('OK');
    });

    test('ninguna página tiene scripts inline (la CSP los bloquearía)', () => {
        const fs = require('fs');
        const path = require('path');
        const publico = path.join(__dirname, '..', 'public');
        for (const archivo of fs.readdirSync(publico).filter((f) => f.endsWith('.html'))) {
            const html = fs.readFileSync(path.join(publico, archivo), 'utf8');
            expect({ archivo, inline: /<script>(?!\s*<\/script>)/.test(html) }).toEqual({ archivo, inline: false });
        }
    });
});
