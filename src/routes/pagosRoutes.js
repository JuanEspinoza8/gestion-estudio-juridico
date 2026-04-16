const express = require('express');
const router = express.Router();
const Pago = require('../models/Pago');

// GET: Obtener historial de pagos de un cliente
router.get('/cliente/:clienteId', async (req, res) => {
    try {
        const pagos = await Pago.obtenerPorCliente(req.params.clienteId);
        res.json(pagos);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener historial de pagos' });
    }
});

// POST: Registrar un nuevo pago
router.post('/', async (req, res) => {
    try {
        const nuevoPago = new Pago(req.body);
        const pagoGuardado = await nuevoPago.guardar();
        res.status(201).json(pagoGuardado);
    } catch (error) {
        res.status(500).json({ error: 'Error al registrar el pago' });
    }
});

module.exports = router;