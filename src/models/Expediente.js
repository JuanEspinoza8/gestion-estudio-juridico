// src/models/Expediente.js
const db = require('../config/db');

class Expediente {
    constructor(exp) {
        this.id = exp.id || null;
        this.cliente_id = exp.cliente_id;
        this.descripcion = exp.descripcion || null;
        this.honorarios_totales = parseFloat(exp.honorarios_totales) || 0;
    }

    async guardar() {
        try {
            if (this.id) {
                const query = `
                    UPDATE expedientes
                    SET descripcion = $1, honorarios_totales = $2
                    WHERE id = $3 RETURNING *;
                `;
                const { rows } = await db.query(query, [this.descripcion, this.honorarios_totales, this.id]);
                return rows[0];
            } else {
                const query = `
                    INSERT INTO expedientes (cliente_id, descripcion, honorarios_totales)
                    VALUES ($1, $2, $3) RETURNING *;
                `;
                const { rows } = await db.query(query, [this.cliente_id, this.descripcion, this.honorarios_totales]);
                this.id = rows[0].id;
                return rows[0];
            }
        } catch (error) {
            console.error('Error al guardar expediente:', error);
            throw error;
        }
    }

    static async obtenerPorCliente(clienteId) {
        try {
            const query = `
                SELECT * FROM expedientes
                WHERE cliente_id = $1
                ORDER BY creado_en DESC;
            `;
            const { rows } = await db.query(query, [clienteId]);
            return rows;
        } catch (error) {
            console.error('Error al obtener expedientes:', error);
            throw error;
        }
    }

    static async eliminar(id) {
        try {
            const query = 'DELETE FROM expedientes WHERE id = $1 RETURNING *;';
            const { rows } = await db.query(query, [id]);
            return rows[0];
        } catch (error) {
            throw error;
        }
    }
}

module.exports = Expediente;