/* =========================================
   MÓDULO DE ALERTAS Y NOTIFICACIONES (SweetAlert2)
   ========================================= */

const Alertas = {
    // 1. Notificación tipo "Toast" (Aparece arriba a la derecha y se va sola)
    toast: (mensaje, icono = 'success') => {
        const isDark = document.body.classList.contains('dark-mode');
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            background: isDark ? '#1e293b' : '#fff',
            color: isDark ? '#f8fafc' : '#1e293b',
            didOpen: (toast) => {
                toast.addEventListener('mouseenter', Swal.stopTimer)
                toast.addEventListener('mouseleave', Swal.resumeTimer)
            }
        });
        Toast.fire({ icon: icono, title: mensaje });
    },

    // 2. Alerta de Éxito o Error (Grande, con botón de OK)
    mensaje: (titulo, texto, icono = 'success') => {
        const isDark = document.body.classList.contains('dark-mode');
        Swal.fire({
            title: titulo,
            text: texto,
            icon: icono,
            background: isDark ? '#1e293b' : '#fff',
            color: isDark ? '#f8fafc' : '#1e293b',
            confirmButtonColor: '#3b82f6',
            confirmButtonText: 'Entendido'
        });
    },

    // 3. Confirmación de Acción (Para borrar cosas)
    confirmar: async (titulo, texto, botonConfirmar = 'Sí, borrar') => {
        const isDark = document.body.classList.contains('dark-mode');
        const resultado = await Swal.fire({
            title: titulo,
            text: texto,
            icon: 'warning',
            showCancelButton: true,
            background: isDark ? '#1e293b' : '#fff',
            color: isDark ? '#f8fafc' : '#1e293b',
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: botonConfirmar,
            cancelButtonText: 'Cancelar',
            reverseButtons: true
        });
        return resultado.isConfirmed;
    }
};

// --- INTERCEPTOR GLOBAL DE SESIÓN EXPIRADA ---
// Sobreescribimos el fetch nativo para capturar respuestas 401 en cualquier lugar de la app
const _fetchOriginal = window.fetch;
window.fetch = async function (...args) {
    const response = await _fetchOriginal.apply(this, args);
    if (response.status === 401) {
        localStorage.clear();
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
    return response;
};

// --- MENU HAMBURGUESA (MOBILE) ---
document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.getElementById('menuToggle');
    const navMenu = document.getElementById('navMenu');

    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            navMenu.classList.toggle('show');
        });

        // Cerrar el menú al hacer clic fuera de la navbar
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.navbar')) {
                navMenu.classList.remove('show');
            }
        });
    }
});

// --- PWA & NOTIFICACIONES LOCALES ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Registrar Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./service-worker.js')
            .then(reg => console.log('Service Worker registrado correctamente.', reg))
            .catch(err => console.log('Error al registrar Service Worker:', err));
    }

    // 2. Pedir permiso para notificaciones si estamos logueados
    const token = localStorage.getItem('estudio_token');
    if (token && 'Notification' in window && !window.location.pathname.includes('login.html')) {
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }

        // Iniciar vigilancia
        vigilarTurnosProximos();
        // Revisar el reloj cada 1 minuto (solo lee memoria local, no gasta red)
        setInterval(vigilarTurnosProximos, 60000);
    }
});

async function vigilarTurnosProximos() {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const token = localStorage.getItem('estudio_token');
    const usuarioId = localStorage.getItem('usuario_id');
    if (!token || !usuarioId) return;

    let turnos = [];
    const ahoraMs = new Date().getTime();
    const ultimaRevision = localStorage.getItem('ultima_vigilancia_api');

    // OPTIMIZACIÓN: Solo consultamos la API cada 15 minutos para no gastar cuota de Supabase
    if (!ultimaRevision || (ahoraMs - parseInt(ultimaRevision)) > 15 * 60 * 1000) {
        try {
            const res = await fetch(`https://api-estudio-juridico-oma1.onrender.com/api/turnos/usuario/${usuarioId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) return;
            turnos = await res.json();

            localStorage.setItem('turnos_cache_notif', JSON.stringify(turnos));
            localStorage.setItem('ultima_vigilancia_api', ahoraMs.toString());
        } catch (e) {
            console.error("Error vigilando turnos (Red):", e);
            return;
        }
    } else {
        // Leemos desde caché local sin gastar peticiones al servidor
        const cache = localStorage.getItem('turnos_cache_notif');
        if (cache) turnos = JSON.parse(cache);
    }

    const ahora = new Date();
    const hoyStr = ahora.toISOString().split('T')[0];

    // Filtramos turnos pendientes de hoy
    const turnosHoy = turnos.filter(t => t.estado === 'pendiente' && t.fecha.startsWith(hoyStr));
    const notificados = JSON.parse(localStorage.getItem('turnos_notificados') || '[]');

    turnosHoy.forEach(turno => {
        if (notificados.includes(turno.id)) return; // Ya avisamos por este turno

        const [hora, min] = turno.hora.split(':');
        const fechaTurno = new Date();
        fechaTurno.setHours(parseInt(hora), parseInt(min), 0, 0);

        const diferenciaMs = fechaTurno - ahora;
        const minutosRestantes = Math.floor(diferenciaMs / 60000);

        // Si el turno es en los próximos 30 minutos (y aún no pasó)
        if (minutosRestantes > 0 && minutosRestantes <= 30) {
            new Notification('¡Turno Próximo!', {
                body: `Faltan ${minutosRestantes} min para: ${turno.tipo_evento || turno.motivo} - ${turno.nombre_completo || 'Sin cliente'}`,
                icon: './icon-192.png',
                badge: './icon-192.png',
                vibrate: [200, 100, 200]
            });

            // Registrar que ya notificamos este turno
            notificados.push(turno.id);
            localStorage.setItem('turnos_notificados', JSON.stringify(notificados));
        }
    });
}