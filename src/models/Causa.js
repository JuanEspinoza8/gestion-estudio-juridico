const db = require('../config/db');

class Causa {
    constructor(causa) {
        this.id = causa.id || null;
        this.cliente_id = causa.cliente_id;
        this.nro_expediente = causa.nro_expediente;
        this.caratula = causa.caratula;
        this.juzgado = causa.juzgado;
        this.estado = causa.estado || 'Iniciado';
        this.creado_en = causa.creado_en || null;
    }

    async guardar() {
        try {
            if (this.id) {
                const query = `
                    UPDATE causas_judiciales 
                    SET nro_expediente = $1, caratula = $2, juzgado = $3, estado = $4
                    WHERE id = $5 RETURNING *;
                `;
                const { rows } = await db.query(query, [this.nro_expediente, this.caratula, this.juzgado, this.estado, this.id]);
                return rows[0];
            } else {
                const query = `
                    INSERT INTO causas_judiciales (cliente_id, nro_expediente, caratula, juzgado, estado)
                    VALUES ($1, $2, $3, $4, $5) RETURNING *;
                `;
                const { rows } = await db.query(query, [this.cliente_id, this.nro_expediente, this.caratula, this.juzgado, this.estado]);
                this.id = rows[0].id;
                return rows[0];
            }
        } catch (error) {
            console.error('Error al guardar la causa:', error);
            throw error;
        }
    }

    static async obtenerPorCliente(clienteId) {
        try {
            const query = 'SELECT * FROM causas_judiciales WHERE cliente_id = $1 ORDER BY creado_en DESC;';
            const { rows } = await db.query(query, [clienteId]);
            return rows;
        } catch (error) {
            console.error('Error al obtener causas por cliente:', error);
            throw error;
        }
    }

    static async obtenerTodas() {
        try {
            const query = `
                SELECT c.*, cl.nombre_completo as cliente_nombre 
                FROM causas_judiciales c
                JOIN clientes cl ON c.cliente_id = cl.id
                ORDER BY c.creado_en DESC;
            `;
            const { rows } = await db.query(query);
            return rows;
        } catch (error) {
            console.error('Error al obtener todas las causas:', error);
            throw error;
        }
    }
}

module.exports = Causa;
