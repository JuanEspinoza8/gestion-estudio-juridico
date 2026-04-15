/**
 * Clase que gestiona las citas programadas en el estudio.
 */
class Turno {
    constructor(id, clienteId, usuarioId, fecha, hora, motivo, estado = 'pendiente', creadoEn = null) {
        this.id = id;
        this.clienteId = clienteId; // Relación con la tabla Clientes
        this.usuarioId = usuarioId; // Relación con la tabla Usuarios (quién atiende)
        this.fecha = fecha; // Formato YYYY-MM-DD
        this.hora = hora;   // Formato HH:mm
        this.motivo = motivo;
        this.estado = estado; // pendiente, completado, cancelado
        this.creadoEn = creadoEn || new Date().toISOString();
    }

    // ==========================================
    // MÉTODOS LÓGICOS (Preparados para Fase 3)
    // ==========================================

    cancelar() {
        this.estado = 'cancelado';
        console.log(`Turno ${this.id} cancelado.`);
    }

    completar() {
        this.estado = 'completado';
        console.log(`Turno ${this.id} marcado como completado.`);
    }

    static obtenerProximos(usuarioId) {
        // Para mostrar en el Dashboard los turnos del día del abogado
        console.log(`Obteniendo próximos turnos para el usuario: ${usuarioId}`);
        return [];
    }
}

export default Turno;