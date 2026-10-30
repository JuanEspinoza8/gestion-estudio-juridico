-- db/schema.sql
-- Esquema de la base, reconstruido a partir de los modelos (src/models), del DER
-- (docs/DER-Estudio-Juridico.png) y de las migraciones de db/migrations.
-- Sirve para crear una base nueva de desarrollo; la de producción ya existe en
-- Supabase y puede diferir en detalles (para un volcado exacto:
-- pg_dump --schema-only).
--
-- Uso: psql -h localhost -U postgres -d estudio -f db/schema.sql
--      (o pegarlo en el SQL Editor de un proyecto de Supabase nuevo)
--
-- Nombres heredados (ver README): la tabla "expedientes" guarda los HONORARIOS
-- de un cliente y "causas_judiciales" son los expedientes judiciales.

BEGIN;

CREATE TABLE usuarios (
    id            SERIAL PRIMARY KEY,
    nombre        VARCHAR(150) NOT NULL,
    email         VARCHAR(254) NOT NULL UNIQUE,
    password_hash VARCHAR(100) NOT NULL,          -- bcrypt, nunca la contraseña
    rol           VARCHAR(30)  NOT NULL DEFAULT 'abogado',
    creado_en     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE clientes (
    id              SERIAL PRIMARY KEY,
    nombre_completo VARCHAR(150) NOT NULL,
    dni             VARCHAR(20)  NOT NULL UNIQUE,
    telefono        VARCHAR(50),
    email           VARCHAR(254) UNIQUE,
    notas           TEXT,
    activo          BOOLEAN      NOT NULL DEFAULT true,
    creado_en       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Honorarios acordados con un cliente, opcionalmente en cuotas
CREATE TABLE expedientes (
    id                 SERIAL PRIMARY KEY,
    cliente_id         INTEGER       NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    caratula           VARCHAR(300)  NOT NULL,     -- concepto (en la API: "descripcion")
    estado             VARCHAR(30)   NOT NULL DEFAULT 'Activo',
    honorarios_totales NUMERIC(10,2) NOT NULL CHECK (honorarios_totales > 0),
    cuotas_totales     INTEGER       NOT NULL DEFAULT 1 CHECK (cuotas_totales BETWEEN 1 AND 36),
    valor_por_cuota    NUMERIC(10,2),
    creado_en          TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TABLE pagos (
    id            SERIAL PRIMARY KEY,
    cliente_id    INTEGER       NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    expediente_id INTEGER       REFERENCES expedientes(id) ON DELETE SET NULL,
    monto         NUMERIC(10,2) NOT NULL CHECK (monto > 0),
    fecha_pago    DATE          NOT NULL DEFAULT CURRENT_DATE,
    metodo_pago   VARCHAR(50),
    recibo_url    VARCHAR(500),
    creado_en     TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Expedientes judiciales
CREATE TABLE causas_judiciales (
    id             SERIAL PRIMARY KEY,
    cliente_id     INTEGER      NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    nro_expediente VARCHAR(100),
    caratula       VARCHAR(300) NOT NULL,
    juzgado        VARCHAR(200),
    estado         VARCHAR(100) NOT NULL DEFAULT 'Iniciado',
    creado_en      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- PDFs de una causa. El archivo está en el bucket privado "documentos" de
-- Supabase Storage; acá solo se guarda su ruta dentro del bucket.
CREATE TABLE documentos_causa (
    id             SERIAL PRIMARY KEY,
    causa_id       INTEGER      NOT NULL REFERENCES causas_judiciales(id) ON DELETE CASCADE,
    nombre_archivo VARCHAR(255) NOT NULL,
    ruta_archivo   TEXT,                           -- ej: expediente_5/1713_contrato.pdf
    url_archivo    TEXT,                           -- legado: URL pública previa a la migración 001
    subido_en      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Agenda: cada turno pertenece a un usuario (abogado)
CREATE TABLE turnos (
    id                      SERIAL PRIMARY KEY,
    usuario_id              INTEGER      NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    cliente_id              INTEGER      REFERENCES clientes(id) ON DELETE CASCADE,  -- NULL = tarea interna
    causa_id                INTEGER      REFERENCES causas_judiciales(id) ON DELETE SET NULL,
    fecha                   DATE         NOT NULL,  -- hora local de Argentina
    hora                    TIME         NOT NULL,
    motivo                  VARCHAR(300) NOT NULL,
    tipo_evento             VARCHAR(30)  NOT NULL DEFAULT 'Otro',
    estado                  VARCHAR(20)  NOT NULL DEFAULT 'pendiente',
    recordatorio_offset_min INTEGER      DEFAULT 1440,  -- minutos antes; 0 o NULL = sin aviso
    recordatorio_enviado    BOOLEAN      NOT NULL DEFAULT false,
    creado_en               TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE notas_cliente (
    id                SERIAL PRIMARY KEY,
    cliente_id        INTEGER     NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    contenido         TEXT        NOT NULL,
    fecha_vencimiento DATE,
    estado            VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    creado_en         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Log de auditoría que alimenta "Actividad reciente" del dashboard
CREATE TABLE actividad_reciente (
    id         SERIAL PRIMARY KEY,
    usuario_id INTEGER     NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    cliente_id INTEGER     REFERENCES clientes(id) ON DELETE SET NULL,
    accion     VARCHAR(50) NOT NULL,
    detalles   TEXT,
    fecha      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notas rápidas personales del dashboard
CREATE TABLE notas_rapidas (
    id             SERIAL PRIMARY KEY,
    usuario_id     INTEGER     NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    contenido      TEXT        NOT NULL DEFAULT '',
    creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para las consultas más frecuentes
CREATE INDEX idx_expedientes_cliente  ON expedientes (cliente_id);
CREATE INDEX idx_pagos_cliente        ON pagos (cliente_id, fecha_pago);
CREATE INDEX idx_causas_cliente       ON causas_judiciales (cliente_id);
CREATE INDEX idx_documentos_causa     ON documentos_causa (causa_id);
CREATE INDEX idx_turnos_usuario_fecha ON turnos (usuario_id, fecha);
CREATE INDEX idx_turnos_cliente       ON turnos (cliente_id);
CREATE INDEX idx_notas_cliente        ON notas_cliente (cliente_id);
CREATE INDEX idx_actividad_usuario    ON actividad_reciente (usuario_id, fecha DESC);
CREATE INDEX idx_notas_rapidas_usuario ON notas_rapidas (usuario_id);

-- El backend se conecta directo a Postgres como dueño de las tablas, así que RLS
-- no lo afecta. Activarlo sin políticas bloquea el acceso a estas tablas desde la
-- API REST pública de Supabase (anon / authenticated).
ALTER TABLE usuarios           ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE expedientes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE causas_judiciales  ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos_causa   ENABLE ROW LEVEL SECURITY;
ALTER TABLE turnos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas_cliente      ENABLE ROW LEVEL SECURITY;
ALTER TABLE actividad_reciente ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas_rapidas      ENABLE ROW LEVEL SECURITY;

COMMIT;
