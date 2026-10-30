// src/config/db.js
const { Pool } = require('pg');

// Configuración del Pool de conexiones
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    // Configuraciones de seguridad para Supabase (SSL es obligatorio)
    ssl: {
        rejectUnauthorized: false
    }
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

module.exports = {
    query: (text, params) => pool.query(text, params),
    verificarConexion
};
