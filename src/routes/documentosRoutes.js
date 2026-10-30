const express = require('express');
const router = express.Router();
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const db = require('../config/db');
const HttpError = require('../utils/httpError');
const { logActividad } = require('../utils/logger');

// Inicializar Supabase Storage
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Configurar multer (guardar archivo en memoria)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB límite
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new HttpError(400, 'Solo se permiten archivos PDF'));
        }
    }
});

// El nombre original lo elige quien sube el archivo: se guarda sin rutas, sin
// caracteres de control ni < > " y con largo acotado. (El frontend además lo
// escapa al mostrarlo.)
function limpiarNombreArchivo(nombre) {
    const limpio = nombre
        .split(/[\\/]/)
        .pop()
        // eslint-disable-next-line no-control-regex
        .replace(/[\u0000-\u001f\u007f<>"]/g, '')
        .trim()
        .slice(0, 200);
    return limpio || 'documento.pdf';
}

// GET: Obtener documentos de una causa específica
router.get('/causa/:causaId', async (req, res) => {
    const query = 'SELECT * FROM documentos_causa WHERE causa_id = $1 ORDER BY subido_en DESC;';
    const { rows } = await db.query(query, [req.params.causaId]);
    res.json(rows);
});

// POST: Subir un documento (PDF)
router.post('/', upload.single('pdf'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No se envió ningún archivo' });
    }

    // Convertir el nombre del archivo para solucionar el problema de las tildes corruptas
    req.file.originalname = limpiarNombreArchivo(Buffer.from(req.file.originalname, 'latin1').toString('utf8'));

    const { causa_id } = req.body;
    if (!causa_id) {
        return res.status(400).json({ error: 'Se requiere el ID de la causa' });
    }

    const fileName = `${Date.now()}_${req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = `expediente_${causa_id}/${fileName}`;

    // Subir a Supabase Storage (bucket: documentos)
    const { error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(filePath, req.file.buffer, {
            contentType: 'application/pdf',
            upsert: false
        });

    if (uploadError) {
        console.error('Error en Supabase Storage:', uploadError);
        return res.status(500).json({ error: 'Error al subir el archivo a la nube' });
    }

    // Obtener URL Pública
    const { data: publicUrlData } = supabase.storage
        .from('documentos')
        .getPublicUrl(filePath);

    const url_archivo = publicUrlData.publicUrl;

    // Guardar registro en PostgreSQL
    const query = `
        INSERT INTO documentos_causa (causa_id, nombre_archivo, url_archivo)
        VALUES ($1, $2, $3) RETURNING *;
    `;
    const { rows } = await db.query(query, [causa_id, req.file.originalname, url_archivo]);

    // Registrar actividad
    logActividad(
        req.usuario ? req.usuario.id : 1,
        null,
        'DOCUMENTO_SUBIDO',
        `Se subió el documento ${req.file.originalname} al expediente.`
    );

    res.status(201).json(rows[0]);
});

// DELETE: Eliminar un documento
router.delete('/:id', async (req, res) => {
    const docId = req.params.id;

    const { rows: docs } = await db.query('SELECT * FROM documentos_causa WHERE id = $1', [docId]);
    if (docs.length === 0) {
        return res.status(404).json({ error: 'Documento no encontrado' });
    }

    const doc = docs[0];
    const urlParts = doc.url_archivo.split('/documentos/');
    if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from('documentos').remove([filePath]);
    }

    await db.query('DELETE FROM documentos_causa WHERE id = $1', [docId]);

    res.json({ mensaje: 'Documento eliminado correctamente' });
});

module.exports = router;
