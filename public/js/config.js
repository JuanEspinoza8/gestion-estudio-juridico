// public/js/config.js
// URL base de la API. Si la página se abre desde la propia máquina (localhost o
// 127.0.0.1) usa el backend local en el puerto 3000; si no, el de producción.
const API_URL = ['localhost', '127.0.0.1'].includes(window.location.hostname)
    ? `${window.location.protocol}//${window.location.hostname}:3000`
    : 'https://api-estudio-juridico-oma1.onrender.com';
