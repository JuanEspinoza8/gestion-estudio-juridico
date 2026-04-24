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
        const [resClientes, resTurnosHoy, resIngresos, resAnotaciones, resActividad] = await Promise.all([
            fetch('https://api-estudio-juridico-oma1.onrender.com/api/clientes', { headers }),
            fetch(`https://api-estudio-juridico-oma1.onrender.com/api/turnos/usuario/${usuarioId}/hoy`, { headers }),
            fetch('https://api-estudio-juridico-oma1.onrender.com/api/pagos/mes-actual', { headers }),
            fetch(`https://api-estudio-juridico-oma1.onrender.com/api/notas/usuario/${usuarioId}`, { headers }),
            fetch(`https://api-estudio-juridico-oma1.onrender.com/api/actividad/usuario/${usuarioId}`, { headers })
        ]);

        const clientes = resClientes.ok ? await resClientes.json() : [];
        const turnosHoy = resTurnosHoy.ok ? await resTurnosHoy.json() : [];
        const ingresos = resIngresos.ok ? await resIngresos.json() : { total_ingresos: 0 };
        const anotaciones = resAnotaciones.ok ? await resAnotaciones.json() : [];
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

// Panel: Anotaciones Rápidas (Reemplaza a Vencimientos)
        const listaAnotacionesEl = document.getElementById('listaAnotaciones');
        if (anotaciones.length === 0) {
            listaAnotacionesEl.innerHTML = `<p style="color: #64748b; font-size: 0.9rem; padding: 10px 0; text-align: center;">No hay anotaciones pendientes.</p>`;
        } else {
            listaAnotacionesEl.innerHTML = anotaciones.map(nota => {
                // Formateamos la fecha si existe en la base de datos
                const f = nota.fecha_creacion ? new Date(nota.fecha_creacion) : new Date();
                const fechaStr = !isNaN(f.getTime()) ? f.toLocaleDateString('es-AR') + ' ' + f.toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'}) : '';
                return `
                <li style="display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 1px solid #334155; padding: 10px 0;">
                    <div class="detalle" style="flex: 1;">
                        <span style="color: var(--text-color, #e2e8f0); font-size: 0.95rem;">${nota.contenido}</span>
                        <span style="color:#94a3b8; font-size:0.75rem; display: block; margin-top: 4px;">${fechaStr}</span>
                    </div>
                    <button onclick="eliminarNota(${nota.id})" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 5px; transition: 0.2s;" onmouseover="this.style.color='#b91c1c'" onmouseout="this.style.color='#ef4444'">
                        <span class="material-symbols-outlined" style="font-size: 1.2rem;">delete</span>
                    </button>
                </li>`;
            }).join('');
        }

        // Panel: Actividad Reciente
        const listaActividadEl = document.getElementById('listaActividad');
        if (!actividad || actividad.length === 0) {
            listaActividadEl.innerHTML = `<p style="color: #64748b; font-size: 0.9rem; padding: 10px 0; text-align: center;">No hay actividad reciente registrada.</p>`;
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

// --- NUEVAS FUNCIONES PARA ANOTACIONES RÁPIDAS ---

window.guardarNotaRapida = async function() {
    const input = document.getElementById('nuevaNota');
    const contenido = input.value.trim();
    if (!contenido) return;

    const token = localStorage.getItem('estudio_token');
    const usuarioId = localStorage.getItem('usuario_id');

    try {
        const res = await fetch('https://api-estudio-juridico-oma1.onrender.com/api/notas', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ usuario_id: usuarioId, contenido: contenido })
        });

        if (res.ok) {
            input.value = ''; // Limpiamos el input
            cargarResumenGeneral(); // Recargamos para que aparezca en la lista
        } else {
            console.error('Error al guardar la nota en el servidor.');
        }
    } catch (error) {
        console.error('Error en la petición POST de nota:', error);
    }
};

window.eliminarNota = async function(notaId) {
    const token = localStorage.getItem('estudio_token');
    
    try {
        const res = await fetch(`https://api-estudio-juridico-oma1.onrender.com/api/notas/${notaId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (res.ok) {
            cargarResumenGeneral(); // Recargamos la lista al eliminar
        } else {
            console.error('Error al eliminar la nota.');
        }
    } catch (error) {
        console.error('Error en la petición DELETE de nota:', error);
    }
};

// -------------------------------------------------

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