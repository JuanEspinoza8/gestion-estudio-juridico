const db = require('../config/db');

class Turno {
    constructor(turno) {
        this.id = turno.id || null;
        this.cliente_id = turno.cliente_id;
        this.usuario_id = turno.usuario_id;
        this.fecha = turno.fecha;
        this.hora = turno.hora;
        this.motivo = turno.motivo;
        this.estado = turno.estado || 'pendiente';
    }

    async guardar() {
        try {
            if (this.id) {
                const query = `
                    UPDATE turnos 
                    SET cliente_id = $1, usuario_id = $2, fecha = $3, hora = $4, motivo = $5, estado = $6
                    WHERE id = $7 RETURNING *;
                `;
                const values = [this.cliente_id, this.usuario_id, this.fecha, this.hora, this.motivo, this.estado, this.id];
                const { rows } = await db.query(query, values);
                return rows[0];
            } else {
                const query = `
                    INSERT INTO turnos (cliente_id, usuario_id, fecha, hora, motivo, estado)
                    VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;
                `;
                const values = [this.cliente_id, this.usuario_id, this.fecha, this.hora, this.motivo, this.estado];
                const { rows } = await db.query(query, values);
                this.id = rows[0].id;
                return rows[0];
            }
        } catch (error) {
            throw error;
        }
    }

    async cambiarEstado(nuevoEstado) {
        try {
            const query = 'UPDATE turnos SET estado = $1 WHERE id = $2 RETURNING *;';
            const { rows } = await db.query(query, [nuevoEstado, this.id]);
            this.estado = nuevoEstado;
            return rows[0];
        } catch (error) {
            throw error;
        }
    }

    static async eliminar(id) {
        try {
            const query = 'DELETE FROM turnos WHERE id = $1 RETURNING *;';
            const { rows } = await db.query(query, [id]);
            return rows[0];
        } catch (error) {
            throw error;
        }
    }

    static async obtenerPorId(id) {
        try {
            const query = `
                SELECT t.*, c.nombre_completo
                FROM turnos t
                JOIN clientes c ON t.cliente_id = c.id
                WHERE t.id = $1;
            `;
            const { rows } = await db.query(query, [id]);
            if (rows.length === 0) return null;
            return rows[0];
        } catch (error) {
            throw error;
        }
    }

    // Todos los turnos futuros (agenda completa)
    static async obtenerProximos(usuarioId) {
        try {
            const query = `
                SELECT t.*, c.nombre_completo
                FROM turnos t
                JOIN clientes c ON t.cliente_id = c.id
                WHERE t.usuario_id = $1 AND t.fecha >= CURRENT_DATE AND t.estado = 'pendiente'
                ORDER BY t.fecha ASC, t.hora ASC;
            `;
            const { rows } = await db.query(query, [usuarioId]);
            return rows;
        } catch (error) {
            throw error;
        }
    }

    // Solo los turnos de HOY (para el dashboard)
    static async obtenerHoy(usuarioId) {
        try {
            const query = `
                SELECT t.*, c.nombre_completo
                FROM turnos t
                JOIN clientes c ON t.cliente_id = c.id
                WHERE t.usuario_id = $1 AND t.fecha = CURRENT_DATE AND t.estado = 'pendiente'
                ORDER BY t.hora ASC;
            `;
            const { rows } = await db.query(query, [usuarioId]);
            return rows;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = Turno;