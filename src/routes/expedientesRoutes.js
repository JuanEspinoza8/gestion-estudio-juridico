// src/routes/expedientesRoutes.js
// "Expedientes" en esta API son los honorarios de un cliente (ver README).
const express = require('express');
const router = express.Router();
const Expediente = require('../models/Expediente');
const HttpError = require('../utils/httpError');

// GET: Expedientes de un cliente
router.get('/cliente/:clienteId', async (req, res) => {
    const expedientes = await Expediente.obtenerPorCliente(req.params.clienteId);
    res.json(expedientes);
});

// POST: Crear nuevo expediente (agregar deuda/honorario)
router.post('/', async (req, res) => {
    const { cliente_id, descripcion, honorarios_totales, cuotas_totales } = req.body;
    if (!cliente_id || !honorarios_totales) {
        return res.status(400).json({ error: 'cliente_id y honorarios_totales son requeridos' });
    }
    const nuevo = new Expediente({ cliente_id, descripcion, honorarios_totales, cuotas_totales });
    const guardado = await nuevo.guardar().catch((error) => {
        if (error.code === '23505') {
            throw new HttpError(409, 'Ya existe un expediente/deuda idéntico para este cliente (posible clic duplicado).');
        }
        throw error;
    });
    res.status(201).json(guardado);
});

// DELETE: Eliminar un expediente
router.delete('/:id', async (req, res) => {
    const resultado = await Expediente.eliminar(req.params.id);
    if (!resultado) return res.status(404).json({ error: 'Expediente no encontrado' });
    res.json({ mensaje: 'Expediente eliminado correctamente' });
});

module.exports = router;
