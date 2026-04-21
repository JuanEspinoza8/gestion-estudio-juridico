const express = require('express');
const router = express.Router();
const Actividad = require('../models/Actividad');

// GET: Obtener el timeline (actividad reciente) de un usuario
router.get('/usuario/:usuarioId', async (req, res) => {
    try {
        const actividad = await Actividad.obtenerPorUsuario(req.params.usuarioId);
        res.json(actividad);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener la actividad reciente' });
    }
});

module.exports = router;
