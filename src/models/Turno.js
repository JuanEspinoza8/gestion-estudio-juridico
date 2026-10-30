const db = require('../config/db');

// La fecha/hora de los turnos se guarda como hora local (wall-clock) de
// Argentina; la zona se usa para calcular "hoy" y la ventana de recordatorio
// sin importar en qué timezone corran el servidor y la base (UTC).
const { TZ_ESTUDIO } = require('../config/zonaHoraria');

class Turno {
    constructor(turno) {
        this.id = turno.id || null;
        this.cliente_id =
            turno.cliente_id === '' || turno.cliente_id === 'null' || !turno.cliente_id ? null : turno.cliente_id;
        this.causa_id = turno.causa_id === '' || turno.causa_id === 'null' || !turno.causa_id ? null : turno.causa_id;
        this.usuario_id = turno.usuario_id;
        this.fecha = turno.fecha;
        this.hora = turno.hora;
        this.motivo = turno.motivo;
        this.tipo_evento = turno.tipo_evento || 'Otro';
        this.estado = turno.estado || 'pendiente';
        // Minutos de anticipación del recordatorio. 0 o null = sin recordatorio.
        // Si no viene el campo (turno viejo o alta sin especificar), 1440 = 1 día antes.
        this.recordatorio_offset_min =
            turno.recordatorio_offset_min === '' ||
            turno.recordatorio_offset_min === null ||
            turno.recordatorio_offset_min === undefined
                ? 1440
                : parseInt(turno.recordatorio_offset_min, 10);
    }

    // Todos los métodos que leen o modifican un turno filtran por usuario_id: cada
    // abogado solo ve y toca su propia agenda. El usuario_id siempre sale del JWT.
    async guardar() {
        if (this.id) {
            // Al editar un turno reseteamos recordatorio_enviado = false: si se movió
            // la fecha/hora o el offset, el recordatorio debe volver a dispararse.
            // Devuelve undefined si el turno no existe o es de otro usuario.
            const query = `
                UPDATE turnos
                SET cliente_id = $1, causa_id = $2, fecha = $3, hora = $4,
                    motivo = $5, estado = $6, tipo_evento = $7, recordatorio_offset_min = $8,
                    recordatorio_enviado = false
                WHERE id = $9 AND usuario_id = $10 RETURNING *;
            `;
            const values = [
                this.cliente_id,
                this.causa_id,
                this.fecha,
                this.hora,
                this.motivo,
                this.estado,
                this.tipo_evento,
                this.recordatorio_offset_min,
                this.id,
                this.usuario_id
            ];
            const { rows } = await db.query(query, values);
            return rows[0];
        } else {
            const query = `
                INSERT INTO turnos (cliente_id, causa_id, usuario_id, fecha, hora, motivo, estado, tipo_evento, recordatorio_offset_min)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *;
            `;
            const values = [
                this.cliente_id,
                this.causa_id,
                this.usuario_id,
                this.fecha,
                this.hora,
                this.motivo,
                this.estado,
                this.tipo_evento,
                this.recordatorio_offset_min
            ];
            const { rows } = await db.query(query, values);
            this.id = rows[0].id;
            return rows[0];
        }
    }

    async cambiarEstado(nuevoEstado) {
        const query = 'UPDATE turnos SET estado = $1 WHERE id = $2 AND usuario_id = $3 RETURNING *;';
        const { rows } = await db.query(query, [nuevoEstado, this.id, this.usuario_id]);
        this.estado = nuevoEstado;
        return rows[0];
    }

    static async eliminar(id, usuarioId) {
        const query = 'DELETE FROM turnos WHERE id = $1 AND usuario_id = $2 RETURNING *;';
        const { rows } = await db.query(query, [id, usuarioId]);
        return rows[0];
    }

    static async obtenerPorId(id, usuarioId) {
        const query = `
            SELECT t.*, c.nombre_completo, cj.caratula, cj.nro_expediente
            FROM turnos t
            LEFT JOIN clientes c ON t.cliente_id = c.id
            LEFT JOIN causas_judiciales cj ON t.causa_id = cj.id
            WHERE t.id = $1 AND t.usuario_id = $2;
        `;
        const { rows } = await db.query(query, [id, usuarioId]);
        if (rows.length === 0) return null;
        return rows[0];
    }

    static async obtenerPorCliente(clienteId, usuarioId) {
        const query = `
            SELECT t.*, c.nombre_completo, cj.caratula, cj.nro_expediente
            FROM turnos t
            LEFT JOIN clientes c ON t.cliente_id = c.id
            LEFT JOIN causas_judiciales cj ON t.causa_id = cj.id
            WHERE t.cliente_id = $1 AND t.usuario_id = $2
            ORDER BY t.fecha DESC, t.hora DESC;
        `;
        const { rows } = await db.query(query, [clienteId, usuarioId]);
        return rows;
    }

    static async obtenerProximos(usuarioId) {
        const query = `
            SELECT t.*, c.nombre_completo, cj.caratula, cj.nro_expediente
            FROM turnos t
            LEFT JOIN clientes c ON t.cliente_id = c.id
            LEFT JOIN causas_judiciales cj ON t.causa_id = cj.id
            WHERE t.usuario_id = $1
            ORDER BY t.fecha DESC, t.hora DESC;
        `;
        const { rows } = await db.query(query, [usuarioId]);
        return rows;
    }

    // Solo los turnos de HOY (para el dashboard)
    static async obtenerHoy(usuarioId) {
        const query = `
            SELECT t.*, c.nombre_completo
            FROM turnos t
            LEFT JOIN clientes c ON t.cliente_id = c.id
            WHERE t.usuario_id = $1 AND t.fecha = (NOW() AT TIME ZONE $2)::date AND t.estado = 'pendiente'
            ORDER BY t.hora ASC;
        `;
        const { rows } = await db.query(query, [usuarioId, TZ_ESTUDIO]);
        return rows;
    }

    // ==========================================
    // RECORDATORIOS POR EMAIL (cron)
    // ==========================================

    /**
     * Turnos pendientes cuyo momento de aviso ya llegó pero que todavía no se
     * notificaron. Devuelve también el email del abogado y datos del cliente/causa
     * para armar el correo. La fecha/hora se interpreta como hora local del estudio.
     */
    static async obtenerPendientesRecordatorio() {
        const query = `
            SELECT t.*,
                   c.nombre_completo AS cliente_nombre,
                   cj.caratula, cj.nro_expediente,
                   u.email AS usuario_email, u.nombre AS usuario_nombre
            FROM turnos t
            LEFT JOIN clientes c ON t.cliente_id = c.id
            LEFT JOIN causas_judiciales cj ON t.causa_id = cj.id
            JOIN usuarios u ON t.usuario_id = u.id
            WHERE t.estado = 'pendiente'
              AND t.recordatorio_enviado = false
              AND t.recordatorio_offset_min IS NOT NULL
              AND t.recordatorio_offset_min > 0
              AND u.email IS NOT NULL
              AND ((t.fecha + t.hora) AT TIME ZONE $1) > NOW()
              AND (((t.fecha + t.hora) AT TIME ZONE $1) - (t.recordatorio_offset_min * INTERVAL '1 minute')) <= NOW()
            ORDER BY t.fecha ASC, t.hora ASC;
        `;
        const { rows } = await db.query(query, [TZ_ESTUDIO]);
        return rows;
    }

    static async marcarRecordatorioEnviado(id) {
        const query = 'UPDATE turnos SET recordatorio_enviado = true WHERE id = $1 RETURNING id;';
        const { rows } = await db.query(query, [id]);
        return rows[0];
    }
}

module.exports = Turno;
