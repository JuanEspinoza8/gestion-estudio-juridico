const db = require('../config/db');

class Actividad {
    constructor(actividad) {
        this.id = actividad.id || null;
        this.usuario_id = actividad.usuario_id;
        this.cliente_id = actividad.cliente_id || null;
        this.accion = actividad.accion;
        this.detalles = actividad.detalles || null;
        this.fecha = actividad.fecha || null;
    }

    async guardar() {
        try {
            const query = `
                INSERT INTO actividad_reciente (usuario_id, cliente_id, accion, detalles)
                VALUES ($1, $2, $3, $4) RETURNING *;
            `;
            const { rows } = await db.query(query, [this.usuario_id, this.cliente_id, this.accion, this.detalles]);
            this.id = rows[0].id;
            return rows[0];
        } catch (error) {
            console.error('Error al guardar actividad:', error);
            throw error;
        }
    }

    static async obtenerPorUsuario(usuarioId) {
        try {
            const query = `
                SELECT a.*, c.nombre_completo AS cliente_nombre
                FROM actividad_reciente a
                LEFT JOIN clientes c ON a.cliente_id = c.id
                WHERE a.usuario_id = $1
                ORDER BY a.fecha DESC
                LIMIT 50;
            `;
            const { rows } = await db.query(query, [usuarioId]);
            return rows;
        } catch (error) {
            console.error('Error al obtener actividad:', error);
            throw error;
        }
    }
}

module.exports = Actividad;
