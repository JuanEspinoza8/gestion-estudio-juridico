// src/routes/notasRapidasRoutes.js
const express = require('express');
const router = express.Router();
const NotaRapida = require('../models/NotaRapida');
const esquemas = require('../validators/esquemas');
const { validar, validarIdParam } = require('../middlewares/validar');

router.param('id', validarIdParam);

// GET: Obtener nota paginada del usuario autenticado
router.get('/', async (req, res) => {
    const usuarioId = req.usuario.id;
    const page = parseInt(req.query.page, 10) || 1;

    const resultado = await NotaRapida.obtenerPaginada(usuarioId, page);
    res.json(resultado);
});

// POST: Crear nueva página de nota
router.post('/', validar(esquemas.notaRapidaNueva), async (req, res) => {
    const usuarioId = req.usuario.id;
    const { contenido } = req.body;

    const nuevaNota = new NotaRapida({ usuario_id: usuarioId, contenido });
    const notaGuardada = await nuevaNota.guardar();
    res.status(201).json(notaGuardada);
});

// PUT: Actualizar contenido de una nota
router.put('/:id', validar(esquemas.notaRapida), async (req, res) => {
    const usuarioId = req.usuario.id;
    const notaId = req.params.id;
    const { contenido } = req.body;

    const nota = new NotaRapida({ id: notaId, usuario_id: usuarioId, contenido });
    const notaActualizada = await nota.guardar();

    if (!notaActualizada) {
        return res.status(404).json({ error: 'Nota no encontrada o no autorizada' });
    }

    res.json(notaActualizada);
});

// DELETE: Eliminar una nota
router.delete('/:id', async (req, res) => {
    const usuarioId = req.usuario.id;
    const resultado = await NotaRapida.eliminar(req.params.id, usuarioId);

    if (!resultado) {
        return res.status(404).json({ error: 'Nota no encontrada o no autorizada' });
    }

    res.json({ mensaje: 'Nota rápida eliminada correctamente' });
});

module.exports = router;
