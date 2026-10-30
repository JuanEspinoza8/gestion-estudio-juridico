const express = require('express');
const router = express.Router();
const Pago = require('../models/Pago');
const Cliente = require('../models/Cliente');
const Expediente = require('../models/Expediente');
const esquemas = require('../validators/esquemas');
const { validar, validarIdParam } = require('../middlewares/validar');
const { logActividad } = require('../utils/logger');

router.param('clienteId', validarIdParam);

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
// Mismas reglas que el formulario de cuenta.html, ahora también en el servidor:
// monto positivo, honorario del mismo cliente y no más que el saldo deudor.
router.post('/', validar(esquemas.pago), async (req, res) => {
    const { cliente_id, expediente_id, monto } = req.body;

    if (!(await Cliente.obtenerPorId(cliente_id))) {
        return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    if (expediente_id) {
        const honorario = await Expediente.obtenerPorId(expediente_id);
        if (!honorario || Number(honorario.cliente_id) !== cliente_id) {
            return res.status(400).json({ error: 'El honorario elegido no pertenece a este cliente' });
        }
    }

    const { saldo_deudor } = await new Cliente({ id: cliente_id }).obtenerSaldo();
    if (saldo_deudor <= 0) {
        return res.status(400).json({ error: 'El cliente no tiene saldo deudor' });
    }
    // Igual que el frontend: se compara contra el saldo redondeado a pesos
    if (monto > Math.round(saldo_deudor)) {
        return res.status(400).json({ error: `El pago no puede superar el saldo deudor ($ ${saldo_deudor})` });
    }

    const nuevoPago = new Pago(req.body);
    const pagoGuardado = await nuevoPago.guardar();

    logActividad(req.usuario.id, pagoGuardado.cliente_id, 'PAGO_RECIBIDO', `Se recibió un pago de $${pagoGuardado.monto} (${pagoGuardado.metodo_pago || 'efectivo'})`);

    res.status(201).json(pagoGuardado);
});

module.exports = router;
