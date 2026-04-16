// src/config/db.js
const { Pool } = require('pg');
require('dotenv').config();

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

// Verificación inicial de conexión
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error al conectar con la base de datos:', err.stack);
  } else {
    console.log('Conexión a la base de datos establecida correctamente');
  }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};