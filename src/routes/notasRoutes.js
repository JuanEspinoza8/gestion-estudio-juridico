// src/routes/notasRoutes.js
const express = require('express');
const router = express.Router();
const Nota = require('../models/Nota');
const db = require('../config/db');

// GET: Obtener próximos vencimientos de notas (para dashboard)
router.get('/proximos', async (req, res) => {
    const proximos = await Nota.obtenerProximosVencimientos();
    res.json(proximos);
});

// GET: Obtener todas las notas de un cliente
router.get('/cliente/:clienteId', async (req, res) => {
    const notas = await Nota.obtenerPorCliente(req.params.clienteId);
    res.json(notas);
});

// POST: Agregar una nota a un cliente
router.post('/', async (req, res) => {
    const { cliente_id, contenido, fecha_vencimiento } = req.body;
    if (!cliente_id || !contenido) {
        return res.status(400).json({ error: 'cliente_id y contenido son requeridos' });
    }
    const nuevaNota = new Nota({ cliente_id, contenido, fecha_vencimiento });
    const notaGuardada = await nuevaNota.guardar();
    res.status(201).json(notaGuardada);
});

// PUT: Cambiar el estado de una nota (completada)
router.put('/:id/estado', async (req, res) => {
    const { estado } = req.body;
    const query = 'UPDATE notas_cliente SET estado = $1 WHERE id = $2 RETURNING *;';
    const { rows } = await db.query(query, [estado, req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Nota no encontrada' });
    res.json(rows[0]);
});

// DELETE: Eliminar una nota
router.delete('/:id', async (req, res) => {
    const resultado = await Nota.eliminar(req.params.id);
    if (!resultado) return res.status(404).json({ error: 'Nota no encontrada' });
    res.json({ mensaje: 'Nota eliminada correctamente' });
});

module.exports = router;
