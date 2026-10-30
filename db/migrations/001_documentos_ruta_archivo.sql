-- 001_documentos_ruta_archivo.sql
-- Los PDFs pasan a un bucket privado y se abren con URLs firmadas, así que se
-- guarda la ruta del archivo dentro del bucket en vez de su URL pública.
--
-- Es aditiva: el código anterior ignora la columna nueva, por eso se corre ANTES
-- de desplegar el backend que la usa. Se puede correr más de una vez.

ALTER TABLE documentos_causa ADD COLUMN IF NOT EXISTS ruta_archivo TEXT;

-- Completa la ruta de los documentos existentes a partir de su URL pública:
-- https://<proyecto>.supabase.co/storage/v1/object/public/documentos/<ruta>
UPDATE documentos_causa
SET ruta_archivo = split_part(url_archivo, '/documentos/', 2)
WHERE ruta_archivo IS NULL
  AND url_archivo LIKE '%/documentos/%';

-- Las filas nuevas ya no completan url_archivo
ALTER TABLE documentos_causa ALTER COLUMN url_archivo DROP NOT NULL;

-- Verificación: tiene que devolver 0
-- SELECT count(*) FROM documentos_causa WHERE ruta_archivo IS NULL;
