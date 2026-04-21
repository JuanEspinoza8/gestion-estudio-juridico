const express = require('express');
const router = express.Router();
const Turno = require('../models/Turno');

// GET: Turnos de HOY de un usuario (para el dashboard)
router.get('/usuario/:usuarioId/hoy', async (req, res) => {
    try {
        const turnos = await Turno.obtenerHoy(req.params.usuarioId);
        res.json(turnos);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los turnos de hoy' });
    }
});

// GET: Todos los próximos turnos de un usuario (para la agenda)
router.get('/usuario/:usuarioId', async (req, res) => {
    try {
        const turnos = await Turno.obtenerProximos(req.params.usuarioId);
        res.json(turnos);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener próximos turnos' });
    }
});

// GET: Obtener un turno por ID
router.get('/:id', async (req, res) => {
    try {
        const turno = await Turno.obtenerPorId(req.params.id);
        if (!turno) return res.status(404).json({ error: 'Turno no encontrado' });
        res.json(turno);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el turno' });
    }
});

// GET: Todos los turnos de un cliente
router.get('/cliente/:clienteId', async (req, res) => {
    try {
        const turnos = await Turno.obtenerPorCliente(req.params.clienteId);
        res.json(turnos);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener turnos del cliente' });
    }
});

// POST: Crear un nuevo turno
router.post('/', async (req, res) => {
    try {
        const { tipo_evento } = req.body;
        const eventosPermitidos = ['Audiencia', 'Mediación', 'Presentar Escrito', 'Reunión Cliente', 'Otro'];
        if (tipo_evento && !eventosPermitidos.includes(tipo_evento)) {
            return res.status(400).json({ error: 'Tipo de evento no válido' });
        }

        const nuevoTurno = new Turno(req.body);
        const turnoGuardado = await nuevoTurno.guardar();
        res.status(201).json(turnoGuardado);
    } catch (error) {
        res.status(500).json({ error: 'Error al agendar el turno' });
    }
});

// PUT: Editar un turno completo
router.put('/:id', async (req, res) => {
    try {
        const { tipo_evento } = req.body;
        const eventosPermitidos = ['Audiencia', 'Mediación', 'Presentar Escrito', 'Reunión Cliente', 'Otro'];
        if (tipo_evento && !eventosPermitidos.includes(tipo_evento)) {
            return res.status(400).json({ error: 'Tipo de evento no válido' });
        }

        const datos = { ...req.body, id: req.params.id };
        const turnoActualizado = new Turno(datos);
        const resultado = await turnoActualizado.guardar();
        res.json(resultado);
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar el turno' });
    }
});

// PUT: Cambiar el estado de un turno (completado, cancelado)
router.put('/:id/estado', async (req, res) => {
    try {
        const { estado } = req.body;
        const turno = new Turno({ id: req.params.id });
        const resultado = await turno.cambiarEstado(estado);
        res.json(resultado);
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar el estado del turno' });
    }
});

// DELETE: Eliminar un turno
router.delete('/:id', async (req, res) => {
    try {
        const resultado = await Turno.eliminar(req.params.id);
        if (!resultado) return res.status(404).json({ error: 'Turno no encontrado' });
        res.json({ mensaje: 'Turno eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar el turno' });
    }
});

module.exports = router;