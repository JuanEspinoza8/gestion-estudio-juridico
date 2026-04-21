const db = require('../config/db');

class Pago {
    constructor(pago) {
        this.id = pago.id || null;
        this.cliente_id = pago.cliente_id;
        this.expediente_id = pago.expediente_id || null;
        this.monto = parseFloat(pago.monto);
        this.fecha_pago = pago.fecha_pago || new Date().toISOString().split('T')[0];
        this.metodo_pago = pago.metodo_pago || null;
        this.recibo_url = pago.recibo_url || null;
    }

    async guardar() {
        try {
            if (this.id) {
                const query = `
                    UPDATE pagos 
                    SET cliente_id = $1, expediente_id = $2, monto = $3, fecha_pago = $4, metodo_pago = $5, recibo_url = $6
                    WHERE id = $7 RETURNING *;
                `;
                const values = [this.cliente_id, this.expediente_id, this.monto, this.fecha_pago, this.metodo_pago, this.recibo_url, this.id];
                const { rows } = await db.query(query, values);
                return rows[0];
            } else {
                const query = `
                    INSERT INTO pagos (cliente_id, expediente_id, monto, fecha_pago, metodo_pago, recibo_url)
                    VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;
                `;
                const values = [this.cliente_id, this.expediente_id, this.monto, this.fecha_pago, this.metodo_pago, this.recibo_url];
                const { rows } = await db.query(query, values);
                this.id = rows[0].id;
                return rows[0];
            }
        } catch (error) {
            throw error;
        }
    }

    static async obtenerPorCliente(clienteId) {
        try {
            const query = 'SELECT * FROM pagos WHERE cliente_id = $1 ORDER BY fecha_pago DESC;';
            const { rows } = await db.query(query, [clienteId]);
            return rows.map(row => new Pago(row));
        } catch (error) {
            throw error;
        }
    }

    static async obtenerIngresosDelMes() {
        try {
            const query = `
                SELECT COALESCE(SUM(monto), 0) AS total_ingresos
                FROM pagos
                WHERE EXTRACT(MONTH FROM fecha_pago) = EXTRACT(MONTH FROM CURRENT_DATE)
                  AND EXTRACT(YEAR FROM fecha_pago) = EXTRACT(YEAR FROM CURRENT_DATE);
            `;
            const { rows } = await db.query(query);
            return parseFloat(rows[0].total_ingresos);
        } catch (error) {
            console.error('Error al calcular ingresos del mes:', error);
            throw error;
        }
    }
}

module.exports = Pago;