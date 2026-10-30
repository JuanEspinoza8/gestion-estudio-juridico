// src/routes/notasRapidasRoutes.js
const express = require('express');
const router = express.Router();
const NotaRapida = require('../models/NotaRapida');

// GET: Obtener nota paginada del usuario autenticado
router.get('/', async (req, res) => {
    const usuarioId = req.usuario.id;
    const page = parseInt(req.query.page, 10) || 1;

    const resultado = await NotaRapida.obtenerPaginada(usuarioId, page);
    res.json(resultado);
});

// POST: Crear nueva página de nota
router.post('/', async (req, res) => {
    const usuarioId = req.usuario.id;
    const contenido = req.body.contenido || '';

    const nuevaNota = new NotaRapida({ usuario_id: usuarioId, contenido });
    const notaGuardada = await nuevaNota.guardar();
    res.status(201).json(notaGuardada);
});

// PUT: Actualizar contenido de una nota
router.put('/:id', async (req, res) => {
    const usuarioId = req.usuario.id;
    const notaId = req.params.id;
    const { contenido } = req.body;

    if (contenido === undefined) {
        return res.status(400).json({ error: 'El campo contenido es requerido' });
    }

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
