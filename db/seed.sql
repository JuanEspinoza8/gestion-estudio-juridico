-- db/seed.sql
-- Datos de DEMOSTRACIÓN para desarrollo local. Todos los datos son ficticios.
--
--   ⚠  NO CORRER EN PRODUCCIÓN: crea un usuario con una contraseña pública.
--
-- Usuario demo:  demo@estudio.test  /  demo1234
-- (la contraseña se guarda hasheada con bcrypt, costo 10)
--
-- Requiere una base recién creada con db/schema.sql.
-- Uso: psql -h localhost -U postgres -d estudio -f db/seed.sql

BEGIN;

INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES
    ('Dra. Laura Demo', 'demo@estudio.test', '$2b$10$LSR.XiJBxbPuTjWwiU5BH.mNX14gYstfMry5EQSYsC/PfsiybGnHu', 'abogado');

INSERT INTO clientes (nombre_completo, dni, telefono, email, notas) VALUES
    ('Martina Gómez',     '30111222', '299 455-1020', 'martina.gomez@example.com', 'Prefiere contacto por WhatsApp.'),
    ('Julián Pereyra',    '27333444', '299 455-3344', 'julian.pereyra@example.com', NULL),
    ('Sofía Benítez',     '35666777', '299 412-8890', NULL,                         'Derivada por el Dr. Ruiz.'),
    ('Comercial Sur SRL', '30712345', '299 448-0000', 'administracion@example.com', 'CUIT cargado como DNI.');

-- Honorarios (tabla "expedientes") y pagos
INSERT INTO expedientes (cliente_id, caratula, honorarios_totales, cuotas_totales, valor_por_cuota) VALUES
    ((SELECT id FROM clientes WHERE dni = '30111222'), 'Honorarios juicio laboral',      600000, 6, 100000),
    ((SELECT id FROM clientes WHERE dni = '27333444'), 'Divorcio de común acuerdo',      350000, 1, 350000),
    ((SELECT id FROM clientes WHERE dni = '30712345'), 'Asesoramiento contractual 2026', 240000, 4,  60000);

INSERT INTO pagos (cliente_id, expediente_id, monto, fecha_pago, metodo_pago) VALUES
    ((SELECT id FROM clientes WHERE dni = '30111222'),
     (SELECT id FROM expedientes WHERE caratula = 'Honorarios juicio laboral'), 100000, CURRENT_DATE - 40, 'Transferencia Bancaria'),
    ((SELECT id FROM clientes WHERE dni = '30111222'),
     (SELECT id FROM expedientes WHERE caratula = 'Honorarios juicio laboral'), 100000, CURRENT_DATE - 10, 'Efectivo'),
    ((SELECT id FROM clientes WHERE dni = '27333444'),
     (SELECT id FROM expedientes WHERE caratula = 'Divorcio de común acuerdo'), 350000, CURRENT_DATE - 5, 'Transferencia Bancaria'),
    ((SELECT id FROM clientes WHERE dni = '30712345'),
     (SELECT id FROM expedientes WHERE caratula = 'Asesoramiento contractual 2026'), 30000, CURRENT_DATE - 2, 'Cheque');

-- Expedientes judiciales (tabla "causas_judiciales")
INSERT INTO causas_judiciales (cliente_id, nro_expediente, caratula, juzgado, estado) VALUES
    ((SELECT id FROM clientes WHERE dni = '30111222'), '12345/2026', 'Gómez, Martina c/ Distribuidora Andina SA s/ despido', 'Juzgado Laboral N° 2 - Neuquén', 'Período de prueba'),
    ((SELECT id FROM clientes WHERE dni = '27333444'), '6789/2026',  'Pereyra, Julián s/ divorcio',                           'Juzgado de Familia N° 1 - Neuquén', 'Iniciado'),
    ((SELECT id FROM clientes WHERE dni = '35666777'), '2468/2025',  'Benítez, Sofía c/ Aseguradora del Sur s/ daños',       'Juzgado Civil N° 4 - Neuquén', 'Sentencia');

-- Agenda del usuario demo, con fechas relativas a hoy
INSERT INTO turnos (usuario_id, cliente_id, causa_id, fecha, hora, motivo, tipo_evento, estado, recordatorio_offset_min) VALUES
    ((SELECT id FROM usuarios WHERE email = 'demo@estudio.test'),
     (SELECT id FROM clientes WHERE dni = '30111222'),
     (SELECT id FROM causas_judiciales WHERE nro_expediente = '12345/2026'),
     CURRENT_DATE, '10:00', 'Audiencia de conciliación', 'Audiencia', 'pendiente', 1440),
    ((SELECT id FROM usuarios WHERE email = 'demo@estudio.test'),
     (SELECT id FROM clientes WHERE dni = '27333444'), NULL,
     CURRENT_DATE, '16:30', 'Reunión Cliente', 'Reunión Cliente', 'pendiente', 60),
    ((SELECT id FROM usuarios WHERE email = 'demo@estudio.test'),
     (SELECT id FROM clientes WHERE dni = '35666777'),
     (SELECT id FROM causas_judiciales WHERE nro_expediente = '2468/2025'),
     CURRENT_DATE + 2, '09:30', 'Presentar Escrito', 'Presentar Escrito', 'pendiente', 1440),
    ((SELECT id FROM usuarios WHERE email = 'demo@estudio.test'),
     NULL, NULL,
     CURRENT_DATE + 3, '12:00', 'Renovar matrícula', 'Otro', 'pendiente', 0),
    ((SELECT id FROM usuarios WHERE email = 'demo@estudio.test'),
     (SELECT id FROM clientes WHERE dni = '30712345'), NULL,
     CURRENT_DATE - 3, '11:00', 'Mediación', 'Mediación', 'completado', 1440);

INSERT INTO notas_cliente (cliente_id, contenido, fecha_vencimiento) VALUES
    ((SELECT id FROM clientes WHERE dni = '30111222'), 'Pedir recibos de sueldo de los últimos 6 meses.', CURRENT_DATE + 7),
    ((SELECT id FROM clientes WHERE dni = '35666777'), 'Vence el plazo para apelar.',                    CURRENT_DATE + 4);

INSERT INTO notas_rapidas (usuario_id, contenido) VALUES
    ((SELECT id FROM usuarios WHERE email = 'demo@estudio.test'), 'Llamar al juzgado laboral por la cédula pendiente.');

INSERT INTO actividad_reciente (usuario_id, cliente_id, accion, detalles) VALUES
    ((SELECT id FROM usuarios WHERE email = 'demo@estudio.test'),
     (SELECT id FROM clientes WHERE dni = '30712345'), 'PAGO_RECIBIDO', 'Se recibió un pago de $30000 (Cheque)');

COMMIT;
