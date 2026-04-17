// src/routes/notasRoutes.js
const express = require('express');
const router = express.Router();
const Nota = require('../models/Nota');

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
        const { cliente_id, contenido } = req.body;
        if (!cliente_id || !contenido) {
            return res.status(400).json({ error: 'cliente_id y contenido son requeridos' });
        }
        const nuevaNota = new Nota({ cliente_id, contenido });
        const notaGuardada = await nuevaNota.guardar();
        res.status(201).json(notaGuardada);
    } catch (error) {
        res.status(500).json({ error: 'Error al guardar la nota' });
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