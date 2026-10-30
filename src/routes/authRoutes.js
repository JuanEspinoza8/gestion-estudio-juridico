const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    const usuario = await Usuario.obtenerPorEmail(email);
    if (!usuario || !(await usuario.autenticar(password))) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
        { id: usuario.id, email: usuario.email, rol: usuario.rol },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
    );

    res.json({
        token,
        usuario: {
            id: usuario.id,
            nombre: usuario.nombre,
            rol: usuario.rol
        }
    });
});

module.exports = router;
