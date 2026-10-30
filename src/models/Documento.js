// src/models/Documento.js
// PDFs adjuntos a una causa. El archivo vive en Supabase Storage; acá se guarda
// su ruta dentro del bucket (ruta_archivo), nunca una URL pública.
const db = require('../config/db');

// Columnas que se exponen en la API (la ruta interna del bucket no sale)
const COLUMNAS_PUBLICAS = 'id, causa_id, nombre_archivo, subido_en';

class Documento {
    static async obtenerPorCausa(causaId) {
        const query = `SELECT ${COLUMNAS_PUBLICAS} FROM documentos_causa WHERE causa_id = $1 ORDER BY subido_en DESC;`;
        const { rows } = await db.query(query, [causaId]);
        return rows;
    }

    static async obtenerPorId(id) {
        const { rows } = await db.query('SELECT * FROM documentos_causa WHERE id = $1;', [id]);
        return rows[0] || null;
    }

    static async crear({ causa_id, nombre_archivo, ruta_archivo }) {
        const query = `
            INSERT INTO documentos_causa (causa_id, nombre_archivo, ruta_archivo)
            VALUES ($1, $2, $3) RETURNING ${COLUMNAS_PUBLICAS};
        `;
        const { rows } = await db.query(query, [causa_id, nombre_archivo, ruta_archivo]);
        return rows[0];
    }

    static async eliminar(id) {
        const { rows } = await db.query('DELETE FROM documentos_causa WHERE id = $1 RETURNING *;', [id]);
        return rows[0] || null;
    }

    // Rutas de todos los archivos de las causas de un cliente (para limpiar el
    // storage cuando se borra el cliente)
    static async rutasPorCliente(clienteId) {
        const query = `
            SELECT d.ruta_archivo
            FROM documentos_causa d
            JOIN causas_judiciales c ON d.causa_id = c.id
            WHERE c.cliente_id = $1;
        `;
        const { rows } = await db.query(query, [clienteId]);
        return rows.map((r) => r.ruta_archivo);
    }
}

module.exports = Documento;
