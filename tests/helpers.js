// Utilidades compartidas por los tests.
const jwt = require('jsonwebtoken');

const USUARIO_A = { id: 7, email: 'ana@estudio.test', rol: 'abogado' };
const USUARIO_B = { id: 8, email: 'bruno@estudio.test', rol: 'abogado' };

function token(usuario = USUARIO_A, opciones = { expiresIn: '1h' }) {
    return jwt.sign(usuario, process.env.JWT_SECRET, opciones);
}

function auth(usuario = USUARIO_A) {
    return { Authorization: `Bearer ${token(usuario)}` };
}

// Respuesta de pg para db.query
const filas = (...rows) => ({ rows, rowCount: rows.length });

module.exports = { USUARIO_A, USUARIO_B, token, auth, filas };
