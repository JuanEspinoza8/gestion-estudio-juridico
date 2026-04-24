// src/models/NotaRapida.js
const db = require('../config/db');

class NotaRapida {
    constructor(nota) {
        this.id = nota.id || null;
        this.usuario_id = nota.usuario_id;
        this.contenido = nota.contenido || '';
        this.creado_en = nota.creado_en || null;
        this.actualizado_en = nota.actualizado_en || null;
    }

    async guardar() {
        try {
            if (this.id) {
                // Actualizar nota existente
                const query = `
                    UPDATE notas_rapidas
                    SET contenido = $1, actualizado_en = NOW()
                    WHERE id = $2 AND usuario_id = $3
                    RETURNING *;
                `;
                const { rows } = await db.query(query, [this.contenido, this.id, this.usuario_id]);
                return rows[0];
            } else {
                // Crear nueva nota
                const query = `
                    INSERT INTO notas_rapidas (usuario_id, contenido)
                    VALUES ($1, $2) RETURNING *;
                `;
                const { rows } = await db.query(query, [this.usuario_id, this.contenido]);
                this.id = rows[0].id;
                return rows[0];
            }
        } catch (error) {
            console.error('Error al guardar nota rápida:', error);
            throw error;
        }
    }

    /**
     * Obtener notas paginadas del usuario (1 nota por página, orden DESC)
     * @param {number} usuarioId
     * @param {number} page - Página actual (1-indexed)
     * @returns {{ nota: object|null, total: number, page: number }}
     */
    static async obtenerPaginada(usuarioId, page = 1) {
        try {
            // Obtener total de notas del usuario
            const countQuery = `SELECT COUNT(*) AS total FROM notas_rapidas WHERE usuario_id = $1;`;
            const countResult = await db.query(countQuery, [usuarioId]);
            const total = parseInt(countResult.rows[0].total, 10);

            if (total === 0) {
                return { nota: null, total: 0, page: 1 };
            }

            // Clamp page
            const safePage = Math.max(1, Math.min(page, total));
            const offset = safePage - 1;

            const query = `
                SELECT * FROM notas_rapidas
                WHERE usuario_id = $1
                ORDER BY creado_en DESC
                LIMIT 1 OFFSET $2;
            `;
            const { rows } = await db.query(query, [usuarioId, offset]);

            return {
                nota: rows[0] || null,
                total,
                page: safePage
            };
        } catch (error) {
            console.error('Error al obtener nota rápida paginada:', error);
            throw error;
        }
    }

    /**
     * Eliminar una nota rápida (solo si pertenece al usuario)
     */
    static async eliminar(id, usuarioId) {
        try {
            const query = 'DELETE FROM notas_rapidas WHERE id = $1 AND usuario_id = $2 RETURNING *;';
            const { rows } = await db.query(query, [id, usuarioId]);
            return rows[0] || null;
        } catch (error) {
            console.error('Error al eliminar nota rápida:', error);
            throw error;
        }
    }
}

module.exports = NotaRapida;
