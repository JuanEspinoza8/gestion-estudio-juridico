// server.js
// Punto de entrada: carga la configuración, levanta el servidor HTTP y el cron
// de recordatorios. La aplicación Express se arma en src/app.js.
require('dotenv').config();

const cron = require('node-cron');
const app = require('./src/app');
const db = require('./src/config/db');
const { enviarRecordatoriosPendientes } = require('./src/services/recordatorios');

if (!process.env.JWT_SECRET) {
    console.error('Falta la variable de entorno JWT_SECRET. Revisá el archivo .env (ver .env.example).');
    process.exit(1);
}

if (!process.env.CORS_ORIGINS) {
    console.warn('CORS_ORIGINS está vacía: el navegador solo podrá usar la API desde el mismo origen.');
}

const PORT = process.env.PORT || 3000;

db.verificarConexion();

// Cron interno: procesa recordatorios cada 5 minutos mientras el proceso esté vivo.
// En Render free el servicio se duerme, por eso el ping externo (UptimeRobot) al
// endpoint /api/cron/recordatorios es lo que garantiza el envío.
cron.schedule('*/5 * * * *', async () => {
    try {
        const r = await enviarRecordatoriosPendientes();
        if (r.enviados > 0 || r.errores > 0) {
            console.log(
                `[cron] Recordatorios -> enviados: ${r.enviados}, errores: ${r.errores}, omitidos: ${r.omitidos}`
            );
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
