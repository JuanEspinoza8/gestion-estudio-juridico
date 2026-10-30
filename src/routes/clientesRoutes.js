const express = require('express');
const router = express.Router();
const Cliente = require('../models/Cliente');
const HttpError = require('../utils/httpError');
const { logActividad } = require('../utils/logger');

const MSJ_DUPLICADO = 'El DNI o Email ya se encuentra registrado en el sistema.';

// GET: Obtener todos los clientes activos
router.get('/', async (req, res) => {
    const clientes = await Cliente.obtenerTodos();
    res.json(clientes);
});

// GET: Obtener deuda total general (Para el KPI del Dashboard)
// NOTA: La clave es deuda_total_calle para que coincida con el frontend
router.get('/deuda-total', async (req, res) => {
    const deuda = await Cliente.obtenerDeudaTotalGeneral();
    res.json({ deuda_total_calle: deuda });
});

// GET: Obtener lista de deudores (Para panel de deudas urgentes)
router.get('/deudores', async (req, res) => {
    const deudores = await Cliente.obtenerDeudores();
    res.json(deudores);
});

// GET: Obtener un cliente específico por ID
router.get('/:id', async (req, res) => {
    const cliente = await Cliente.obtenerPorId(req.params.id);
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(cliente);
});

// GET: Obtener el saldo deudor de un cliente específico
router.get('/:id/saldo', async (req, res) => {
    const cliente = new Cliente({ id: req.params.id });
    const saldoInfo = await cliente.obtenerSaldo();
    res.json(saldoInfo);
});

// POST: Crear un nuevo cliente
router.post('/', async (req, res) => {
    const nuevoCliente = new Cliente(req.body);
    const clienteGuardado = await nuevoCliente.guardar().catch(traducirDuplicado);

    logActividad(req.usuario ? req.usuario.id : 1, clienteGuardado.id, 'NUEVO_CLIENTE', `Cliente registrado: ${clienteGuardado.nombre_completo}`);

    res.status(201).json(clienteGuardado);
});

// PUT: Actualizar un cliente
router.put('/:id', async (req, res) => {
    const datos = { ...req.body, id: req.params.id };
    const clienteActualizado = new Cliente(datos);
    const resultado = await clienteActualizado.guardar().catch(traducirDuplicado);
    res.json(resultado);
});

// DELETE: Eliminar un cliente y todos sus datos asociados
router.delete('/:id', async (req, res) => {
    const clienteEliminado = await Cliente.eliminar(req.params.id);
    if (!clienteEliminado) {
        return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    logActividad(
        req.usuario ? req.usuario.id : 1,
        null,
        'CLIENTE_ELIMINADO',
        `Cliente eliminado: ${clienteEliminado.nombre_completo} (ID: ${clienteEliminado.id})`
    );
    res.json({ mensaje: 'Cliente y todos sus datos eliminados correctamente.', cliente: clienteEliminado });
});

// DNI o email repetido (violación de UNIQUE) -> mensaje claro para el usuario
function traducirDuplicado(error) {
    if (error.code === '23505') throw new HttpError(409, MSJ_DUPLICADO);
    throw error;
}

module.exports = router;
