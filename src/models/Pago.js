/**
 * Clase que representa un pago asociado a un cliente y a un expediente específico.
 */
class Pago {
    constructor(id, clienteId, expedienteId, monto, fechaPago, metodoPago, reciboUrl, creadoEn = null) {
        this.id = id;
        this.clienteId = clienteId; 
        this.expedienteId = expedienteId; // Clave: a qué juicio corresponde la plata
        this.monto = parseFloat(monto); 
        this.fechaPago = fechaPago || new Date().toISOString().split('T')[0]; 
        this.metodoPago = metodoPago;
        this.reciboUrl = reciboUrl;
        this.creadoEn = creadoEn || new Date().toISOString();
    }

    guardar() {
        console.log("Guardando pago en la base de datos...");
    }

    static obtenerPorCliente(clienteId) {
        console.log(`Buscando historial de pagos del cliente: ${clienteId}`);
        return [];
    }
}

export default Pago;