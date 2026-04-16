const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const usuario = await Usuario.obtenerPorEmail(email);
        
        if (!usuario || !(await usuario.autenticar(password))) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const token = jwt.sign(
            { id: usuario.id, email: usuario.email, rol: usuario.rol },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        // Se agrega el id del usuario en la respuesta
        res.json({ 
            token, 
            usuario: { 
                id: usuario.id, 
                nombre: usuario.nombre, 
                rol: usuario.rol 
            } 
        });
    } catch (error) {
        console.error('Error en ruta de login:', error);
        res.status(500).json({ error: 'Error en el login' });
    }
});

module.exports = router;