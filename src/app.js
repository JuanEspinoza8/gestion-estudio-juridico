// src/app.js
// Arma la aplicación Express (middlewares y rutas) sin levantar el servidor,
// así la usan tanto server.js como los tests.
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const authRoutes = require('./routes/authRoutes');
const clientesRoutes = require('./routes/clientesRoutes');
const turnosRoutes = require('./routes/turnosRoutes');
const pagosRoutes = require('./routes/pagosRoutes');
const expedientesRoutes = require('./routes/expedientesRoutes');
const causasRoutes = require('./routes/causasRoutes');
const documentosRoutes = require('./routes/documentosRoutes');
const notasRoutes = require('./routes/notasRoutes');
const actividadRoutes = require('./routes/actividadRoutes');
const notasRapidasRoutes = require('./routes/notasRapidasRoutes');
const cronRoutes = require('./routes/cronRoutes');

const verificarToken = require('./middlewares/authMiddleware');
const { rutaNoEncontrada, manejarErrores } = require('./middlewares/errorHandler');

// Orígenes del frontend que pueden llamar a la API desde el navegador, separados
// por coma (ej: https://estudio.vercel.app). Los pedidos sin header Origin
// (curl, UptimeRobot, mismo origen) no se ven afectados por CORS.
const origenesPermitidos = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origen) => origen.trim())
    .filter(Boolean);

const app = express();

// Render (y la mayoría de los hosts) ponen un proxy adelante: confiamos en un
// salto para que req.ip sea la IP real del cliente (la usa el rate limit).
app.set('trust proxy', 1);

app.use(
    helmet({
        // La política aplica a las páginas de public/ cuando las sirve Express.
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
                // El HTML usa atributos onclick="..."; pendiente pasarlos a addEventListener
                scriptSrcAttr: ["'unsafe-inline'"],
                styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdn.jsdelivr.net'],
                // data: para la fuente de íconos que FullCalendar trae embebida
                fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
                imgSrc: ["'self'", 'data:'],
                connectSrc: ["'self'"],
                objectSrc: ["'none'"],
                frameAncestors: ["'none'"]
            }
        }
    })
);
app.use(cors({ origin: origenesPermitidos }));
app.use(express.json({ limit: '100kb' }));

// RUTAS PÚBLICAS
app.use('/api/auth', authRoutes);
app.use('/api/cron', cronRoutes); // Protegida con CRON_SECRET, no con JWT

// RUTAS PRIVADAS
// Nota sobre los nombres: la tabla "expedientes" guarda los honorarios de un
// cliente y "causas_judiciales" son los expedientes judiciales (ver README).
app.use('/api/clientes', verificarToken, clientesRoutes);
app.use('/api/turnos', verificarToken, turnosRoutes);
app.use('/api/pagos', verificarToken, pagosRoutes);
app.use('/api/expedientes', verificarToken, expedientesRoutes); // Honorarios
app.use('/api/causas', verificarToken, causasRoutes); // Expedientes judiciales
app.use('/api/documentos', verificarToken, documentosRoutes); // PDFs de las causas
app.use('/api/notas', verificarToken, notasRoutes);
app.use('/api/notas-rapidas', verificarToken, notasRapidasRoutes);
app.use('/api/actividad', verificarToken, actividadRoutes);

// Estado del servicio (lo usa el monitor externo para mantener Render despierto)
app.get('/', (req, res) => {
    res.json({ mensaje: 'Servidor del Estudio Jurídico funcionando', estado: 'OK' });
});

app.use('/api', rutaNoEncontrada);

// Frontend estático. En producción lo sirve Vercel; esto permite levantar todo
// el sistema localmente con un solo comando (http://localhost:3000/login.html).
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(manejarErrores);

module.exports = app;
