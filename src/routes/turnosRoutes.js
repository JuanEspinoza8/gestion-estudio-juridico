const express = require('express');
const router = express.Router();
const Turno = require('../models/Turno');

// GET: Obtener próximos turnos de un usuario (abogado)
router.get('/usuario/:usuarioId', async (req, res) => {
    try {
        const turnos = await Turno.obtenerProximos(req.params.usuarioId);
        res.json(turnos);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener próximos turnos' });
    }
});

// POST: Crear un nuevo turno
router.post('/', async (req, res) => {
    try {
        const nuevoTurno = new Turno(req.body);
        const turnoGuardado = await nuevoTurno.guardar();
        res.status(201).json(turnoGuardado);
    } catch (error) {
        res.status(500).json({ error: 'Error al agendar el turno' });
    }
});

// PATCH: Cambiar el estado de un turno (completado, cancelado)
router.patch('/:id/estado', async (req, res) => {
    try {
        const { estado } = req.body;
        const turno = new Turno({ id: req.params.id });
        const resultado = await turno.cambiarEstado(estado);
        res.json(resultado);
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar el estado del turno' });
    }
});

module.exports = router;