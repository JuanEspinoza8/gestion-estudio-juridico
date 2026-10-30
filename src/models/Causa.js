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
    }

    static async obtenerPorCliente(clienteId) {
        const query = 'SELECT * FROM causas_judiciales WHERE cliente_id = $1 ORDER BY creado_en DESC;';
        const { rows } = await db.query(query, [clienteId]);
        return rows;
    }

    static async obtenerTodas() {
        const query = `
            SELECT c.*, cl.nombre_completo as cliente_nombre 
            FROM causas_judiciales c
            JOIN clientes cl ON c.cliente_id = cl.id
            ORDER BY c.creado_en DESC;
        `;
        const { rows } = await db.query(query);
        return rows;
    }

    static async obtenerPorId(id) {
        const { rows } = await db.query('SELECT * FROM causas_judiciales WHERE id = $1;', [id]);
        return rows[0] || null;
    }

    /**
     * Elimina la causa en una transacción: borra los registros de sus documentos y
     * desvincula los turnos que la referenciaban (el turno queda en la agenda).
     * Devuelve la causa con las rutas de sus archivos, para borrarlos del storage.
     */
    static async eliminar(id) {
        return db.transaction(async (tx) => {
            const { rows: docs } = await tx.query(
                'DELETE FROM documentos_causa WHERE causa_id = $1 RETURNING ruta_archivo;',
                [id]
            );
            await tx.query('UPDATE turnos SET causa_id = NULL WHERE causa_id = $1;', [id]);
            const { rows } = await tx.query('DELETE FROM causas_judiciales WHERE id = $1 RETURNING *;', [id]);
            if (rows.length === 0) return null;
            return { ...rows[0], rutasArchivos: docs.map((d) => d.ruta_archivo) };
        });
    }
}

module.exports = Causa;
