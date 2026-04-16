const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
    // El token viaja en el header de autorización ("Bearer <token>")
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(403).json({ error: 'Acceso denegado. Token no proporcionado.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        // Verificamos si el token es válido y no expiró
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        
        // Guardamos los datos del usuario en la request para usarlos en las rutas
        req.usuario = payload; 
        
        // Si todo está OK, lo dejamos pasar a la ruta
        next(); 
    } catch (error) {
        res.status(401).json({ error: 'Token inválido o expirado' });
    }
};

module.exports = verificarToken;