// public/js/dashboard.js

    document.addEventListener('DOMContentLoaded', async () => {
        const token = localStorage.getItem('estudio_token');
        const usuarioId = localStorage.getItem('usuario_id');

        if (!token || !usuarioId) {
         window.location.href = 'login.html';
         return;
        }

        // --- MEJORA UI-01: Saludo Dinámico ---
        const usuarioNombre = localStorage.getItem('usuario_nombre');
        const subtitle = document.querySelector('.subtitle');
        if (subtitle) {
            subtitle.textContent = `Bienvenido, ${usuarioNombre || 'Usuario'}`;
        }
        // -------------------------------------

        cargarResumenGeneral();
    });

async function cargarResumenGeneral() {
    const token = localStorage.getItem('estudio_token');
    const usuarioId = localStorage.getItem('usuario_id');
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    try {
        const [resClientes, resTurnosHoy, resIngresos, resVencimientos] = await Promise.all([
            fetch('https://api-estudio-juridico-oma1.onrender.com/api/clientes', { headers }),
            fetch(`https://api-estudio-juridico-oma1.onrender.com/api/turnos/usuario/${usuarioId}/hoy`, { headers }),
            fetch('https://api-estudio-juridico-oma1.onrender.com/api/pagos/mes-actual', { headers }),
            fetch('https://api-estudio-juridico-oma1.onrender.com/api/notas/proximos', { headers })
        ]);

        const clientes = await resClientes.json();
        const turnosHoy = await resTurnosHoy.json();
        const ingresos = await resIngresos.json();
        const vencimientos = await resVencimientos.json();

        // KPIs
        document.getElementById('kpiTotalClientes').textContent = clientes.length;
        document.getElementById('kpiIngresosMes').textContent =
            `$ ${new Intl.NumberFormat('es-AR').format(ingresos.total_ingresos || 0)}`;
        document.getElementById('kpiTurnosHoy').textContent = turnosHoy.length;

        // Panel: Próximos Turnos de HOY
        const listaTurnos = document.getElementById('listaTurnosHoy');
        if (turnosHoy.length === 0) {
            listaTurnos.innerHTML = `<li style="color: #64748b; font-size: 0.9rem; padding: 10px 0;">No hay turnos agendados para hoy.</li>`;
        } else {
            listaTurnos.innerHTML = turnosHoy.map(t => `
                <li>
                    <span class="hora">${t.hora.substring(0, 5)}</span>
                    <div class="detalle">
                        <strong>${t.nombre_completo}</strong>
                        <span>${t.motivo}</span>
                    </div>
                </li>
            `).join('');
        }

        // Panel: Próximos Vencimientos
        const listaVencimientosEl = document.getElementById('listaVencimientos');
        if (vencimientos.length === 0) {
            listaVencimientosEl.innerHTML = `<li style="color: #64748b; font-size: 0.9rem; padding: 10px 0;">No hay vencimientos próximos.</li>`;
        } else {
            listaVencimientosEl.innerHTML = vencimientos.map(v => {
                const fecha = new Date(v.fecha_vencimiento + 'T00:00:00');
                const esVencida = fecha < new Date() && v.estado !== 'completado';
                return `
                <li>
                    <span class="material-symbols-outlined text-red">${esVencida ? 'warning' : 'event'}</span>
                    <div class="detalle">
                        <strong>${v.nombre_completo}</strong>
                        <span>${v.contenido}</span>
                        <span style="${esVencida ? 'color:#ef4444; font-weight:bold;' : 'color:#f59e0b;'}">Vence: ${fecha.toLocaleDateString('es-AR')}</span>
                    </div>
                </li>`;
            }).join('');
        }

    } catch (error) {
        console.error("Error cargando el Dashboard:", error);
    }
}

function cerrarSesion() {
    localStorage.clear();
    window.location.href = 'login.html';
}
// Función para decodificar el payload del JWT sin librerías externas
function obtenerUsuarioDelToken() {
    const token = localStorage.getItem('estudio_token');
    if (!token) return null;

    try {
        // El JWT es: Header.Payload.Signature. Tomamos el Payload [1]
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error("Error al decodificar el token:", e);
        return null;
    }
}