// src/routes/documentosRoutes.js
// PDFs de las causas. Se guardan en un bucket privado y se abren con una URL
// firmada que dura un minuto y solo pide un usuario autenticado.
const express = require('express');
const router = express.Router();
const multer = require('multer');
const Causa = require('../models/Causa');
const Documento = require('../models/Documento');
const storage = require('../services/storage');
const HttpError = require('../utils/httpError');
const esquemas = require('../validators/esquemas');
const { validar, validarIdParam } = require('../middlewares/validar');
const { logActividad } = require('../utils/logger');

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

// El mimetype lo declara el navegador: además se verifica que el contenido
// empiece con la firma de un PDF.
function esPdf(buffer) {
    return buffer.subarray(0, 4).toString('latin1') === '%PDF';
}

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

router.param('id', validarIdParam);
router.param('causaId', validarIdParam);

// GET: Obtener documentos de una causa específica
router.get('/causa/:causaId', async (req, res) => {
    const documentos = await Documento.obtenerPorCausa(req.params.causaId);
    res.json(documentos);
});

// GET: URL firmada (60 s) para abrir un documento
router.get('/:id/url', async (req, res) => {
    const documento = await Documento.obtenerPorId(req.params.id);
    if (!documento) {
        return res.status(404).json({ error: 'Documento no encontrado' });
    }
    const url = await storage.urlFirmada(documento.ruta_archivo);
    res.json({ url, expira_en: storage.DURACION_URL_FIRMADA });
});

// POST: Subir un documento (PDF)
router.post('/', upload.single('pdf'), validar(esquemas.documento), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No se envió ningún archivo' });
    }
    if (!esPdf(req.file.buffer)) {
        return res.status(400).json({ error: 'El archivo no es un PDF válido' });
    }

    const causaId = req.body.causa_id;
    if (!(await Causa.obtenerPorId(causaId))) {
        return res.status(404).json({ error: 'Causa no encontrada' });
    }

    // latin1 -> utf8 corrige las tildes que multer decodifica mal
    const nombreArchivo = limpiarNombreArchivo(Buffer.from(req.file.originalname, 'latin1').toString('utf8'));
    const rutaArchivo = `expediente_${causaId}/${Date.now()}_${nombreArchivo.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    await storage.subirPdf(rutaArchivo, req.file.buffer);

    let documento;
    try {
        documento = await Documento.crear({ causa_id: causaId, nombre_archivo: nombreArchivo, ruta_archivo: rutaArchivo });
    } catch (error) {
        // Si no se pudo registrar en la base, el archivo subido quedaría huérfano
        await storage.eliminar([rutaArchivo]);
        throw error;
    }

    logActividad(req.usuario.id, null, 'DOCUMENTO_SUBIDO', `Se subió el documento ${nombreArchivo} al expediente.`);

    res.status(201).json(documento);
});

// DELETE: Eliminar un documento
router.delete('/:id', async (req, res) => {
    const documento = await Documento.eliminar(req.params.id);
    if (!documento) {
        return res.status(404).json({ error: 'Documento no encontrado' });
    }
    await storage.eliminar([documento.ruta_archivo]);
    res.json({ mensaje: 'Documento eliminado correctamente' });
});

module.exports = router;
