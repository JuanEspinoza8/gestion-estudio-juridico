// public/js/api.js
// Sesión y acceso a la API, compartido por todas las páginas privadas.
// Requiere config.js (API_URL) y SweetAlert2 cargados antes.

// Datos de sesión guardados en localStorage (la preferencia de tema no se toca)
const CLAVES_SESION = [
    'estudio_token',
    'usuario_id',
    'usuario_nombre',
    'turnos_cache_notif',
    'ultima_vigilancia_api',
    'turnos_notificados'
];

function obtenerToken() {
    return localStorage.getItem('estudio_token');
}

function borrarSesion() {
    CLAVES_SESION.forEach((clave) => localStorage.removeItem(clave));
}

// Guard de sesión: si no hay token vuelve al login. Devuelve false en ese caso
// para que la página corte su inicialización.
function requerirSesion() {
    if (obtenerToken()) return true;
    window.location.href = 'login.html';
    return false;
}

function cerrarSesion() {
    borrarSesion();
    window.location.href = 'login.html';
}

let avisoSesionMostrado = false;

async function avisarSesionExpirada() {
    if (avisoSesionMostrado) return; // varias llamadas en paralelo pueden recibir 401
    avisoSesionMostrado = true;
    borrarSesion();
    const isDark = document.body.classList.contains('dark-mode');
    await Swal.fire({
        icon: 'info',
        title: 'Sesión expirada',
        text: 'Tu sesión ha expirado. Por favor, iniciá sesión nuevamente.',
        background: isDark ? '#1e293b' : '#fff',
        color: isDark ? '#f8fafc' : '#1e293b',
        confirmButtonColor: '#3b82f6',
        confirmButtonText: 'Ir al Login',
        allowOutsideClick: false
    });
    window.location.href = 'login.html';
}

/**
 * fetch a la API con el token de la sesión.
 * - ruta: empieza con /api/...
 * - opciones.body: si es un objeto se manda como JSON; un FormData se manda tal cual.
 * Si la sesión venció (401) avisa y vuelve al login.
 */
async function apiFetch(ruta, opciones = {}) {
    const headers = { ...opciones.headers };
    const token = obtenerToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    let { body } = opciones;
    if (body !== undefined && !(body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(body);
    }

    const respuesta = await fetch(`${API_URL}${ruta}`, { ...opciones, headers, body });
    if (respuesta.status === 401) {
        avisarSesionExpirada();
    }
    return respuesta;
}

// Mensaje de error de una respuesta de la API (o uno genérico si no trae JSON)
async function mensajeDeError(respuesta, porDefecto = 'Ocurrió un error inesperado') {
    try {
        const datos = await respuesta.json();
        return datos.error || datos.message || porDefecto;
    } catch {
        return 'El servidor está inactivo o devolvió un error inesperado. Intente de nuevo en 1 minuto.';
    }
}
