const Actividad = require('../models/Actividad');

/**
 * Función asíncrona para registrar la actividad sin bloquear la petición principal (Fire and Forget)
 * @param {number} usuario_id ID del usuario que realizó la acción
 * @param {number|null} cliente_id ID del cliente afectado (opcional)
 * @param {string} accion Descripción corta de la acción (ej: 'NUEVO_PAGO', 'TURNO_COMPLETADO')
 * @param {string} detalles Descripción detallada de lo que sucedió
 */
function logActividad(usuario_id, cliente_id, accion, detalles) {
    // Fire and forget: No hacemos 'await' para no ralentizar la respuesta al cliente
    const nuevaActividad = new Actividad({
        usuario_id,
        cliente_id,
        accion,
        detalles
    });
    
    nuevaActividad.guardar().catch(err => {
        console.error('Error al registrar actividad en el logger:', err);
    });
}

module.exports = { logActividad };
