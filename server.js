// Importamos las librerías
const express = require('express');
const cors = require('cors');
require('dotenv').config(); // Carga las variables del .env

// Inicializamos la app de Express
const app = express();

// Middlewares (Configuraciones base)
app.use(cors()); // Permite peticiones de otros orígenes (frontend)
app.use(express.json()); // Permite recibir datos en formato JSON

// Definimos el puerto (lee el del .env o usa el 3000 por defecto)
const PORT = process.env.PORT || 3000;

// Ruta de prueba (Endpoint base)
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