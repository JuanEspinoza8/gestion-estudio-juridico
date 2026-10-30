// src/config/zonaHoraria.js
// Zona horaria del estudio. Las fechas y horas de turnos y pagos se guardan como
// hora local de Argentina, pero el servidor (Render) y la base (Supabase) corren
// en UTC: "hoy" y "este mes" se calculan siempre en la zona del estudio.
const TZ_ESTUDIO = 'America/Argentina/Buenos_Aires';

// Fecha de hoy en el estudio, en formato AAAA-MM-DD
function hoyEnEstudio(ahora = new Date()) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: TZ_ESTUDIO }).format(ahora);
}

module.exports = { TZ_ESTUDIO, hoyEnEstudio };
