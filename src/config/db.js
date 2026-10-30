// src/config/db.js
const fs = require('fs');
const { Pool } = require('pg');

/**
 * SSL de la conexión. Supabase lo exige.
 * - DB_SSL_CA: ruta al certificado CA de Supabase (Project Settings → Database →
 *   SSL Configuration → Download certificate) o su contenido PEM. Con él se
 *   verifica que el servidor sea realmente Supabase.
 * - Sin DB_SSL_CA: la conexión va cifrada pero sin verificar el certificado
 *   (rejectUnauthorized: false), así funcionaba hasta ahora.
 * - DB_SSL=false: sin SSL, para un Postgres local.
 */
function configuracionSsl(env = process.env) {
    if (env.DB_SSL === 'false') return false;
    const ca = env.DB_SSL_CA;
    if (!ca) return { rejectUnauthorized: false };
    const pem = ca.includes('BEGIN CERTIFICATE') ? ca.replace(/\\n/g, '\n') : fs.readFileSync(ca, 'utf8');
    return { ca: pem, rejectUnauthorized: true };
}

// Configuración del Pool de conexiones
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: configuracionSsl()
});

// Verificación inicial de conexión (se llama al arrancar el servidor)
async function verificarConexion() {
    try {
        await pool.query('SELECT NOW()');
        console.log('Conexión a la base de datos establecida correctamente');
    } catch (err) {
        console.error('Error al conectar con la base de datos:', err.message);
    }
}

// Ejecuta fn(cliente) dentro de una transacción: COMMIT si termina bien,
// ROLLBACK si lanza un error.
async function transaction(fn) {
    const cliente = await pool.connect();
    try {
        await cliente.query('BEGIN');
        const resultado = await fn(cliente);
        await cliente.query('COMMIT');
        return resultado;
    } catch (error) {
        await cliente.query('ROLLBACK');
        throw error;
    } finally {
        cliente.release();
    }
}

module.exports = {
    query: (text, params) => pool.query(text, params),
    transaction,
    verificarConexion,
    configuracionSsl
};
