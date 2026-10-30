// La PWA precachea una lista fija de archivos: si alguno no existe, ese archivo
// no queda disponible offline. Este test evita que la lista se desactualice.
const fs = require('fs');
const path = require('path');

const PUBLIC = path.join(__dirname, '..', 'public');
const codigo = fs.readFileSync(path.join(PUBLIC, 'service-worker.js'), 'utf8');
const lista = codigo.match(/ASSETS_TO_CACHE = \[([\s\S]*?)\]/)[1];
const assets = [...lista.matchAll(/'([^']+)'/g)].map((m) => m[1]);

describe('service worker', () => {
    test('la lista de precache no está vacía', () => {
        expect(assets.length).toBeGreaterThan(10);
    });

    test.each(assets.filter((a) => a !== './'))('existe %s', (asset) => {
        expect(fs.existsSync(path.join(PUBLIC, asset))).toBe(true);
    });

    test('no cachea las llamadas a la API', () => {
        expect(codigo).toMatch(/url\.pathname\.startsWith\('\/api\/'\)\) return;/);
    });
});
