const express = require('express');
const router = express.Router();
const Pago = require('../models/Pago');
const { logActividad } = require('../utils/logger');

// GET: Obtener el total de ingresos del mes actual
router.get('/mes-actual', async (req, res) => {
    const total = await Pago.obtenerIngresosDelMes();
    res.json({ total_ingresos: total });
});

// GET: Obtener historial de pagos de un cliente
router.get('/cliente/:clienteId', async (req, res) => {
    const pagos = await Pago.obtenerPorCliente(req.params.clienteId);
    res.json(pagos);
});

// POST: Registrar un nuevo pago
router.post('/', async (req, res) => {
    const nuevoPago = new Pago(req.body);
    const pagoGuardado = await nuevoPago.guardar();

    logActividad(req.usuario ? req.usuario.id : 1, pagoGuardado.cliente_id, 'PAGO_RECIBIDO', `Se recibió un pago de $${pagoGuardado.monto} (${pagoGuardado.metodo_pago || 'efectivo'})`);

    res.status(201).json(pagoGuardado);
});

module.exports = router;
