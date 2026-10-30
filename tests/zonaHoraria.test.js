const { hoyEnEstudio } = require('../src/config/zonaHoraria');

describe('fecha del estudio (Argentina, UTC-3)', () => {
    test('a las 22:30 de Argentina sigue siendo el mismo día aunque en UTC ya sea el siguiente', () => {
        expect(hoyEnEstudio(new Date('2026-10-31T01:30:00Z'))).toBe('2026-10-30');
    });

    test('a la mañana coincide con UTC', () => {
        expect(hoyEnEstudio(new Date('2026-10-30T12:00:00Z'))).toBe('2026-10-30');
    });
});
