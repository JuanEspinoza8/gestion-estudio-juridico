const express = require('express');
const router = express.Router();
const Actividad = require('../models/Actividad');

// GET: Obtener el timeline (actividad reciente) de un usuario
router.get('/usuario/:usuarioId', async (req, res) => {
    const actividad = await Actividad.obtenerPorUsuario(req.params.usuarioId);
    res.json(actividad);
});

module.exports = router;
