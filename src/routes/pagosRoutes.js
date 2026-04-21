const express = require('express');
const router = express.Router();
const Pago = require('../models/Pago');
const { logActividad } = require('../utils/logger');

// GET: Obtener el total de ingresos del mes actual
router.get('/mes-actual', async (req, res) => {
    try {
        const total = await Pago.obtenerIngresosDelMes();
        res.json({ total_ingresos: total });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener ingresos del mes' });
    }
});

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
        
        logActividad(req.usuario ? req.usuario.id : 1, pagoGuardado.cliente_id, 'PAGO_RECIBIDO', `Se recibió un pago de $${pagoGuardado.monto} (${pagoGuardado.metodo_pago || 'efectivo'})`);
        
        res.status(201).json(pagoGuardado);
    } catch (error) {
        res.status(500).json({ error: 'Error al registrar el pago' });
    }
});

module.exports = router;