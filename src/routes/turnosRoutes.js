const express = require('express');
const router = express.Router();
const Turno = require('../models/Turno');
const { logActividad } = require('../utils/logger');

const EVENTOS_PERMITIDOS = ['Audiencia', 'Mediación', 'Presentar Escrito', 'Reunión Cliente', 'Otro'];

// GET: Turnos de HOY de un usuario (para el dashboard)
router.get('/usuario/:usuarioId/hoy', async (req, res) => {
    const turnos = await Turno.obtenerHoy(req.params.usuarioId);
    res.json(turnos);
});

// GET: Todos los próximos turnos de un usuario (para la agenda)
router.get('/usuario/:usuarioId', async (req, res) => {
    const turnos = await Turno.obtenerProximos(req.params.usuarioId);
    res.json(turnos);
});

// GET: Obtener un turno por ID
router.get('/:id', async (req, res) => {
    const turno = await Turno.obtenerPorId(req.params.id);
    if (!turno) return res.status(404).json({ error: 'Turno no encontrado' });
    res.json(turno);
});

// GET: Todos los turnos de un cliente
router.get('/cliente/:clienteId', async (req, res) => {
    const turnos = await Turno.obtenerPorCliente(req.params.clienteId);
    res.json(turnos);
});

// POST: Crear un nuevo turno
router.post('/', async (req, res) => {
    const { tipo_evento } = req.body;
    if (tipo_evento && !EVENTOS_PERMITIDOS.includes(tipo_evento)) {
        return res.status(400).json({ error: 'Tipo de evento no válido' });
    }

    const nuevoTurno = new Turno(req.body);
    const turnoGuardado = await nuevoTurno.guardar();
    res.status(201).json(turnoGuardado);
});

// PUT: Editar un turno completo
router.put('/:id', async (req, res) => {
    const { tipo_evento } = req.body;
    if (tipo_evento && !EVENTOS_PERMITIDOS.includes(tipo_evento)) {
        return res.status(400).json({ error: 'Tipo de evento no válido' });
    }

    const datos = { ...req.body, id: req.params.id };
    const turnoActualizado = new Turno(datos);
    const resultado = await turnoActualizado.guardar();
    res.json(resultado);
});

// PUT: Cambiar el estado de un turno (completado, cancelado)
router.put('/:id/estado', async (req, res) => {
    const { estado } = req.body;
    const turno = new Turno({ id: req.params.id });
    const resultado = await turno.cambiarEstado(estado);

    if (estado === 'completado') {
        logActividad(req.usuario.id, null, 'TURNO_COMPLETADO', `Se completó un turno de la agenda`);
    }

    res.json(resultado);
});

// DELETE: Eliminar un turno
router.delete('/:id', async (req, res) => {
    const resultado = await Turno.eliminar(req.params.id);
    if (!resultado) return res.status(404).json({ error: 'Turno no encontrado' });
    res.json({ mensaje: 'Turno eliminado correctamente' });
});

module.exports = router;
