const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
    // El token viaja en el header de autorización ("Bearer <token>")
    const authHeader = req.header('Authorization');

    // Sin credenciales es 401 (no autenticado); 403 sería "autenticado pero sin permiso"
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        // Verificamos firma y vencimiento; solo aceptamos el algoritmo con el que firmamos
        const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });

        // Guardamos los datos del usuario en la request para usarlos en las rutas
        req.usuario = payload;

        next();
    } catch {
        res.status(401).json({ error: 'Token inválido o expirado' });
    }
};

module.exports = verificarToken;
