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
        const [resClientes, resTurnosHoy, resIngresos, resVencimientos, resActividad] = await Promise.all([
            fetch('https://api-estudio-juridico-oma1.onrender.com/api/clientes', { headers }),
            fetch(`https://api-estudio-juridico-oma1.onrender.com/api/turnos/usuario/${usuarioId}/hoy`, { headers }),
            fetch('https://api-estudio-juridico-oma1.onrender.com/api/pagos/mes-actual', { headers }),
            fetch('https://api-estudio-juridico-oma1.onrender.com/api/notas/proximos', { headers }),
            fetch(`https://api-estudio-juridico-oma1.onrender.com/api/actividad/usuario/${usuarioId}`, { headers })
        ]);

        const clientes = await resClientes.json();
        const turnosHoy = await resTurnosHoy.json();
        const ingresos = await resIngresos.json();
        const vencimientos = await resVencimientos.json();
        const actividad = resActividad.ok ? await resActividad.json() : [];

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
                const fecha = v.fecha_vencimiento ? new Date(v.fecha_vencimiento + 'T00:00:00') : null;
                const esVencida = fecha && fecha < new Date() && v.estado !== 'completado';
                const fechaStr = fecha && !isNaN(fecha.getTime()) ? fecha.toLocaleDateString('es-AR') : 'Sin fecha';
                return `
                <li>
                    <span class="material-symbols-outlined text-red">${esVencida ? 'warning' : 'event'}</span>
                    <div class="detalle">
                        <strong>${v.nombre_completo}</strong>
                        <span>${v.contenido}</span>
                        <span style="${esVencida ? 'color:#ef4444; font-weight:bold;' : 'color:#f59e0b;'}">Vence: ${fechaStr}</span>
                    </div>
                </li>`;
            }).join('');
        }

        // Panel: Actividad Reciente
        const listaActividadEl = document.getElementById('listaActividad');
        if (!actividad || actividad.length === 0) {
            listaActividadEl.innerHTML = `<li style="color: #64748b; font-size: 0.9rem; padding: 10px 0;">No hay actividad reciente registrada.</li>`;
        } else {
            listaActividadEl.innerHTML = actividad.map(a => {
                const f = a.fecha ? new Date(a.fecha) : new Date(NaN);
                const fechaFormateada = isNaN(f.getTime()) ? 'Fecha desconocida' : f.toLocaleDateString('es-AR') + ' ' + f.toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'});
                const accionLimpia = a.accion.replace(/_/g, ' ');
                return `
                <li style="align-items:flex-start;">
                    <span class="material-symbols-outlined" style="color:#3b82f6;">notifications_active</span>
                    <div class="detalle">
                        <strong>${accionLimpia} ${a.cliente_nombre ? `(${a.cliente_nombre})` : ''}</strong>
                        <span>${a.detalles || ''}</span>
                        <span style="color:#94a3b8; font-size:0.8rem;">${fechaFormateada}</span>
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