const express = require('express');
const router = express.Router();
const Causa = require('../models/Causa');
const { logActividad } = require('../utils/logger');

// GET: Obtener todas las causas del estudio
router.get('/', async (req, res) => {
    try {
        const causas = await Causa.obtenerTodas();
        res.json(causas);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener expedientes' });
    }
});

// GET: Obtener causas de un cliente específico
router.get('/cliente/:clienteId', async (req, res) => {
    try {
        const causas = await Causa.obtenerPorCliente(req.params.clienteId);
        res.json(causas);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los expedientes del cliente' });
    }
});

// POST: Crear una nueva causa
router.post('/', async (req, res) => {
    try {
        const nuevaCausa = new Causa(req.body);
        const causaGuardada = await nuevaCausa.guardar();
        
        logActividad(
            req.usuario ? req.usuario.id : 1, 
            causaGuardada.cliente_id, 
            'NUEVO_EXPEDIENTE', 
            `Se inició el expediente Nro: ${causaGuardada.nro_expediente}`
        );

        res.status(201).json(causaGuardada);
    } catch (error) {
        res.status(500).json({ error: 'Error al crear el expediente' });
    }
});

// PUT: Actualizar una causa
router.put('/:id', async (req, res) => {
    try {
        const datos = { ...req.body, id: req.params.id };
        const causaActualizada = new Causa(datos);
        const resultado = await causaActualizada.guardar();
        res.json(resultado);
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar el expediente' });
    }
});

module.exports = router;
