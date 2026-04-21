// server.js
const express = require('express');
const cors = require('cors');
const db = require('./src/config/db');
require('dotenv').config();

// Rutas existentes
const authRoutes = require('./src/routes/authRoutes');
const clientesRoutes = require('./src/routes/clientesRoutes');
const turnosRoutes = require('./src/routes/turnosRoutes');
const pagosRoutes = require('./src/routes/pagosRoutes');

// Rutas nuevas
const expedientesRoutes = require('./src/routes/expedientesRoutes');
const causasRoutes = require('./src/routes/causasRoutes');
const documentosRoutes = require('./src/routes/documentosRoutes');
const notasRoutes = require('./src/routes/notasRoutes');
const actividadRoutes = require('./src/routes/actividadRoutes');

const verificarToken = require('./src/middlewares/authMiddleware');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// RUTAS PÚBLICAS
app.use('/api/auth', authRoutes);

// RUTAS PRIVADAS
app.use('/api/clientes', verificarToken, clientesRoutes);
app.use('/api/turnos', verificarToken, turnosRoutes);
app.use('/api/pagos', verificarToken, pagosRoutes);
app.use('/api/expedientes', verificarToken, expedientesRoutes); // Honorarios viejos
app.use('/api/causas', verificarToken, causasRoutes); // Nuevos Expedientes
app.use('/api/documentos', verificarToken, documentosRoutes); // PDFs
app.use('/api/notas', verificarToken, notasRoutes);
app.use('/api/actividad', verificarToken, actividadRoutes);

app.get('/', (req, res) => {
    res.json({ mensaje: 'Servidor del Estudio Jurídico funcionando', estado: 'OK' });
});

app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`Servidor corriendo en el puerto ${PORT}`);
    console.log(`=========================================`);
});