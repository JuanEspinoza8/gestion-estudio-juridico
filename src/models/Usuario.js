const db = require('../config/db');

class Usuario {
    constructor(usuario) {
        this.id = usuario.id || null;
        this.nombre = usuario.nombre;
        this.email = usuario.email;
        this.password_hash = usuario.password_hash;
        this.rol = usuario.rol || 'abogado';
    }

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