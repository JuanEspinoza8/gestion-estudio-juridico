jest.mock('../src/config/db', () => ({ query: jest.fn(), transaction: jest.fn() }));
jest.mock('../src/services/storage', () => ({
    subirPdf: jest.fn(),
    urlFirmada: jest.fn(),
    eliminar: jest.fn(),
    DURACION_URL_FIRMADA: 60
}));
jest.mock('../src/utils/logger', () => ({ logActividad: jest.fn() }));

const request = require('supertest');
const db = require('../src/config/db');
const storage = require('../src/services/storage');
const app = require('../src/app');
const { auth, filas } = require('./helpers');

const PDF = Buffer.from('%PDF-1.4\n%prueba\n');

beforeEach(() => {
    jest.resetAllMocks();
});

describe('GET /api/documentos/:id/url', () => {
    test('sin token responde 401', async () => {
        const res = await request(app).get('/api/documentos/3/url');
        expect(res.status).toBe(401);
        expect(storage.urlFirmada).not.toHaveBeenCalled();
    });

    test('devuelve una URL firmada de corta duración', async () => {
        db.query.mockResolvedValueOnce(filas({ id: 3, ruta_archivo: 'expediente_1/171_contrato.pdf' }));
        storage.urlFirmada.mockResolvedValue('https://supabase.test/firmada?token=abc');

        const res = await request(app).get('/api/documentos/3/url').set(auth());

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ url: 'https://supabase.test/firmada?token=abc', expira_en: 60 });
        expect(storage.urlFirmada).toHaveBeenCalledWith('expediente_1/171_contrato.pdf');
    });

    test('404 si el documento no existe', async () => {
        db.query.mockResolvedValueOnce(filas());
        const res = await request(app).get('/api/documentos/99/url').set(auth());
        expect(res.status).toBe(404);
    });
});

describe('POST /api/documentos', () => {
    test('rechaza un archivo que declara ser PDF pero no lo es', async () => {
        const res = await request(app)
            .post('/api/documentos')
            .set(auth())
            .field('causa_id', '5')
            .attach('pdf', Buffer.from('MZ\x90\x00 ejecutable'), { filename: 'virus.pdf', contentType: 'application/pdf' });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/PDF/);
        expect(storage.subirPdf).not.toHaveBeenCalled();
    });

    test('rechaza otros tipos de archivo', async () => {
        const res = await request(app)
            .post('/api/documentos')
            .set(auth())
            .field('causa_id', '5')
            .attach('pdf', Buffer.from('hola'), { filename: 'nota.txt', contentType: 'text/plain' });

        expect(res.status).toBe(400);
    });

    test('sube un PDF válido y guarda la ruta, no una URL pública', async () => {
        db.query
            .mockResolvedValueOnce(filas({ id: 5 })) // Causa.obtenerPorId
            .mockResolvedValueOnce(filas({ id: 9, causa_id: 5, nombre_archivo: 'contrato <firmado>.pdf' })); // Documento.crear

        const res = await request(app)
            .post('/api/documentos')
            .set(auth())
            .field('causa_id', '5')
            .attach('pdf', PDF, { filename: 'contrato <firmado>.pdf', contentType: 'application/pdf' });

        expect(res.status).toBe(201);
        const [ruta] = storage.subirPdf.mock.calls[0];
        expect(ruta).toMatch(/^expediente_5\/\d+_contrato_firmado\.pdf$/);

        const [sql, params] = db.query.mock.calls[1];
        expect(sql).toMatch(/INSERT INTO documentos_causa \(causa_id, nombre_archivo, ruta_archivo\)/);
        expect(params).toEqual([5, 'contrato firmado.pdf', ruta]);
    });

    test('404 si la causa no existe (no sube nada)', async () => {
        db.query.mockResolvedValueOnce(filas());
        const res = await request(app)
            .post('/api/documentos')
            .set(auth())
            .field('causa_id', '123')
            .attach('pdf', PDF, { filename: 'a.pdf', contentType: 'application/pdf' });

        expect(res.status).toBe(404);
        expect(storage.subirPdf).not.toHaveBeenCalled();
    });

    test('si falla el registro en la base, borra el archivo ya subido', async () => {
        db.query.mockResolvedValueOnce(filas({ id: 5 })).mockRejectedValueOnce(new Error('se cayó la base'));
        jest.spyOn(console, 'error').mockImplementation(() => {});

        const res = await request(app)
            .post('/api/documentos')
            .set(auth())
            .field('causa_id', '5')
            .attach('pdf', PDF, { filename: 'a.pdf', contentType: 'application/pdf' });

        expect(res.status).toBe(500);
        const [ruta] = storage.subirPdf.mock.calls[0];
        expect(storage.eliminar).toHaveBeenCalledWith([ruta]);
        console.error.mockRestore();
    });
});

describe('DELETE /api/causas/:id', () => {
    function transaccionCon(...respuestas) {
        const tx = { query: jest.fn() };
        respuestas.forEach((r) => tx.query.mockResolvedValueOnce(r));
        db.transaction.mockImplementation((fn) => fn(tx));
        return tx;
    }

    test('borra la causa, sus documentos y los archivos del storage', async () => {
        const tx = transaccionCon(
            filas({ ruta_archivo: 'expediente_5/a.pdf' }, { ruta_archivo: 'expediente_5/b.pdf' }),
            filas(),
            filas({ id: 5, cliente_id: 2, nro_expediente: '123/2026' })
        );

        const res = await request(app).delete('/api/causas/5').set(auth());

        expect(res.status).toBe(200);
        expect(tx.query.mock.calls[1][0]).toMatch(/UPDATE turnos SET causa_id = NULL/);
        expect(storage.eliminar).toHaveBeenCalledWith(['expediente_5/a.pdf', 'expediente_5/b.pdf']);
    });

    test('404 si la causa no existe', async () => {
        transaccionCon(filas(), filas(), filas());
        const res = await request(app).delete('/api/causas/77').set(auth());
        expect(res.status).toBe(404);
        expect(storage.eliminar).not.toHaveBeenCalled();
    });
});
