const db = require('../config/db');

class Cliente {
    constructor(cliente) {
        this.id = cliente.id || null;
        this.nombre_completo = cliente.nombre_completo;
        this.dni = cliente.dni;
        this.telefono = cliente.telefono || null;
        this.email = cliente.email || null;
        this.notas = cliente.notas || null;
        this.activo = cliente.activo !== undefined ? cliente.activo : true;
    }

    async guardar() {
        try {
            if (this.id) {
                const query = `
                    UPDATE clientes 
                    SET nombre_completo = $1, dni = $2, telefono = $3, email = $4, notas = $5, activo = $6
                    WHERE id = $7 RETURNING *;
                `;
                const values = [this.nombre_completo, this.dni, this.telefono, this.email, this.notas, this.activo, this.id];
                const { rows } = await db.query(query, values);
                return rows[0];
            } else {
                const query = `
                    INSERT INTO clientes (nombre_completo, dni, telefono, email, notas, activo)
                    VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;
                `;
                const values = [this.nombre_completo, this.dni, this.telefono, this.email, this.notas, this.activo];
                const { rows } = await db.query(query, values);
                this.id = rows[0].id;
                return rows[0];
            }
        } catch (error) {
            console.error('Error al guardar el cliente:', error);
            throw error;
        }
    }

    static async obtenerTodos() {
        try {
            const query = 'SELECT * FROM clientes WHERE activo = true ORDER BY nombre_completo ASC;';
            const { rows } = await db.query(query);
            return rows.map(row => new Cliente(row));
        } catch (error) {
            console.error('Error al obtener clientes:', error);
            throw error;
        }
    }

    static async obtenerPorId(id) {
        try {
            const query = 'SELECT * FROM clientes WHERE id = $1 AND activo = true;';
            const { rows } = await db.query(query, [id]);
            if (rows.length === 0) return null;
            return new Cliente(rows[0]);
        } catch (error) {
            console.error('Error al buscar cliente por ID:', error);
            throw error;
        }
    }
// ==========================================
    // LÓGICA FINANCIERA (US2.5)
    // ==========================================

    /**
     * Calcula el saldo deudor de ESTE cliente en particular.
     * Busca todos sus expedientes, suma los honorarios y le resta sus pagos.
     */
    async obtenerSaldo() {
        try {
            const query = `
                SELECT 
                    (SELECT COALESCE(SUM(honorarios_totales), 0) FROM expedientes WHERE cliente_id = $1) -
                    (SELECT COALESCE(SUM(monto), 0) FROM pagos WHERE cliente_id = $1) AS saldo_deudor;
            `;
            const { rows } = await db.query(query, [this.id]);
            return parseFloat(rows[0].saldo_deudor);
        } catch (error) {
            console.error('Error al calcular el saldo del cliente:', error);
            throw error;
        }
    }

    /**
     * METODO ESTÁTICO: Calcula la plata total que el estudio tiene "en la calle".
     * Ideal para el número gigante en rojo del Dashboard.
     */
    static async obtenerDeudaTotalGeneral() {
        try {
            const query = `
                SELECT 
                    (SELECT COALESCE(SUM(honorarios_totales), 0) FROM expedientes) - 
                    (SELECT COALESCE(SUM(monto), 0) FROM pagos) AS deuda_total_calle;
            `;
            const { rows } = await db.query(query);
            return parseFloat(rows[0].deuda_total_calle);
        } catch (error) {
            console.error('Error al calcular la deuda total general:', error);
            throw error;
        }
    }

    /**
     * METODO ESTÁTICO: Trae la lista de todos los morosos ordenados por quién debe más.
     * Alimenta la tabla de "Deudas Urgentes" del Dashboard.
     */
    static async obtenerDeudores() {
        try {
            const query = `
                SELECT 
                    c.id, 
                    c.nombre_completo,
                    c.telefono,
                    (COALESCE(e.total_honorarios, 0) - COALESCE(p.total_pagos, 0)) AS deuda_actual
                FROM clientes c
                LEFT JOIN (SELECT cliente_id, SUM(honorarios_totales) as total_honorarios FROM expedientes GROUP BY cliente_id) e 
                    ON c.id = e.cliente_id
                LEFT JOIN (SELECT cliente_id, SUM(monto) as total_pagos FROM pagos GROUP BY cliente_id) p 
                    ON c.id = p.cliente_id
                WHERE (COALESCE(e.total_honorarios, 0) - COALESCE(p.total_pagos, 0)) > 0
                ORDER BY deuda_actual DESC;
            `;
            const { rows } = await db.query(query);
            return rows; 
        } catch (error) {
            console.error('Error al obtener la lista de deudores:', error);
            throw error;
        }
    }
}

module.exports = Cliente;