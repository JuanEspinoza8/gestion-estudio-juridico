// src/routes/notasRoutes.js
const express = require('express');
const router = express.Router();
const Nota = require('../models/Nota');

// GET: Obtener próximos vencimientos de notas (para dashboard)
router.get('/proximos', async (req, res) => {
    try {
        const proximos = await Nota.obtenerProximosVencimientos();
        res.json(proximos);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener próximos vencimientos' });
    }
});

// GET: Obtener todas las notas de un cliente
router.get('/cliente/:clienteId', async (req, res) => {
    try {
        const notas = await Nota.obtenerPorCliente(req.params.clienteId);
        res.json(notas);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener las notas' });
    }
});

// POST: Agregar una nota a un cliente
router.post('/', async (req, res) => {
    try {
        const { cliente_id, contenido, fecha_vencimiento } = req.body;
        if (!cliente_id || !contenido) {
            return res.status(400).json({ error: 'cliente_id y contenido son requeridos' });
        }
        const nuevaNota = new Nota({ cliente_id, contenido, fecha_vencimiento });
        const notaGuardada = await nuevaNota.guardar();
        res.status(201).json(notaGuardada);
    } catch (error) {
        res.status(500).json({ error: 'Error al guardar la nota' });
    }
});

// PUT: Cambiar el estado de una nota (completada)
router.put('/:id/estado', async (req, res) => {
    try {
        const { estado } = req.body;
        const db = require('../config/db');
        const query = 'UPDATE notas_cliente SET estado = $1 WHERE id = $2 RETURNING *;';
        const { rows } = await db.query(query, [estado, req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Nota no encontrada' });
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar el estado de la nota' });
    }
});

// DELETE: Eliminar una nota
router.delete('/:id', async (req, res) => {
    try {
        const resultado = await Nota.eliminar(req.params.id);
        if (!resultado) return res.status(404).json({ error: 'Nota no encontrada' });
        res.json({ mensaje: 'Nota eliminada correctamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar la nota' });
    }
});

module.exports = router;