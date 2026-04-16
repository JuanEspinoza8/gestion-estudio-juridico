// 1. Importamos las librerías base
const express = require('express');
const cors = require('cors');
const db = require('./src/config/db'); 
require('dotenv').config(); 

// 2. Importamos nuestros archivos de rutas
const authRoutes = require('./src/routes/authRoutes');
const clientesRoutes = require('./src/routes/clientesRoutes');
const turnosRoutes = require('./src/routes/turnosRoutes');
const pagosRoutes = require('./src/routes/pagosRoutes');

// 3. Importamos el middleware de seguridad (El "patovica")
const verificarToken = require('./src/middlewares/authMiddleware');

// 4. Inicializamos la app de Express y configuraciones
const app = express();
app.use(cors()); 
app.use(express.json()); 

const PORT = process.env.PORT || 3000;

// ==========================================
// CONFIGURACIÓN DE ENDPOINTS (RUTAS)
// ==========================================

// RUTAS PÚBLICAS (No requieren estar logueado)
// Cualquier persona puede acceder acá para intentar obtener un token.
app.use('/api/auth', authRoutes);

// RUTAS PRIVADAS (Requieren el token)
// Al poner "verificarToken" en el medio, Express frena la petición, ejecuta el código
// de authMiddleware.js y, solo si el token es válido, deja pasar a las rutas.
app.use('/api/clientes', verificarToken, clientesRoutes);
app.use('/api/turnos', verificarToken, turnosRoutes);
app.use('/api/pagos', verificarToken, pagosRoutes);

// ==========================================

// Ruta de diagnóstico básica
app.get('/', (req, res) => {
    res.json({ mensaje: 'Servidor del Estudio Jurídico funcionando', estado: 'OK' });
});

// Levantamos el servidor
app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`Servidor corriendo en el puerto ${PORT}`);
    console.log(`=========================================`);
});