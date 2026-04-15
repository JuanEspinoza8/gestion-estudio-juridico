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
}

module.exports = Cliente;