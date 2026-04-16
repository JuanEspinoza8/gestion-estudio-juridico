const db = require('../config/db');
const bcrypt = require('bcryptjs');

class Usuario {
    constructor(usuario) {
        this.id = usuario.id || null;
        this.nombre = usuario.nombre;
        this.email = usuario.email;
        this.password_hash = usuario.password_hash;
        this.rol = usuario.rol || 'abogado';
    }

    // Método que agregamos en la US3.1 para el Login
    async autenticar(passwordPlano) {
        try {
            return await bcrypt.compare(passwordPlano, this.password_hash);
        } catch (error) {
            throw error;
        }
    }

    // Método de la US2.4 que NO debemos borrar (crea/actualiza usuarios)
    async guardar() {
        try {
            if (this.id) {
                const query = `
                    UPDATE usuarios 
                    SET nombre = $1, email = $2, password_hash = $3, rol = $4
                    WHERE id = $5 RETURNING *;
                `;
                const values = [this.nombre, this.email, this.password_hash, this.rol, this.id];
                const { rows } = await db.query(query, values);
                return rows[0];
            } else {
                const query = `
                    INSERT INTO usuarios (nombre, email, password_hash, rol)
                    VALUES ($1, $2, $3, $4) RETURNING *;
                `;
                const values = [this.nombre, this.email, this.password_hash, this.rol];
                const { rows } = await db.query(query, values);
                this.id = rows[0].id;
                return rows[0];
            }
        } catch (error) {
            throw error;
        }
    }

    // Método de la US2.4 que busca al usuario para poder loguearlo
    static async obtenerPorEmail(email) {
        try {
            const query = 'SELECT * FROM usuarios WHERE email = $1;';
            const { rows } = await db.query(query, [email]);
            if (rows.length === 0) return null;
            return new Usuario(rows[0]);
        } catch (error) {
            throw error;
        }
    }
}

module.exports = Usuario;