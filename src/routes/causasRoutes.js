const express = require('express');
const router = express.Router();
const Causa = require('../models/Causa');
const storage = require('../services/storage');
const { logActividad } = require('../utils/logger');

// GET: Obtener todas las causas del estudio
router.get('/', async (req, res) => {
    const causas = await Causa.obtenerTodas();
    res.json(causas);
});

// GET: Obtener causas de un cliente específico
router.get('/cliente/:clienteId', async (req, res) => {
    const causas = await Causa.obtenerPorCliente(req.params.clienteId);
    res.json(causas);
});

// POST: Crear una nueva causa
router.post('/', async (req, res) => {
    const nuevaCausa = new Causa(req.body);
    const causaGuardada = await nuevaCausa.guardar();

    logActividad(
        req.usuario ? req.usuario.id : 1,
        causaGuardada.cliente_id,
        'NUEVO_EXPEDIENTE',
        `Se inició el expediente Nro: ${causaGuardada.nro_expediente}`
    );

    res.status(201).json(causaGuardada);
});

// PUT: Actualizar una causa
router.put('/:id', async (req, res) => {
    const datos = { ...req.body, id: req.params.id };
    const causaActualizada = new Causa(datos);
    const resultado = await causaActualizada.guardar();
    res.json(resultado);
});

// DELETE: Eliminar una causa con sus documentos (registros y archivos)
router.delete('/:id', async (req, res) => {
    const causa = await Causa.eliminar(req.params.id);
    if (!causa) return res.status(404).json({ error: 'Causa no encontrada' });

    await storage.eliminar(causa.rutasArchivos);

    logActividad(
        req.usuario ? req.usuario.id : 1,
        causa.cliente_id,
        'EXPEDIENTE_ELIMINADO',
        `Se eliminó el expediente Nro: ${causa.nro_expediente}`
    );

    res.json({ message: 'Expediente eliminado con éxito' });
});

module.exports = router;
