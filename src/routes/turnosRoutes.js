const express = require('express');
const router = express.Router();
const Turno = require('../models/Turno');
const { logActividad } = require('../utils/logger');
const esquemas = require('../validators/esquemas');
const { validar, validarIdParam } = require('../middlewares/validar');

// La agenda es personal: el usuario sale siempre del JWT (req.usuario.id) y se
// ignora cualquier usuario_id que mande el cliente en la URL o en el body.

router.param('id', validarIdParam);
router.param('clienteId', validarIdParam);

// GET: Todos los turnos del usuario (para la agenda)
router.get('/', async (req, res) => {
    const turnos = await Turno.obtenerProximos(req.usuario.id);
    res.json(turnos);
});

// GET: Turnos de HOY del usuario (para el dashboard)
router.get('/hoy', async (req, res) => {
    const turnos = await Turno.obtenerHoy(req.usuario.id);
    res.json(turnos);
});

// Compatibilidad con el frontend anterior, que mandaba el id en la URL: el
// parámetro se ignora. Se pueden borrar cuando el frontend nuevo esté desplegado.
router.get('/usuario/:usuarioId/hoy', async (req, res) => {
    res.json(await Turno.obtenerHoy(req.usuario.id));
});
router.get('/usuario/:usuarioId', async (req, res) => {
    res.json(await Turno.obtenerProximos(req.usuario.id));
});

// GET: Turnos del usuario con un cliente
router.get('/cliente/:clienteId', async (req, res) => {
    const turnos = await Turno.obtenerPorCliente(req.params.clienteId, req.usuario.id);
    res.json(turnos);
});

// GET: Obtener un turno por ID
router.get('/:id', async (req, res) => {
    const turno = await Turno.obtenerPorId(req.params.id, req.usuario.id);
    if (!turno) return res.status(404).json({ error: 'Turno no encontrado' });
    res.json(turno);
});

// POST: Crear un nuevo turno
router.post('/', validar(esquemas.turno), async (req, res) => {
    const nuevoTurno = new Turno({ ...req.body, usuario_id: req.usuario.id });
    const turnoGuardado = await nuevoTurno.guardar();
    res.status(201).json(turnoGuardado);
});

// PUT: Editar un turno completo
router.put('/:id', validar(esquemas.turno), async (req, res) => {
    const turno = new Turno({ ...req.body, id: req.params.id, usuario_id: req.usuario.id });
    const resultado = await turno.guardar();
    if (!resultado) return res.status(404).json({ error: 'Turno no encontrado' });
    res.json(resultado);
});

// PUT: Cambiar el estado de un turno (completado, cancelado)
router.put('/:id/estado', validar(esquemas.estadoTurno), async (req, res) => {
    const { estado } = req.body;
    const turno = new Turno({ id: req.params.id, usuario_id: req.usuario.id });
    const resultado = await turno.cambiarEstado(estado);
    if (!resultado) return res.status(404).json({ error: 'Turno no encontrado' });

    if (estado === 'completado') {
        logActividad(req.usuario.id, null, 'TURNO_COMPLETADO', `Se completó un turno de la agenda`);
    }

    res.json(resultado);
});

// DELETE: Eliminar un turno
router.delete('/:id', async (req, res) => {
    const resultado = await Turno.eliminar(req.params.id, req.usuario.id);
    if (!resultado) return res.status(404).json({ error: 'Turno no encontrado' });
    res.json({ mensaje: 'Turno eliminado correctamente' });
});

module.exports = router;
