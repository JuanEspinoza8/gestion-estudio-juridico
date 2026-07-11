// src/routes/cronRoutes.js
// Endpoint disparador de tareas programadas. NO usa JWT: se protege con un secreto
// propio (CRON_SECRET) que puede viajar en el header 'x-cron-secret' o como query
// (?secret=...), para ser compatible con pingers externos como UptimeRobot free,
// que sólo hacen GET y no permiten headers personalizados.
const express = require('express');
const router = express.Router();
const { enviarRecordatoriosPendientes } = require('../services/recordatorios');

function verificarSecretoCron(req, res, next) {
    const secret = req.header('x-cron-secret') || req.query.secret;
    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
        return res.status(403).json({ error: 'No autorizado' });
    }
    next();
}

async function handlerRecordatorios(req, res) {
    try {
        const resultado = await enviarRecordatoriosPendientes();
        res.json({ ok: true, ...resultado });
    } catch (error) {
        console.error('Error al procesar recordatorios:', error);
        res.status(500).json({ error: 'Error al procesar recordatorios' });
    }
}

// Aceptamos GET y POST (UptimeRobot free hace GET).
router.get('/recordatorios', verificarSecretoCron, handlerRecordatorios);
router.post('/recordatorios', verificarSecretoCron, handlerRecordatorios);

module.exports = router;
