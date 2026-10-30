const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const Usuario = require('../models/Usuario');
const esquemas = require('../validators/esquemas');
const { validar } = require('../middlewares/validar');

// Frena la fuerza bruta de contraseñas: 10 intentos fallidos por IP cada 15
// minutos. Los logins exitosos no cuentan.
const limiteLogin = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Demasiados intentos de inicio de sesión. Probá de nuevo en 15 minutos.' }
});

router.post('/login', limiteLogin, validar(esquemas.login), async (req, res) => {
    const { email, password } = req.body;

    const usuario = await Usuario.obtenerPorEmail(email);
    if (!usuario || !(await usuario.autenticar(password))) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign({ id: usuario.id, email: usuario.email, rol: usuario.rol }, process.env.JWT_SECRET, {
        expiresIn: '8h'
    });

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
