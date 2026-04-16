const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const usuario = await Usuario.obtenerPorEmail(email);
        
        // Verificamos que el usuario exista y que la contraseña sea correcta
        if (!usuario || !(await usuario.autenticar(password))) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Si todo está bien, generamos la credencial digital
        const token = jwt.sign(
            { id: usuario.id, email: usuario.email, rol: usuario.rol },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({ token, usuario: { nombre: usuario.nombre, rol: usuario.rol } });
    } catch (error) {
        console.error('Error en ruta de login:', error);
        res.status(500).json({ error: 'Error en el login' });
    }
});

module.exports = router;