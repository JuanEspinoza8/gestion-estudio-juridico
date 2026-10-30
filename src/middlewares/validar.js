// src/middlewares/validar.js
// Validación de entrada con zod. Si los datos no cumplen el esquema responde 400
// con el detalle; si cumplen, reemplaza req.body por los datos ya convertidos
// (números, null en vez de '', sin campos que no estén en el esquema).
const { z } = require('zod');
const HttpError = require('../utils/httpError');

z.config(z.locales.es());

function validar(esquema) {
    return (req, res, next) => {
        const resultado = esquema.safeParse(req.body ?? {});
        if (!resultado.success) {
            const detalles = resultado.error.issues.map((issue) => ({
                campo: issue.path.join('.'),
                mensaje: issue.message
            }));
            const [primero] = detalles;
            return res.status(400).json({
                error: primero.campo ? `${primero.campo}: ${primero.mensaje}` : primero.mensaje,
                detalles
            });
        }
        req.body = resultado.data;
        next();
    };
}

// Para router.param: los ids de la URL tienen que ser enteros positivos
function validarIdParam(req, res, next, valor, nombre) {
    const id = Number(valor);
    if (!Number.isInteger(id) || id <= 0) {
        return next(new HttpError(400, `${nombre}: tiene que ser un número entero positivo`));
    }
    req.params[nombre] = id;
    next();
}

module.exports = { validar, validarIdParam };
