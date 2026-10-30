// src/utils/httpError.js
// Error con código HTTP. Las rutas lo lanzan y el middleware de errores
// responde con ese status y el mensaje.
class HttpError extends Error {
    constructor(status, mensaje) {
        super(mensaje);
        this.status = status;
    }
}

module.exports = HttpError;
