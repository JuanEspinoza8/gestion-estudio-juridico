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
                    (SELECT COALESCE(SUM(honorarios_totales), 0) FROM expedientes WHERE cliente_id = $1) AS total_honorarios,
                    (SELECT COALESCE(SUM(cuotas_totales), 0) FROM expedientes WHERE cliente_id = $1 AND estado = 'Activo') AS cuotas_totales_plan,
                    (SELECT COALESCE(SUM(monto), 0) FROM pagos WHERE cliente_id = $1) AS total_pagos;
            `;
            const { rows } = await db.query(query, [this.id]);
            const total_honorarios = parseFloat(rows[0].total_honorarios);
            const cuotas_totales_plan = parseInt(rows[0].cuotas_totales_plan) || 1; // Default a 1 si no hay expedientes
            const total_pagos = parseFloat(rows[0].total_pagos);
            
            const saldo_deudor = total_honorarios - total_pagos;
            const valor_cuota_promedio = total_honorarios > 0 ? (total_honorarios / cuotas_totales_plan) : 0;
            const cuotas_pagadas = valor_cuota_promedio > 0 ? Math.floor(total_pagos / valor_cuota_promedio) : 0;

            return {
                saldo_deudor,
                cuotas_plan_activo: parseInt(rows[0].cuotas_totales_plan) || 0, // Devuelve 0 si no hay plan activo real
                cuotas_pagadas
            };
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

    /**
     * MÉTODO ESTÁTICO: Elimina un cliente y todos sus datos asociados.
     * Funciona gracias a ON DELETE CASCADE configurado en Supabase:
     * pagos, expedientes, turnos, notas_cliente se borran automáticamente.
     */
    static async eliminar(id) {
        try {
            const query = 'DELETE FROM clientes WHERE id = $1 RETURNING id, nombre_completo;';
            const { rows } = await db.query(query, [id]);
            if (rows.length === 0) {
                return null; // No existía ese cliente
            }
            return rows[0];
        } catch (error) {
            console.error('Error al eliminar el cliente:', error);
            throw error;
        }
    }
}

module.exports = Cliente;