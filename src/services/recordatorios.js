// src/services/recordatorios.js
// Busca los turnos cuyo recordatorio ya entró en ventana y manda el email al
// abogado. Se dispara desde el cron interno (node-cron) y desde el endpoint
// /api/cron/recordatorios (pingeado por un servicio externo tipo UptimeRobot).
const Turno = require('../models/Turno');
const { enviarEmail } = require('../config/mailer');

function formatearAnticipacion(min) {
    if (!min || min <= 0) return '';
    if (min % 1440 === 0) { const d = min / 1440; return d === 1 ? '1 día' : `${d} días`; }
    if (min % 60 === 0) { const h = min / 60; return h === 1 ? '1 hora' : `${h} horas`; }
    return `${min} minutos`;
}

function armarEmail(turno) {
    const hora = (turno.hora || '').substring(0, 5);
    const fecha = turno.fecha ? String(turno.fecha).split('T')[0] : '';
    const anticipacion = formatearAnticipacion(turno.recordatorio_offset_min);
    const cliente = turno.cliente_nombre || 'Sin cliente asociado';
    const causa = turno.caratula
        ? `${turno.caratula}${turno.nro_expediente ? ` (Nro ${turno.nro_expediente})` : ''}`
        : '—';
    const evento = turno.motivo || turno.tipo_evento || 'Turno';

    const subject = `Recordatorio: ${turno.tipo_evento || 'Turno'} — ${fecha} ${hora} hs`;

    const text = [
        `Hola ${turno.usuario_nombre || ''},`,
        '',
        `Te recordamos tu próximo turno${anticipacion ? ` (aviso ${anticipacion} antes)` : ''}:`,
        '',
        `• Evento: ${evento}`,
        `• Tipo: ${turno.tipo_evento || '—'}`,
        `• Fecha y hora: ${fecha} a las ${hora} hs`,
        `• Cliente: ${cliente}`,
        `• Expediente/Causa: ${causa}`,
        '',
        'Estudio Jurídico'
    ].join('\n');

    const html = `
        <div style="font-family: Arial, sans-serif; color:#1e293b; max-width:520px;">
            <h2 style="color:#2563eb; margin-bottom:4px;">Recordatorio de turno</h2>
            <p style="color:#64748b; margin-top:0;">Hola ${turno.usuario_nombre || ''}, tenés un turno próximo${anticipacion ? ` (aviso ${anticipacion} antes)` : ''}.</p>
            <table style="border-collapse:collapse; width:100%; margin-top:12px;">
                <tr><td style="padding:6px 10px; color:#64748b;">Evento</td><td style="padding:6px 10px; font-weight:600;">${evento}</td></tr>
                <tr><td style="padding:6px 10px; color:#64748b;">Tipo</td><td style="padding:6px 10px;">${turno.tipo_evento || '—'}</td></tr>
                <tr><td style="padding:6px 10px; color:#64748b;">Fecha y hora</td><td style="padding:6px 10px; font-weight:600;">${fecha} — ${hora} hs</td></tr>
                <tr><td style="padding:6px 10px; color:#64748b;">Cliente</td><td style="padding:6px 10px;">${cliente}</td></tr>
                <tr><td style="padding:6px 10px; color:#64748b;">Expediente / Causa</td><td style="padding:6px 10px;">${causa}</td></tr>
            </table>
            <p style="color:#94a3b8; font-size:12px; margin-top:20px;">Estudio Jurídico · recordatorio automático</p>
        </div>`;

    return { subject, text, html };
}

/**
 * Procesa y envía todos los recordatorios pendientes.
 * @returns {{ total:number, enviados:number, omitidos:number, errores:number }}
 */
async function enviarRecordatoriosPendientes() {
    const pendientes = await Turno.obtenerPendientesRecordatorio();
    let enviados = 0, omitidos = 0, errores = 0;
    const detalleErrores = [];

    for (const turno of pendientes) {
        try {
            const { subject, text, html } = armarEmail(turno);
            const res = await enviarEmail({ to: turno.usuario_email, subject, text, html });

            if (res && res.skipped) {
                // SMTP no configurado: no marcamos como enviado para reintentar cuando lo esté.
                omitidos++;
                continue;
            }

            await Turno.marcarRecordatorioEnviado(turno.id);
            enviados++;
        } catch (error) {
            errores++;
            detalleErrores.push({ turno: turno.id, error: error.message });
            console.error(`[recordatorios] Falló el turno ${turno.id}:`, error.message);
        }
    }

    return { total: pendientes.length, enviados, omitidos, errores, detalleErrores };
}

module.exports = { enviarRecordatoriosPendientes, armarEmail };
