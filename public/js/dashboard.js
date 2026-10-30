// public/js/dashboard.js

// Estado global de notas rápidas
let notaActualId = null;
let notaPaginaActual = 1;
let notaTotalPaginas = 0;
let guardarTimeout = null;

document.addEventListener('DOMContentLoaded', async () => {
    if (!requerirSesion()) return;

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
    try {
        const [resClientes, resTurnosHoy, resIngresos, resActividad] = await Promise.all([
            apiFetch('/api/clientes'),
            apiFetch('/api/turnos/hoy'),
            apiFetch('/api/pagos/mes-actual'),
            apiFetch('/api/actividad')
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
                    <span class="hora">${escapeHtml(t.hora.substring(0, 5))}</span>
                    <div class="detalle">
                        <strong>${escapeHtml(t.nombre_completo || 'Sin cliente (tarea interna)')}</strong>
                        <span>${escapeHtml(t.motivo || t.tipo_evento)}</span>
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
                        <strong>${escapeHtml(accionLimpia)} ${a.cliente_nombre ? `(${escapeHtml(a.cliente_nombre)})` : ''}</strong>
                        <span>${escapeHtml(a.detalles)}</span>
                        <span style="color:#94a3b8; font-size:0.8rem;">${escapeHtml(fechaFormateada)}</span>
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

async function initNotasRapidas() {
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

    // Cargar la primera nota (la más antigua)
    await cargarNotaRapida(1);

    // Garantizar que siempre exista al menos una nota (nunca 0 notas)
    if (notaTotalPaginas === 0) {
        await crearNuevaNota();
    }
}

async function cargarNotaRapida(page) {
    try {
        const res = await apiFetch(`/api/notas-rapidas?page=${page}`);

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
        await apiFetch(`/api/notas-rapidas/${id}`, { method: 'PUT', body: { contenido } });
    } catch (error) {
        console.error('Error al guardar nota rápida:', error);
    }
}

async function crearNuevaNota() {
    try {
        const res = await apiFetch('/api/notas-rapidas', { method: 'POST', body: { contenido: '' } });

        if (!res.ok) throw new Error('Error al crear nota');

        // La nota recién creada es la más reciente, así que queda como última página.
        // notaTotalPaginas todavía tiene el total previo, por lo que +1 apunta a la nueva.
        await cargarNotaRapida(notaTotalPaginas + 1);

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
        const res = await apiFetch(`/api/notas-rapidas/${notaActualId}`, { method: 'DELETE' });

        if (!res.ok) throw new Error('Error al eliminar nota');

        // Después de eliminar, recargar en la misma posición (o la anterior si era la última)
        const nuevaPagina = notaPaginaActual > 1 ? notaPaginaActual - 1 : 1;
        await cargarNotaRapida(nuevaPagina);

        // Garantizar que siempre exista al menos una nota (nunca 0 notas)
        if (notaTotalPaginas === 0) {
            await crearNuevaNota();
        }
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

