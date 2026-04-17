// src/routes/expedientesRoutes.js
const express = require('express');
const router = express.Router();
const Expediente = require('../models/Expediente');

// GET: Expedientes de un cliente
router.get('/cliente/:clienteId', async (req, res) => {
    try {
        const expedientes = await Expediente.obtenerPorCliente(req.params.clienteId);
        res.json(expedientes);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener expedientes' });
    }
});

// POST: Crear nuevo expediente (agregar deuda/honorario)
router.post('/', async (req, res) => {
    try {
        const { cliente_id, descripcion, honorarios_totales } = req.body;
        if (!cliente_id || !honorarios_totales) {
            return res.status(400).json({ error: 'cliente_id y honorarios_totales son requeridos' });
        }
        const nuevo = new Expediente({ cliente_id, descripcion, honorarios_totales });
        const guardado = await nuevo.guardar();
        res.status(201).json(guardado);
    } catch (error) {
        res.status(500).json({ error: 'Error al crear el expediente' });
    }
});

// DELETE: Eliminar un expediente
router.delete('/:id', async (req, res) => {
    try {
        const resultado = await Expediente.eliminar(req.params.id);
        if (!resultado) return res.status(404).json({ error: 'Expediente no encontrado' });
        res.json({ mensaje: 'Expediente eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar el expediente' });
    }
});

module.exports = router;