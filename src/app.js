// src/app.js
// Arma la aplicación Express (middlewares y rutas) sin levantar el servidor,
// así la usan tanto server.js como los tests.
const express = require('express');
const cors = require('cors');

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

const app = express();
app.use(cors());
app.use(express.json());

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

app.get('/', (req, res) => {
    res.json({ mensaje: 'Servidor del Estudio Jurídico funcionando', estado: 'OK' });
});

app.use('/api', rutaNoEncontrada);
app.use(manejarErrores);

module.exports = app;
