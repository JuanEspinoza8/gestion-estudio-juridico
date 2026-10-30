// src/services/storage.js
// Acceso a Supabase Storage. Los PDFs viven en el bucket privado "documentos" y
// solo se pueden abrir con una URL firmada de corta duración que genera el
// backend. El cliente se crea recién cuando se usa, así la app arranca (y los
// tests corren) sin credenciales de Supabase.
const { createClient } = require('@supabase/supabase-js');
const HttpError = require('../utils/httpError');

const BUCKET = 'documentos';
const DURACION_URL_FIRMADA = 60; // segundos

let supabase = null;

function bucket() {
    if (!supabase) {
        const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
        if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
            throw new HttpError(503, 'El almacenamiento de documentos no está configurado.');
        }
        supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
            auth: { persistSession: false }
        });
    }
    return supabase.storage.from(BUCKET);
}

async function subirPdf(ruta, contenido) {
    const { error } = await bucket().upload(ruta, contenido, {
        contentType: 'application/pdf',
        upsert: false
    });
    if (error) {
        console.error('[storage] Error al subir', ruta, error.message);
        throw new HttpError(502, 'No se pudo subir el archivo al almacenamiento.');
    }
}

async function urlFirmada(ruta) {
    const { data, error } = await bucket().createSignedUrl(ruta, DURACION_URL_FIRMADA);
    if (error) {
        console.error('[storage] Error al firmar', ruta, error.message);
        throw new HttpError(502, 'No se pudo generar el enlace al documento.');
    }
    return data.signedUrl;
}

// Borra archivos del bucket. No lanza: se llama después de borrar los registros
// de la base, así que si falla solo queda un archivo huérfano (privado) y se loguea.
async function eliminar(rutas) {
    const validas = rutas.filter(Boolean);
    if (validas.length === 0) return;
    try {
        const { error } = await bucket().remove(validas);
        if (error) throw error;
    } catch (error) {
        console.error('[storage] No se pudieron borrar archivos:', validas, error.message);
    }
}

module.exports = { subirPdf, urlFirmada, eliminar, DURACION_URL_FIRMADA };
