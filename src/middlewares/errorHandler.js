// src/middlewares/errorHandler.js
// Manejo central de errores. Express 5 pasa acá cualquier error lanzado en un
// handler async, así que las rutas no necesitan try/catch propios.
const multer = require('multer');
const HttpError = require('../utils/httpError');

// Errores de PostgreSQL causados por el pedido (no por el servidor)
const ERRORES_PG = {
    23505: [409, 'Ya existe un registro con esos datos.'],
    23503: [409, 'La operación no es posible: el registro relacionado no existe o tiene datos asociados.'],
    23502: [400, 'Falta un dato obligatorio.'],
    '22P02': [400, 'Algún dato tiene un formato inválido.'],
    22003: [400, 'Algún valor numérico está fuera de rango.'],
    22007: [400, 'Alguna fecha u hora tiene un formato inválido.'],
    22008: [400, 'Alguna fecha u hora está fuera de rango.']
};

function rutaNoEncontrada(req, res) {
    res.status(404).json({ error: 'Ruta no encontrada' });
}

// eslint-disable-next-line no-unused-vars -- Express reconoce el handler de errores por sus 4 parámetros
function manejarErrores(err, req, res, next) {
    if (err instanceof HttpError) {
        return res.status(err.status).json({ error: err.message });
    }

    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ error: 'El archivo supera el tamaño máximo permitido (5 MB).' });
        }
        return res.status(400).json({ error: 'No se pudo procesar el archivo enviado.' });
    }

    if (err.code && ERRORES_PG[err.code]) {
        const [status, mensaje] = ERRORES_PG[err.code];
        return res.status(status).json({ error: mensaje });
    }

    // Errores de body-parser (JSON mal formado, cuerpo demasiado grande, etc.)
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'El cuerpo del pedido no es un JSON válido.' });
    }
    if (err.status >= 400 && err.status < 500) {
        return res.status(err.status).json({ error: err.expose ? err.message : 'Pedido inválido.' });
    }

    console.error(`[${req.method} ${req.originalUrl}]`, err);
    res.status(500).json({ error: 'Error interno del servidor' });
}

module.exports = { rutaNoEncontrada, manejarErrores };
