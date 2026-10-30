const db = require('../config/db');
const bcrypt = require('bcryptjs');

const COSTO_BCRYPT = 10;

class Usuario {
    constructor(usuario) {
        this.id = usuario.id || null;
        this.nombre = usuario.nombre;
        this.email = usuario.email;
        this.password_hash = usuario.password_hash;
        // Contraseña en texto plano, solo al crear o cambiarla: guardar() la hashea
        this.password = usuario.password;
        this.rol = usuario.rol || 'abogado';
    }

    async autenticar(passwordPlano) {
        return await bcrypt.compare(passwordPlano, this.password_hash);
    }

    // Crea o actualiza el usuario. Si se indicó una contraseña nueva, se guarda
    // solo su hash bcrypt; al actualizar sin contraseña se conserva la anterior.
    // Devuelve el usuario sin el hash.
    async guardar() {
        if (this.password) {
            this.password_hash = await bcrypt.hash(this.password, COSTO_BCRYPT);
            this.password = undefined;
        }

        let fila;
        if (this.id) {
            const query = `
                UPDATE usuarios
                SET nombre = $1, email = $2, password_hash = COALESCE($3, password_hash), rol = $4
                WHERE id = $5 RETURNING *;
            `;
            const values = [this.nombre, this.email, this.password_hash || null, this.rol, this.id];
            const { rows } = await db.query(query, values);
            fila = rows[0];
        } else {
            if (!this.password_hash) throw new Error('Un usuario nuevo necesita contraseña');
            const query = `
                INSERT INTO usuarios (nombre, email, password_hash, rol)
                VALUES ($1, $2, $3, $4) RETURNING *;
            `;
            const values = [this.nombre, this.email, this.password_hash, this.rol];
            const { rows } = await db.query(query, values);
            fila = rows[0];
            this.id = fila.id;
        }

        if (!fila) return null;
        const { password_hash: _hash, ...usuarioSinHash } = fila;
        return usuarioSinHash;
    }

    static async obtenerPorEmail(email) {
        const query = 'SELECT * FROM usuarios WHERE email = $1;';
        const { rows } = await db.query(query, [email]);
        if (rows.length === 0) return null;
        return new Usuario(rows[0]);
    }
}

module.exports = Usuario;
