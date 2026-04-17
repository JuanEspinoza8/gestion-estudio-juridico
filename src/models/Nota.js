// src/models/Nota.js
const db = require('../config/db');

class Nota {
    constructor(nota) {
        this.id = nota.id || null;
        this.cliente_id = nota.cliente_id;
        this.contenido = nota.contenido;
        this.creado_en = nota.creado_en || null;
    }

    async guardar() {
        try {
            const query = `
                INSERT INTO notas_cliente (cliente_id, contenido)
                VALUES ($1, $2) RETURNING *;
            `;
            const { rows } = await db.query(query, [this.cliente_id, this.contenido]);
            this.id = rows[0].id;
            return rows[0];
        } catch (error) {
            console.error('Error al guardar nota:', error);
            throw error;
        }
    }

    static async obtenerPorCliente(clienteId) {
        try {
            const query = `
                SELECT * FROM notas_cliente
                WHERE cliente_id = $1
                ORDER BY creado_en DESC;
            `;
            const { rows } = await db.query(query, [clienteId]);
            return rows;
        } catch (error) {
            console.error('Error al obtener notas:', error);
            throw error;
        }
    }

    static async eliminar(id) {
        try {
            const query = 'DELETE FROM notas_cliente WHERE id = $1 RETURNING *;';
            const { rows } = await db.query(query, [id]);
            return rows[0];
        } catch (error) {
            console.error('Error al eliminar nota:', error);
            throw error;
        }
    }
}

module.exports = Nota;