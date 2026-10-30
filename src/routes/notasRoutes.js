// src/routes/notasRoutes.js
const express = require('express');
const router = express.Router();
const Nota = require('../models/Nota');
const db = require('../config/db');
const esquemas = require('../validators/esquemas');
const { validar, validarIdParam } = require('../middlewares/validar');

router.param('id', validarIdParam);
router.param('clienteId', validarIdParam);

// GET: Obtener próximos vencimientos de notas (para dashboard)
router.get('/proximos', async (req, res) => {
    const proximos = await Nota.obtenerProximosVencimientos();
    res.json(proximos);
});

// GET: Obtener todas las notas de un cliente
router.get('/cliente/:clienteId', async (req, res) => {
    const notas = await Nota.obtenerPorCliente(req.params.clienteId);
    res.json(notas);
});

// POST: Agregar una nota a un cliente
router.post('/', validar(esquemas.nota), async (req, res) => {
    const nuevaNota = new Nota(req.body);
    const notaGuardada = await nuevaNota.guardar();
    res.status(201).json(notaGuardada);
});

// PUT: Cambiar el estado de una nota (completada)
router.put('/:id/estado', validar(esquemas.estadoNota), async (req, res) => {
    const { estado } = req.body;
    const query = 'UPDATE notas_cliente SET estado = $1 WHERE id = $2 RETURNING *;';
    const { rows } = await db.query(query, [estado, req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Nota no encontrada' });
    res.json(rows[0]);
});

// DELETE: Eliminar una nota
router.delete('/:id', async (req, res) => {
    const resultado = await Nota.eliminar(req.params.id);
    if (!resultado) return res.status(404).json({ error: 'Nota no encontrada' });
    res.json({ mensaje: 'Nota eliminada correctamente' });
});

module.exports = router;
