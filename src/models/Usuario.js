/**
 * Clase que representa a los profesionales (abogados/administrativos) que usan el sistema.
 */
class Usuario {
    constructor(id, nombre, email, passwordHash, rol = 'user', creadoEn = null) {
        this.id = id;
        this.nombre = nombre;
        this.email = email;
        this.passwordHash = passwordHash; // Almacena la contraseña ya encriptada
        this.rol = rol;
        this.creadoEn = creadoEn || new Date().toISOString();
    }

    // ==========================================
    // MÉTODOS LÓGICOS (Preparados para Fase 3)
    // ==========================================

    async autenticar(password) {
        // TODO: Lógica para comparar el password ingresado con el hash de la BD
        console.log(`Intentando autenticar al usuario: ${this.email}`);
    }

    guardar() {
        console.log("Registrando nuevo usuario en el sistema...");
    }

    static obtenerPorEmail(email) {
        // Útil para el proceso de Login
        console.log(`Buscando usuario por email: ${email}`);
        return null;
    }
}

export default Usuario;