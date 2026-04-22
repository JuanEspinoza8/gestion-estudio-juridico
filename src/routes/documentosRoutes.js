const express = require('express');
const router = express.Router();
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const db = require('../config/db');
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
            cb(new Error('Solo se permiten archivos PDF'));
        }
    }
});

// GET: Obtener documentos de una causa específica
router.get('/causa/:causaId', async (req, res) => {
    try {
        const query = 'SELECT * FROM documentos_causa WHERE causa_id = $1 ORDER BY subido_en DESC;';
        const { rows } = await db.query(query, [req.params.causaId]);
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener documentos:', error);
        res.status(500).json({ error: 'Error al obtener los documentos' });
    }
});

// POST: Subir un documento (PDF)
router.post('/', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se envió ningún archivo' });
        }

        // Convertir el nombre del archivo para solucionar el problema de las tildes corruptas
        req.file.originalname = Buffer.from(req.file.originalname, 'latin1').toString('utf8');

        const { causa_id } = req.body;
        if (!causa_id) {
            return res.status(400).json({ error: 'Se requiere el ID de la causa' });
        }

        const fileName = `${Date.now()}_${req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const filePath = `expediente_${causa_id}/${fileName}`;

        // Subir a Supabase Storage (bucket: documentos)
        const { data, error: uploadError } = await supabase.storage
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
    } catch (error) {
        console.error('Error general en subida de documento:', error);
        res.status(500).json({ error: 'Error interno del servidor al procesar el archivo' });
    }
});

module.exports = router;
