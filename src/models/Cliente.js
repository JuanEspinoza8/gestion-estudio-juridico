import Pago from './Pago.js'; 

/**
 * Clase principal que gestiona la información del cliente y sus relaciones.
 */
class Cliente {
    // Adaptado al modelo exacto de la base de datos
    constructor(id, nombreCompleto, dni, telefono, email, notas, activo = true, creadoEn = null) {
        this.id = id;
        this.nombreCompleto = nombreCompleto;
        this.dni = dni;
        this.telefono = telefono;
        this.email = email;
        this.notas = notas;
        this.activo = activo; // Para no borrar clientes, solo desactivarlos
        this.creadoEn = creadoEn || new Date().toISOString();
        
        // Relaciones (Basadas en las líneas del diagrama ERD)
        this.expedientes = []; 
        this.pagos = [];
        this.turnos = [];
    }

    guardar() {
        console.log(`Insertando cliente ${this.nombreCompleto} en la BD...`);
    }

    static obtenerTodos() {
        return [];
    }

    calcularDeudaTotal() {
        // TODO: Ahora la lógica matemática deberá sumar los 'honorarios_totales' 
        // de todos sus expedientes, y restarle la suma de todos sus pagos.
        console.log("Calculando balance consolidado de todos los expedientes...");
    }
}

export default Cliente;