// public/js/agenda.js

const API = 'https://api-estudio-juridico-oma1.onrender.com';
let calendar; // Variable global para guardar el motor del calendario

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('estudio_token');
    const usuarioId = localStorage.getItem('usuario_id');

    if (!token || !usuarioId) {
        window.location.href = 'login.html';
        return;
    }

    cargarTurnos();
    cargarDesplegableClientes('clienteId');

    // --- Modal NUEVO TURNO ---
    const modalNuevo = document.getElementById('modalNuevoTurno');
    document.getElementById('btnNuevoTurno').addEventListener('click', () => {
        // Al hacer clic manual en el botón superior, cargamos la fecha de hoy por defecto
        document.getElementById('fecha').value = new Date().toISOString().split('T')[0];
        document.getElementById('hora').value = '09:00';
        modalNuevo.style.display = 'flex';
    });
    document.getElementById('btnCerrarModalTurno').addEventListener('click', () => modalNuevo.style.display = 'none');
    document.getElementById('btnCancelarModalTurno').addEventListener('click', () => modalNuevo.style.display = 'none');

    document.getElementById('formNuevoTurno').addEventListener('submit', async (e) => {
        e.preventDefault();
        const tipoEventoSel = document.getElementById('tipoEvento').value;
        const motivoReal = tipoEventoSel === 'Otro' ? document.getElementById('tipoEventoOtro').value || 'Otro' : tipoEventoSel;

        const nuevoTurno = {
            cliente_id: document.getElementById('clienteId').value || null,
            usuario_id: localStorage.getItem('usuario_id'),
            fecha: document.getElementById('fecha').value,
            hora: document.getElementById('hora').value,
            motivo: motivoReal,
            tipo_evento: motivoReal
        };

        try {
            const res = await fetch(`${API}/api/turnos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(nuevoTurno)
            });

            if (res.ok) {
                modalNuevo.style.display = 'none';
                document.getElementById('formNuevoTurno').reset();
                cargarTurnos();
            } else {
                let errorMessage = "Verifique los datos";
                try {
                    const err = await res.json();
                    errorMessage = err.message || errorMessage;
                } catch (parseError) {
                    errorMessage = "El servidor está inactivo. Intente nuevamente en unos segundos.";
                }
                Alertas.mensaje('Error', "Error al agendar: " + errorMessage, 'error');
            }
        } catch (error) {
            Alertas.toast("Error de conexión con el servidor.", 'error');
        }
    });

    // --- Modal EDITAR TURNO ---
    const modalEditar = document.getElementById('modalEditarTurno');
    document.getElementById('btnCerrarModalEditar').addEventListener('click', () => modalEditar.style.display = 'none');
    document.getElementById('btnCancelarModalEditar').addEventListener('click', () => modalEditar.style.display = 'none');

    document.getElementById('formEditarTurno').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('editarTurnoId').value;
        const tipoEventoSel = document.getElementById('editarTipoEvento').value;
        const motivoReal = tipoEventoSel === 'Otro' ? document.getElementById('editarTipoEventoOtro').value || 'Otro' : tipoEventoSel;

        const datos = {
            cliente_id: document.getElementById('editarClienteId').value || null,
            usuario_id: localStorage.getItem('usuario_id'),
            fecha: document.getElementById('editarFecha').value,
            hora: document.getElementById('editarHora').value,
            motivo: motivoReal,
            tipo_evento: motivoReal,
            estado: document.getElementById('editarEstado').value
        };

        try {
            const res = await fetch(`${API}/api/turnos/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(datos)
            });

            if (res.ok) {
                modalEditar.style.display = 'none';
                cargarTurnos();
            } else {
                Alertas.toast("Error al actualizar el turno.", 'error');
            }
        } catch (error) {
            Alertas.toast("Error de conexión.", 'error');
        }
    });
});

async function cargarTurnos() {
    const token = localStorage.getItem('estudio_token');
    const usuarioId = localStorage.getItem('usuario_id');
    const contenedorComp = document.getElementById('contenedorCompletados');
    contenedorComp.innerHTML = '<p style="text-align:center;color:#64748b;padding:30px">Cargando historial...</p>';

    try {
        const res = await fetch(`${API}/api/turnos/usuario/${usuarioId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Error del servidor');
        const turnos = await res.json();

        // 1. DIBUJAR EL CALENDARIO (Solo Pendientes, para no saturar visualmente)
        const pendientes = turnos.filter(t => t.estado === 'pendiente');

        // Mapeamos los datos de nuestra base al formato que entiende FullCalendar
        const eventosFullCalendar = pendientes.map(t => {
            return {
                id: t.id,
                title: `${t.nombre_completo || 'Tarea'} - ${t.tipo_evento || t.motivo}`,
                start: `${t.fecha.split('T')[0]}T${t.hora}`,
                color: '#3b82f6', // Azul Corporativo
                extendedProps: {
                    cliente_id: t.cliente_id,
                    fecha: t.fecha,
                    hora: t.hora,
                    tipo_evento: t.tipo_evento,
                    motivo: t.motivo,
                    estado: t.estado
                }
            };
        });

        const calendarEl = document.getElementById('calendar');

        if (calendar) {
            // Si el calendario ya está abierto, solo actualizamos los datos
            calendar.removeAllEvents();
            calendar.addEventSource(eventosFullCalendar);
        } else {
            // Inicialización de FullCalendar estilo "Google Calendar"
            calendar = new FullCalendar.Calendar(calendarEl, {
                initialView: 'timeGridWeek', // Vista semanal por defecto
                locale: 'es',
                slotMinTime: '08:00:00', // El calendario empieza a las 8 AM
                slotMaxTime: '20:00:00', // y termina a las 8 PM
                allDaySlot: false,
                nowIndicator: true, // Agrega la línea roja y la bolita de la hora actual
                slotLabelFormat: { hour: '2-digit', minute: '2-digit', hour12: false }, // Formatea a 08:00, 09:00
                headerToolbar: {
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek,timeGridDay' // Mes, Semana, Día
                },
                buttonText: {
                    today: 'Hoy',
                    month: 'Mes',
                    week: 'Semana',
                    day: 'Día'
                },
                events: eventosFullCalendar,

                // --- INYECCIÓN HTML PARA EVENTOS PREMIUM ---
                eventContent: function (arg) {
                    const tipo = (arg.event.extendedProps.tipo_evento || '').toLowerCase();
                    let icon = 'event_note'; // Default
                    if (tipo.includes('audiencia') || tipo.includes('juicio')) icon = 'gavel';
                    else if (tipo.includes('reunión') || tipo.includes('cliente')) icon = 'groups';
                    else if (tipo.includes('escrito') || tipo.includes('presentar')) icon = 'edit_document';
                    else if (tipo.includes('mediación')) icon = 'handshake';

                    return {
                        html: `<div style="display: flex; align-items: center; gap: 5px; padding: 2px 4px; overflow: hidden;">
                                   <span class="material-symbols-outlined" style="font-size: 15px; flex-shrink: 0;">${icon}</span>
                                   <span style="font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 0.85em;">${arg.event.title}</span>
                               </div>`
                    };
                },


                // Acción al hacer clic en un día/hora vacía del calendario
                dateClick: function (info) {
                    const fechaStr = info.dateStr.split('T')[0];
                    const horaStr = info.dateStr.includes('T') ? info.dateStr.split('T')[1].substring(0, 5) : '09:00';

                    document.getElementById('fecha').value = fechaStr;
                    document.getElementById('hora').value = horaStr;
                    document.getElementById('modalNuevoTurno').style.display = 'flex';
                },

                // Acción al hacer clic en una "cajita" de turno ya agendado
                eventClick: function (info) {
                    const props = info.event.extendedProps;
                    abrirModalEditar(
                        info.event.id,
                        String(props.cliente_id),
                        props.fecha,
                        props.hora,
                        props.tipo_evento || props.motivo,
                        props.estado
                    );
                }
            });
            calendar.render();
        }

        // 2. DIBUJAR EL HISTORIAL (Completados y Cancelados en forma de lista)
        const completados = turnos.filter(t => t.estado === 'completado' || t.estado === 'cancelado');

        if (completados.length === 0) {
            contenedorComp.innerHTML = '<div class="agenda-vacia"><div class="icono"><span class="material-symbols-outlined" style="font-size: 48px; color: #94a3b8;">history</span></div><p>No hay registro de turnos pasados.</p></div>';
        } else {
            contenedorComp.innerHTML = renderizarAgenda(completados, true);
        }

    } catch (error) {
        console.error("Error al cargar turnos:", error);
        Alertas.toast("Error al cargar la agenda.", 'error');
    }
}

// FIX: Esta función corrige un error visual de la librería cuando se la esconde y se la vuelve a mostrar usando TABS
function cambiarTabAgenda(nombre, btn) {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('activo'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('activo'));
    document.getElementById('tab-' + nombre).classList.add('activo');
    btn.classList.add('activo');

    // Si abrimos la pestaña del calendario, le ordenamos que se redibuje a sí mismo
    if (nombre === 'calendario' && calendar) {
        setTimeout(() => { calendar.render(); }, 10);
    }
}

// --------------------------------------------------------------------------------------
// FUNCIONES VIEJAS PRESERVADAS INTACTAS PARA QUE EL HISTORIAL Y LOS MODALES SIGAN FUNCIONANDO
// --------------------------------------------------------------------------------------

function renderizarAgenda(turnos, esHistorial) {
    const hoy = new Date().toISOString().split('T')[0];
    const grupos = {};
    turnos.forEach(t => {
        const fechaLimpia = t.fecha ? t.fecha.split('T')[0] : '';
        if (!fechaLimpia) return;
        if (!grupos[fechaLimpia]) grupos[fechaLimpia] = [];
        grupos[fechaLimpia].push(t);
    });

    return Object.entries(grupos).map(([fecha, turnosDia]) => {
        const esHoy = fecha === hoy && !esHistorial;
        const fechaObj = new Date(fecha + 'T00:00:00');
        let etiquetaFecha = esHoy
            ? '<span class="material-symbols-outlined" style="font-size: 16px; vertical-align: middle; color: #3b82f6;">today</span> Hoy — ' + fechaObj.toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long' })
            : fechaObj.toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

        const hoyObj = new Date();
        hoyObj.setHours(0, 0, 0, 0);
        if (esHistorial && fechaObj > hoyObj) {
            etiquetaFecha += ' (Completado por adelantado)';
        }

        turnosDia.sort((a, b) => esHistorial ? b.hora.localeCompare(a.hora) : a.hora.localeCompare(b.hora));
        const tarjetas = turnosDia.map(t => renderizarTarjeta(t, esHoy)).join('');

        return `
            <div class="fecha-grupo">
                <span class="fecha-label ${esHoy ? 'hoy' : ''}">${etiquetaFecha}</span>
                <div class="fecha-linea"></div>
            </div>
            ${tarjetas}
        `;
    }).join('');
}

function renderizarTarjeta(t, esHoy) {
    const hora = t.hora.substring(0, 5);
    const estadoClase = t.estado === 'completado' ? 'completado' : t.estado === 'cancelado' ? 'cancelado' : esHoy ? 'hoy' : '';
    const badgeClase = 'badge-' + t.estado;
    const motivoEscapado = String(t.motivo).replace(/'/g, "\\'");

    return `
        <li class="turno-card ${estadoClase}">
            <div class="turno-hora-bloque">
                <div class="hora-grande">${hora}</div>
                <div class="hora-sufijo">hs</div>
            </div>
            <div class="turno-divisor"></div>
            <div class="turno-info">
                <div class="cliente-nombre">${t.nombre_completo || 'Tarea del Estudio'}</div>
                <div class="turno-motivo"><span class="material-symbols-outlined" style="font-size: 16px; vertical-align: middle;">assignment</span> ${t.tipo_evento || t.motivo}</div>
            </div>
            <span class="badge-estado ${badgeClase}">${t.estado}</span>
            <div class="turno-acciones">
                <button class="btn-icono editar" title="Editar / Reabrir"
                    onclick="abrirModalEditar(${t.id}, '${t.cliente_id}', '${t.fecha}', '${t.hora}', '${t.tipo_evento || motivoEscapado}', '${t.estado}')">
                    <span class="material-symbols-outlined">edit</span>
                </button>
                <button class="btn-icono eliminar" title="Eliminar"
                    onclick="eliminarTurno(${t.id})">
                    <span class="material-symbols-outlined">delete</span>
                </button>
            </div>
        </li>
    `;
}

async function abrirModalEditar(id, clienteId, fecha, hora, tipoEvento, estado) {
    const select = document.getElementById('editarClienteId');
    if (select.options.length <= 1) {
        await cargarDesplegableClientes('editarClienteId');
    }
    document.getElementById('editarTurnoId').value = id;
    document.getElementById('editarClienteId').value = (clienteId === 'null' || !clienteId) ? '' : clienteId;
    document.getElementById('editarFecha').value = fecha.split('T')[0];
    document.getElementById('editarHora').value = hora.substring(0, 5);

    const opcionesPermitidas = ['Audiencia', 'Mediación', 'Presentar Escrito', 'Reunión Cliente', 'Otro'];
    if (opcionesPermitidas.includes(tipoEvento) && tipoEvento !== 'Otro') {
        document.getElementById('editarTipoEvento').value = tipoEvento;
        document.getElementById('editarTipoEventoOtro').style.display = 'none';
        document.getElementById('editarTipoEventoOtro').value = '';
    } else {
        document.getElementById('editarTipoEvento').value = 'Otro';
        document.getElementById('editarTipoEventoOtro').style.display = 'block';
        document.getElementById('editarTipoEventoOtro').value = tipoEvento === 'Otro' ? '' : tipoEvento;
    }

    document.getElementById('editarEstado').value = estado;
    document.getElementById('modalEditarTurno').style.display = 'flex';
}

async function eliminarTurno(id) {
    const confirmado = await Alertas.confirmar('¿Eliminar turno?', 'Esta acción no se puede deshacer.', 'Sí, eliminar');
    if (!confirmado) return;
    const token = localStorage.getItem('estudio_token');
    try {
        const res = await fetch(`${API}/api/turnos/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) cargarTurnos();
        else Alertas.toast("No se pudo eliminar el turno.", 'error');
    } catch (error) {
        Alertas.toast("Error de conexión.", 'error');
    }
}

async function cargarDesplegableClientes(selectId) {
    const token = localStorage.getItem('estudio_token');
    const select = document.getElementById(selectId);
    try {
        const res = await fetch(`${API}/api/clientes`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const clientes = await res.json();
            select.innerHTML = '<option value="">Sin cliente asociado (Tarea interna)</option>' +
                clientes.map(c => '<option value="' + c.id + '">' + c.nombre_completo + ' (DNI: ' + (c.dni || '-') + ')</option>').join('');
        }
    } catch (error) {
        console.error("Error al cargar clientes:", error);
    }
}

function cerrarSesion() {
    localStorage.clear();
    window.location.href = 'login.html';
}