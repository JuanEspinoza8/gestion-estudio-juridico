const express = require('express');
const router = express.Router();
const Actividad = require('../models/Actividad');

// GET: Timeline (actividad reciente) del usuario autenticado
router.get('/', async (req, res) => {
    const actividad = await Actividad.obtenerPorUsuario(req.usuario.id);
    res.json(actividad);
});

// Compatibilidad con el frontend anterior, que mandaba el id en la URL: el
// parámetro se ignora. Se puede borrar cuando el frontend nuevo esté desplegado.
router.get('/usuario/:usuarioId', async (req, res) => {
    res.json(await Actividad.obtenerPorUsuario(req.usuario.id));
});

module.exports = router;
