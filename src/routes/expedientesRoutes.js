// src/routes/expedientesRoutes.js
// "Expedientes" en esta API son los honorarios de un cliente (ver README).
const express = require('express');
const router = express.Router();
const Expediente = require('../models/Expediente');
const HttpError = require('../utils/httpError');
const esquemas = require('../validators/esquemas');
const { validar, validarIdParam } = require('../middlewares/validar');

router.param('id', validarIdParam);
router.param('clienteId', validarIdParam);

// GET: Expedientes de un cliente
router.get('/cliente/:clienteId', async (req, res) => {
    const expedientes = await Expediente.obtenerPorCliente(req.params.clienteId);
    res.json(expedientes);
});

// POST: Crear nuevo expediente (agregar deuda/honorario)
router.post('/', validar(esquemas.honorario), async (req, res) => {
    const nuevo = new Expediente(req.body);
    const guardado = await nuevo.guardar().catch((error) => {
        if (error.code === '23505') {
            throw new HttpError(
                409,
                'Ya existe un expediente/deuda idéntico para este cliente (posible clic duplicado).'
            );
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
