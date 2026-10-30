const fs = require('fs');
const os = require('os');
const path = require('path');
const { configuracionSsl } = require('../src/config/db');

const PEM = '-----BEGIN CERTIFICATE-----\nMIIBfake\n-----END CERTIFICATE-----\n';

describe('configuración SSL de la base', () => {
    test('sin DB_SSL_CA cifra pero no verifica el certificado (comportamiento anterior)', () => {
        expect(configuracionSsl({})).toEqual({ rejectUnauthorized: false });
    });

    test('con DB_SSL_CA como ruta, lee el certificado y lo verifica', () => {
        const archivo = path.join(os.tmpdir(), `ca-test-${process.pid}.crt`);
        fs.writeFileSync(archivo, PEM);
        try {
            expect(configuracionSsl({ DB_SSL_CA: archivo })).toEqual({ ca: PEM, rejectUnauthorized: true });
        } finally {
            fs.unlinkSync(archivo);
        }
    });

    test('con DB_SSL_CA como contenido PEM en una sola línea (\\n escapados)', () => {
        const enUnaLinea = PEM.replace(/\n/g, '\\n');
        expect(configuracionSsl({ DB_SSL_CA: enUnaLinea })).toEqual({ ca: PEM, rejectUnauthorized: true });
    });

    test('DB_SSL=false desactiva SSL (Postgres local)', () => {
        expect(configuracionSsl({ DB_SSL: 'false' })).toBe(false);
    });
});
