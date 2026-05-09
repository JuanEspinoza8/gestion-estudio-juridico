// src/models/Expediente.js
const db = require('../config/db');

class Expediente {
    constructor(exp) {
        this.id = exp.id || null;
        this.cliente_id = exp.cliente_id;
        // La DB tiene la columna 'caratula', pero el frontend manda 'descripcion'
        this.descripcion = exp.descripcion || exp.caratula || null;
        this.honorarios_totales = parseFloat(exp.honorarios_totales) || 0;
        this.cuotas_totales = parseInt(exp.cuotas_totales) || 1;
        this.valor_por_cuota = this.cuotas_totales > 0 ? (this.honorarios_totales / this.cuotas_totales) : this.honorarios_totales;
        this.estado = exp.estado || 'Activo';
        this.creado_en = exp.creado_en || null;
    }

    async guardar() {
        try {
            if (this.id) {
                const query = `
                    UPDATE expedientes
                    SET caratula = $1, honorarios_totales = $2, estado = $3, cuotas_totales = $4, valor_por_cuota = $5
                    WHERE id = $6 RETURNING *;
                `;
                const { rows } = await db.query(query, [this.descripcion, this.honorarios_totales, this.estado, this.cuotas_totales, this.valor_por_cuota, this.id]);
                return new Expediente(rows[0]);
            } else {
                const query = `
                    INSERT INTO expedientes (cliente_id, caratula, honorarios_totales, estado, cuotas_totales, valor_por_cuota)
                    VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;
                `;
                const { rows } = await db.query(query, [this.cliente_id, this.descripcion, this.honorarios_totales, this.estado, this.cuotas_totales, this.valor_por_cuota]);
                this.id = rows[0].id;
                return new Expediente(rows[0]);
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
            // Retornamos instancias para que tengan exp.descripcion y el frontend lo pueda leer
            return rows.map(row => new Expediente(row));
        } catch (error) {
            console.error('Error al obtener expedientes:', error);
            throw error;
        }
    }

    static async eliminar(id) {
        try {
            const query = 'DELETE FROM expedientes WHERE id = $1 RETURNING *;';
            const { rows } = await db.query(query, [id]);
            return rows.length ? new Expediente(rows[0]) : null;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = Expediente;