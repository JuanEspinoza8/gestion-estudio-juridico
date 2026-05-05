// public/js/dashboard.js

const API_BASE = 'https://api-estudio-juridico-oma1.onrender.com/api';

// Estado global de notas rápidas
let notaActualId = null;
let notaPaginaActual = 1;
let notaTotalPaginas = 0;
let guardarTimeout = null;

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
    initNotasRapidas();
});

async function cargarResumenGeneral() {
    const token = localStorage.getItem('estudio_token');
    const usuarioId = localStorage.getItem('usuario_id');
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    try {
        const [resClientes, resTurnosHoy, resIngresos, resActividad] = await Promise.all([
            fetch(`${API_BASE}/clientes`, { headers }),
            fetch(`${API_BASE}/turnos/usuario/${usuarioId}/hoy`, { headers }),
            fetch(`${API_BASE}/pagos/mes-actual`, { headers }),
            fetch(`${API_BASE}/actividad/usuario/${usuarioId}`, { headers })
        ]);

        const clientes = await resClientes.json();
        const turnosHoy = await resTurnosHoy.json();
        const ingresos = await resIngresos.json();
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

        // Panel: Actividad Reciente
        const listaActividadEl = document.getElementById('listaActividad');
        if (!actividad || actividad.length === 0) {
            listaActividadEl.innerHTML = `<li style="color: #64748b; font-size: 0.9rem; padding: 10px 0;">No hay actividad reciente registrada.</li>`;
        } else {
            listaActividadEl.innerHTML = actividad.map(a => {
                const f = a.fecha ? new Date(a.fecha) : new Date(NaN);
                const fechaFormateada = isNaN(f.getTime()) ? 'Fecha desconocida' : f.toLocaleDateString('es-AR') + ' ' + f.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
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

// ===========================================
// NOTAS RÁPIDAS
// ===========================================

function getHeaders() {
    const token = localStorage.getItem('estudio_token');
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

function initNotasRapidas() {
    const textarea = document.getElementById('notaRapidaTexto');
    const btnNueva = document.getElementById('btnNuevaNota');
    const btnEliminar = document.getElementById('btnEliminarNota');
    const btnAnterior = document.getElementById('btnNotaAnterior');
    const btnSiguiente = document.getElementById('btnNotaSiguiente');

    // Auto-save con debounce al escribir
    textarea.addEventListener('input', () => {
        if (notaActualId) {
            clearTimeout(guardarTimeout);
            guardarTimeout = setTimeout(() => {
                guardarNotaRapida(notaActualId, textarea.value);
            }, 800);
        }
    });

    btnNueva.addEventListener('click', crearNuevaNota);
    btnEliminar.addEventListener('click', eliminarNotaActual);
    btnAnterior.addEventListener('click', () => navegarNota(notaPaginaActual - 1));
    btnSiguiente.addEventListener('click', () => navegarNota(notaPaginaActual + 1));

    // Cargar la primera nota (más reciente)
    cargarNotaRapida(1);
}

async function cargarNotaRapida(page) {
    try {
        const res = await fetch(`${API_BASE}/notas-rapidas?page=${page}`, {
            headers: getHeaders()
        });

        if (!res.ok) throw new Error('Error al cargar nota');

        const data = await res.json();

        const textarea = document.getElementById('notaRapidaTexto');
        const paginacion = document.getElementById('notaPaginacion');

        notaTotalPaginas = data.total;
        notaPaginaActual = data.page;

        if (data.nota) {
            notaActualId = data.nota.id;
            textarea.value = data.nota.contenido || '';
            textarea.disabled = false;
        } else {
            notaActualId = null;
            textarea.value = '';
            textarea.disabled = false;
        }

        // Actualizar paginación
        if (notaTotalPaginas === 0) {
            paginacion.textContent = '— / —';
        } else {
            paginacion.textContent = `${notaPaginaActual} / ${notaTotalPaginas}`;
        }

        actualizarBotonesNav();
    } catch (error) {
        console.error('Error al cargar nota rápida:', error);
    }
}

async function guardarNotaRapida(id, contenido) {
    try {
        await fetch(`${API_BASE}/notas-rapidas/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({ contenido })
        });
    } catch (error) {
        console.error('Error al guardar nota rápida:', error);
    }
}

async function crearNuevaNota() {
    try {
        const res = await fetch(`${API_BASE}/notas-rapidas`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ contenido: '' })
        });

        if (!res.ok) throw new Error('Error al crear nota');

        // Navegar a la página 1 (la nota más reciente, que es la que acabamos de crear)
        await cargarNotaRapida(1);

        // Focus en el textarea
        document.getElementById('notaRapidaTexto').focus();
    } catch (error) {
        console.error('Error al crear nota rápida:', error);
    }
}

async function eliminarNotaActual() {
    if (!notaActualId) return;

    const confirmado = await Alertas.confirmar('¿Eliminar nota?', 'Esta acción no se puede deshacer.', 'Sí, eliminar');
    if (!confirmado) return;

    try {
        const res = await fetch(`${API_BASE}/notas-rapidas/${notaActualId}`, {
            method: 'DELETE',
            headers: getHeaders()
        });

        if (!res.ok) throw new Error('Error al eliminar nota');

        // Después de eliminar, recargar en la misma posición (o la anterior si era la última)
        const nuevaPagina = notaPaginaActual > 1 ? notaPaginaActual - 1 : 1;
        await cargarNotaRapida(nuevaPagina);
    } catch (error) {
        console.error('Error al eliminar nota rápida:', error);
    }
}

function navegarNota(page) {
    if (page < 1 || page > notaTotalPaginas) return;

    // Guardar la nota actual antes de navegar si hay cambios pendientes
    if (notaActualId) {
        clearTimeout(guardarTimeout);
        const textarea = document.getElementById('notaRapidaTexto');
        guardarNotaRapida(notaActualId, textarea.value);
    }

    cargarNotaRapida(page);
}

function actualizarBotonesNav() {
    const btnAnterior = document.getElementById('btnNotaAnterior');
    const btnSiguiente = document.getElementById('btnNotaSiguiente');

    btnAnterior.disabled = notaPaginaActual <= 1;
    btnSiguiente.disabled = notaPaginaActual >= notaTotalPaginas;
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
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error("Error al decodificar el token:", e);
        return null;
    }
}