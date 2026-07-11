// src/config/mailer.js
// Transporter de correo (nodemailer). La configuración se toma de variables de
// entorno; si no está seteada, el envío se omite silenciosamente (no rompe la app).
const nodemailer = require('nodemailer');

let transporter = null;
let intentadoConfigurar = false;

function getTransporter() {
    if (intentadoConfigurar) return transporter;
    intentadoConfigurar = true;

    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
        console.warn('[mailer] SMTP no configurado (SMTP_HOST/SMTP_USER/SMTP_PASS). Los recordatorios por email quedan deshabilitados.');
        transporter = null;
        return null;
    }

    const port = parseInt(SMTP_PORT || '587', 10);
    transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port,
        secure: port === 465, // true para 465, false para el resto (STARTTLS)
        auth: { user: SMTP_USER, pass: SMTP_PASS }
    });
    return transporter;
}

/**
 * Envía un email. Devuelve { skipped: true } si el SMTP no está configurado.
 */
async function enviarEmail({ to, subject, html, text }) {
    const tx = getTransporter();
    if (!tx) return { skipped: true };

    const from = process.env.MAIL_FROM || process.env.SMTP_USER;
    return tx.sendMail({ from, to, subject, html, text });
}

module.exports = { enviarEmail, getTransporter };
