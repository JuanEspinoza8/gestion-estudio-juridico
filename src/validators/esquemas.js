// src/validators/esquemas.js
// Esquemas de los datos que reciben las rutas que escriben. Los campos que no
// figuran acá se descartan (por ejemplo, un usuario_id mandado en el body).
const { z } = require('zod');

// Tope de cordura para montos; la precisión real la impone la columna NUMERIC
// (si se excede, Postgres falla y el handler de errores responde 400).
const MONTO_MAXIMO = 10_000_000_000;
const EVENTOS = ['Audiencia', 'Mediación', 'Presentar Escrito', 'Reunión Cliente', 'Otro'];
const ESTADOS_TURNO = ['pendiente', 'completado', 'cancelado'];

// '' y null llegan de inputs vacíos o selects sin elegir: se tratan como "sin valor"
const vacioANull = (valor) => (valor === '' || valor === 'null' || valor === undefined ? null : valor);

const id = z.coerce.number().int().positive();
const idOpcional = z.preprocess(vacioANull, id.nullable());
const textoOpcional = (max) => z.preprocess(vacioANull, z.string().trim().max(max).nullable());
const fechaOpcional = z.preprocess(vacioANull, z.iso.date('Fecha inválida (formato AAAA-MM-DD)').nullable());
const monto = z.coerce
    .number('El monto tiene que ser un número')
    .positive('El monto tiene que ser mayor a cero')
    .max(MONTO_MAXIMO, 'El monto es demasiado grande');

const login = z.object({
    email: z.string().trim().min(1, 'Ingresá el email').max(254),
    password: z.string().min(1, 'Ingresá la contraseña').max(200)
});

const cliente = z.object({
    nombre_completo: z.string().trim().min(1, 'El nombre es obligatorio').max(150),
    dni: z.coerce.string().trim().min(1, 'El DNI es obligatorio').max(20),
    telefono: textoOpcional(50),
    email: z.preprocess(vacioANull, z.email('Email inválido').max(254).nullable()),
    notas: textoOpcional(2000)
});

const causa = z.object({
    cliente_id: id,
    caratula: z.string().trim().min(1, 'La carátula es obligatoria').max(300),
    nro_expediente: textoOpcional(100),
    juzgado: textoOpcional(200),
    estado: textoOpcional(100)
});

// Al editar una causa no se cambia el cliente
const causaEdicion = causa.omit({ cliente_id: true });

const honorario = z.object({
    cliente_id: id,
    descripcion: z.string().trim().min(1, 'El concepto es obligatorio').max(300),
    honorarios_totales: monto,
    cuotas_totales: z.coerce.number().int().min(1).max(36).default(1)
});

const pago = z.object({
    cliente_id: id,
    expediente_id: idOpcional,
    monto,
    metodo_pago: textoOpcional(50),
    fecha_pago: fechaOpcional
});

const nota = z.object({
    cliente_id: id,
    contenido: z.string().trim().min(1, 'La nota no puede estar vacía').max(5000),
    fecha_vencimiento: fechaOpcional
});

const estadoNota = z.object({
    estado: z.enum(['pendiente', 'completado'])
});

const notaRapidaNueva = z.object({
    contenido: z.string().max(20000).default('')
});

const notaRapida = z.object({
    contenido: z.string().max(20000)
});

const turno = z.object({
    cliente_id: idOpcional,
    causa_id: idOpcional,
    fecha: z.iso.date('Fecha inválida (formato AAAA-MM-DD)'),
    hora: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Hora inválida (formato HH:MM)'),
    motivo: z.string().trim().min(1, 'El motivo es obligatorio').max(300),
    tipo_evento: z.enum(EVENTOS, 'Tipo de evento no válido').default('Otro'),
    estado: z.enum(ESTADOS_TURNO).default('pendiente'),
    recordatorio_offset_min: z.coerce
        .number()
        .int()
        .min(0)
        .max(60 * 24 * 30)
        .optional()
});

const estadoTurno = z.object({
    estado: z.enum(ESTADOS_TURNO)
});

const documento = z.object({
    causa_id: id
});

module.exports = {
    login,
    cliente,
    causa,
    causaEdicion,
    honorario,
    pago,
    nota,
    estadoNota,
    notaRapidaNueva,
    notaRapida,
    turno,
    estadoTurno,
    documento
};
