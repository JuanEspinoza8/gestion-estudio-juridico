// src/models/Nota.js
const db = require('../config/db');

class Nota {
    constructor(nota) {
        this.id = nota.id || null;
        this.cliente_id = nota.cliente_id;
        this.contenido = nota.contenido;
        this.fecha_vencimiento = nota.fecha_vencimiento || null;
        this.estado = nota.estado || 'pendiente';
        this.creado_en = nota.creado_en || null;
    }

    async guardar() {
        try {
            if (this.id) {
                const query = `
                    UPDATE notas_cliente
                    SET contenido = $1, fecha_vencimiento = $2, estado = $3
                    WHERE id = $4 RETURNING *;
                `;
                const { rows } = await db.query(query, [this.contenido, this.fecha_vencimiento, this.estado, this.id]);
                return rows[0];
            } else {
                const query = `
                    INSERT INTO notas_cliente (cliente_id, contenido, fecha_vencimiento, estado)
                    VALUES ($1, $2, $3, $4) RETURNING *;
                `;
                const { rows } = await db.query(query, [this.cliente_id, this.contenido, this.fecha_vencimiento, this.estado]);
                this.id = rows[0].id;
                return rows[0];
            }
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

    static async obtenerProximosVencimientos() {
        try {
            const query = `
                SELECT n.*, c.nombre_completo 
                FROM notas_cliente n
                JOIN clientes c ON n.cliente_id = c.id
                WHERE n.estado = 'pendiente' AND n.fecha_vencimiento IS NOT NULL
                ORDER BY n.fecha_vencimiento ASC 
                LIMIT 5;
            `;
            const { rows } = await db.query(query);
            return rows;
        } catch (error) {
            console.error('Error al obtener próximos vencimientos:', error);
            throw error;
        }
    }
}

module.exports = Nota;