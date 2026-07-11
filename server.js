// server.js
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
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
const notasRapidasRoutes = require('./src/routes/notasRapidasRoutes');
const cronRoutes = require('./src/routes/cronRoutes');

const { enviarRecordatoriosPendientes } = require('./src/services/recordatorios');
const verificarToken = require('./src/middlewares/authMiddleware');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// RUTAS PÚBLICAS
app.use('/api/auth', authRoutes);
app.use('/api/cron', cronRoutes); // Protegida con CRON_SECRET, no con JWT

// RUTAS PRIVADAS
app.use('/api/clientes', verificarToken, clientesRoutes);
app.use('/api/turnos', verificarToken, turnosRoutes);
app.use('/api/pagos', verificarToken, pagosRoutes);
app.use('/api/expedientes', verificarToken, expedientesRoutes); // Honorarios viejos
app.use('/api/causas', verificarToken, causasRoutes); // Nuevos Expedientes
app.use('/api/documentos', verificarToken, documentosRoutes); // PDFs
app.use('/api/notas', verificarToken, notasRoutes);
app.use('/api/notas-rapidas', verificarToken, notasRapidasRoutes);
app.use('/api/actividad', verificarToken, actividadRoutes);

app.get('/', (req, res) => {
    res.json({ mensaje: 'Servidor del Estudio Jurídico funcionando', estado: 'OK' });
});

// Cron interno: procesa recordatorios cada 5 minutos mientras el proceso esté vivo.
// En Render free el servicio se duerme, por eso el ping externo (UptimeRobot) al
// endpoint /api/cron/recordatorios es lo que garantiza el envío.
cron.schedule('*/5 * * * *', async () => {
    try {
        const r = await enviarRecordatoriosPendientes();
        if (r.enviados > 0 || r.errores > 0) {
            console.log(`[cron] Recordatorios -> enviados: ${r.enviados}, errores: ${r.errores}, omitidos: ${r.omitidos}`);
        }
    } catch (error) {
        console.error('[cron] Error al procesar recordatorios:', error.message);
    }
});

app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`Servidor corriendo en el puerto ${PORT}`);
    console.log(`=========================================`);
});