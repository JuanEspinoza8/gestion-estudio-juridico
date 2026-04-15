// Importamos las librerías
const express = require('express');
const cors = require('cors');
const db = require('./src/config/db'); 
require('dotenv').config(); 

// Importamos las rutas (NUEVO)
const clientesRoutes = require('./src/routes/clientesRoutes');
const turnosRoutes = require('./src/routes/turnosRoutes');
const pagosRoutes = require('./src/routes/pagosRoutes');

// Inicializamos la app de Express
const app = express();

// Middlewares
app.use(cors()); 
app.use(express.json()); 

const PORT = process.env.PORT || 3000;

// Configuración de los Endpoints Base de la API (NUEVO)
app.use('/api/clientes', clientesRoutes);
app.use('/api/turnos', turnosRoutes);
app.use('/api/pagos', pagosRoutes);

// Ruta de prueba
app.get('/', (req, res) => {
    res.json({ 
        mensaje: 'Servidor del Estudio Jurídico funcionando al 100%',
        estado: 'OK'
    });
});

// Levantamos el servidor
app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`Servidor corriendo en el puerto ${PORT}`);
    console.log(`=========================================`);
});