jest.mock('../src/config/db', () => ({ query: jest.fn() }));

const { armarEmail } = require('../src/services/recordatorios');

describe('email de recordatorio', () => {
    const turno = {
        usuario_nombre: 'Dra. Pérez',
        tipo_evento: 'Audiencia',
        motivo: '<img src=x onerror="alert(1)">',
        cliente_nombre: 'Juan <b>García</b>',
        caratula: 'García c/ López',
        nro_expediente: '123/2026',
        fecha: '2026-11-05',
        hora: '10:30:00',
        recordatorio_offset_min: 1440
    };

    test('escapa los datos cargados por el usuario en el HTML', () => {
        const { html } = armarEmail(turno);
        expect(html).not.toContain('<img');
        expect(html).not.toContain('<b>');
        expect(html).toContain('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
        expect(html).toContain('Juan &lt;b&gt;García&lt;/b&gt;');
    });

    test('arma asunto y texto plano con fecha, hora y anticipación', () => {
        const { subject, text } = armarEmail(turno);
        expect(subject).toBe('Recordatorio: Audiencia — 2026-11-05 10:30 hs');
        expect(text).toContain('(aviso 1 día antes)');
        expect(text).toContain('García c/ López (Nro 123/2026)');
    });
});
