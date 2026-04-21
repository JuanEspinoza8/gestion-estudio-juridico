const express = require('express');
const router = express.Router();
const Cliente = require('../models/Cliente');
const { logActividad } = require('../utils/logger');

// GET: Obtener todos los clientes activos
router.get('/', async (req, res) => {
    try {
        const clientes = await Cliente.obtenerTodos();
        res.json(clientes);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener clientes' });
    }
});

// GET: Obtener deuda total general (Para el KPI del Dashboard)
// NOTA: La clave es deuda_total_calle para que coincida con el frontend
router.get('/deuda-total', async (req, res) => {
    try {
        const deuda = await Cliente.obtenerDeudaTotalGeneral();
        res.json({ deuda_total_calle: deuda });
    } catch (error) {
        res.status(500).json({ error: 'Error al calcular la deuda total' });
    }
});

// GET: Obtener lista de deudores (Para panel de deudas urgentes)
router.get('/deudores', async (req, res) => {
    try {
        const deudores = await Cliente.obtenerDeudores();
        res.json(deudores);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener la lista de deudores' });
    }
});

// GET: Obtener un cliente específico por ID
router.get('/:id', async (req, res) => {
    try {
        const cliente = await Cliente.obtenerPorId(req.params.id);
        if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
        res.json(cliente);
    } catch (error) {
        res.status(500).json({ error: 'Error al buscar el cliente' });
    }
});

// GET: Obtener el saldo deudor de un cliente específico
router.get('/:id/saldo', async (req, res) => {
    try {
        const cliente = new Cliente({ id: req.params.id });
        const saldo = await cliente.obtenerSaldo();
        res.json({ saldo_deudor: saldo });
    } catch (error) {
        res.status(500).json({ error: 'Error al calcular el saldo del cliente' });
    }
});

// POST: Crear un nuevo cliente
router.post('/', async (req, res) => {
    try {
        const nuevoCliente = new Cliente(req.body);
        const clienteGuardado = await nuevoCliente.guardar();
        
        logActividad(req.usuario ? req.usuario.id : 1, clienteGuardado.id, 'NUEVO_CLIENTE', `Cliente registrado: ${clienteGuardado.nombre_completo}`);
        
        res.status(201).json(clienteGuardado);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ error: 'El DNI o Email ya se encuentra registrado en el sistema.' });
        }
        res.status(500).json({ error: 'Error al guardar el cliente' });
    }
});

// PUT: Actualizar un cliente
router.put('/:id', async (req, res) => {
    try {
        const datos = { ...req.body, id: req.params.id };
        const clienteActualizado = new Cliente(datos);
        const resultado = await clienteActualizado.guardar();
        res.json(resultado);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ error: 'El DNI o Email ya se encuentra registrado en el sistema.' });
        }
        res.status(500).json({ error: 'Error al actualizar el cliente' });
    }
});

module.exports = router;