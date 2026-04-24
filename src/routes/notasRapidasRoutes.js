// src/routes/notasRapidasRoutes.js
const express = require('express');
const router = express.Router();
const NotaRapida = require('../models/NotaRapida');

// GET: Obtener nota paginada del usuario autenticado
router.get('/', async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        const page = parseInt(req.query.page, 10) || 1;

        const resultado = await NotaRapida.obtenerPaginada(usuarioId, page);
        res.json(resultado);
    } catch (error) {
        console.error('Error al obtener notas rápidas:', error);
        res.status(500).json({ error: 'Error al obtener notas rápidas' });
    }
});

// POST: Crear nueva página de nota
router.post('/', async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        const contenido = req.body.contenido || '';

        const nuevaNota = new NotaRapida({ usuario_id: usuarioId, contenido });
        const notaGuardada = await nuevaNota.guardar();
        res.status(201).json(notaGuardada);
    } catch (error) {
        console.error('Error al crear nota rápida:', error);
        res.status(500).json({ error: 'Error al crear la nota rápida' });
    }
});

// PUT: Actualizar contenido de una nota
router.put('/:id', async (req, res) => {
    try {
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
    } catch (error) {
        console.error('Error al actualizar nota rápida:', error);
        res.status(500).json({ error: 'Error al actualizar la nota rápida' });
    }
});

// DELETE: Eliminar una nota
router.delete('/:id', async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        const resultado = await NotaRapida.eliminar(req.params.id, usuarioId);

        if (!resultado) {
            return res.status(404).json({ error: 'Nota no encontrada o no autorizada' });
        }

        res.json({ mensaje: 'Nota rápida eliminada correctamente' });
    } catch (error) {
        console.error('Error al eliminar nota rápida:', error);
        res.status(500).json({ error: 'Error al eliminar la nota rápida' });
    }
});

module.exports = router;
