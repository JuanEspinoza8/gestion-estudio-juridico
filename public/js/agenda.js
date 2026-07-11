// public/js/agenda.js

const API = 'https://api-estudio-juridico-oma1.onrender.com';
let calendar;                 // motor del calendario (FullCalendar)
let todosLosTurnos = [];      // cache de todos los turnos del usuario

// Fuente única de colores por tipo de evento (calendario + leyenda)
const COLORES_EVENTO = {
    'Audiencia': '#ef4444',        // rojo
    'Mediación': '#8b5cf6',        // violeta
    'Presentar Escrito': '#f59e0b',// ámbar
    'Reunión Cliente': '#10b981',  // verde
    'Otro': '#3b82f6'              // azul
};

// Filtros activos (compartidos por calendario y lista)
let filtroCliente = '';
let filtroTipo = '';
let filtroEstadoLista = 'pendientes';

function colorDeEvento(tipo) {
    return COLORES_EVENTO[tipo] || COLORES_EVENTO['Otro'];
}

function iconoDeEvento(tipo) {
    const t = (tipo || '').toLowerCase();
    if (t.includes('audiencia') || t.includes('juicio')) return 'gavel';
    if (t.includes('reunión') || t.includes('cliente')) return 'groups';
    if (t.includes('escrito') || t.includes('presentar')) return 'edit_document';
    if (t.includes('mediación')) return 'handshake';
    return 'event_note';
}

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('estudio_token');
    const usuarioId = localStorage.getItem('usuario_id');

    if (!token || !usuarioId) {
        window.location.href = 'login.html';
        return;
    }

    renderLeyenda();
    cargarTurnos();
    cargarDesplegableClientes('clienteId');
    poblarFiltroClientes();

    // --- Filtros comunes ---
    document.getElementById('filtroCliente').addEventListener('change', (e) => {
        filtroCliente = e.target.value;
        renderCalendario();
        renderLista();
    });
    document.getElementById('filtroTipo').addEventListener('change', (e) => {
        filtroTipo = e.target.value;
        renderCalendario();
        renderLista();
    });

    // --- Chips de estado de la lista ---
    document.querySelectorAll('#estadoChips .chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('#estadoChips .chip').forEach(c => c.classList.remove('activo'));
            chip.classList.add('activo');
            filtroEstadoLista = chip.dataset.estado;
            renderLista();
        });
    });

    // --- Carga de causas según el cliente elegido (modales) ---
    document.getElementById('clienteId').addEventListener('change', (e) => cargarCausasDeCliente(e.target.value, 'causaId'));
    document.getElementById('editarClienteId').addEventListener('change', (e) => cargarCausasDeCliente(e.target.value, 'editarCausaId'));

    // --- Modal NUEVO TURNO ---
    const modalNuevo = document.getElementById('modalNuevoTurno');
    document.getElementById('btnNuevoTurno').addEventListener('click', () => {
        prepararModalNuevo(new Date().toISOString().split('T')[0], '09:00');
    });
    document.getElementById('btnCerrarModalTurno').addEventListener('click', () => modalNuevo.style.display = 'none');
    document.getElementById('btnCancelarModalTurno').addEventListener('click', () => modalNuevo.style.display = 'none');

    document.getElementById('formNuevoTurno').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btnSubmit = e.target.querySelector('button[type="submit"]');
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Guardando...';

        const tipoEventoSel = document.getElementById('tipoEvento').value;
        const especificacion = document.getElementById('tipoEventoOtro').value.trim();
        // El texto libre va en 'motivo'; 'tipo_evento' se mantiene siempre en la categoría válida
        const motivoReal = tipoEventoSel === 'Otro' ? (especificacion || 'Otro') : tipoEventoSel;

        const nuevoTurno = {
            cliente_id: document.getElementById('clienteId').value || null,
            causa_id: document.getElementById('causaId').value || null,
            usuario_id: localStorage.getItem('usuario_id'),
            fecha: document.getElementById('fecha').value,
            hora: document.getElementById('hora').value,
            motivo: motivoReal,
            tipo_evento: tipoEventoSel,
            recordatorio_offset_min: parseInt(document.getElementById('recordatorio').value, 10) || 0
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
                cargarCausasDeCliente('', 'causaId');
                localStorage.removeItem('ultima_vigilancia_api'); // Forzar refresco de notificaciones
                cargarTurnos();
            } else {
                let errorMessage = "Verifique los datos";
                try {
                    const err = await res.json();
                    errorMessage = err.error || err.message || errorMessage;
                } catch (parseError) {
                    errorMessage = "El servidor está inactivo. Intente nuevamente en unos segundos.";
                }
                Alertas.mensaje('Error', "Error al agendar: " + errorMessage, 'error');
            }
        } catch (error) {
            Alertas.toast("Error de conexión con el servidor.", 'error');
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.textContent = 'Agendar';
        }
    });

    // --- Modal EDITAR TURNO ---
    const modalEditar = document.getElementById('modalEditarTurno');
    document.getElementById('btnCerrarModalEditar').addEventListener('click', () => modalEditar.style.display = 'none');
    document.getElementById('btnCancelarModalEditar').addEventListener('click', () => modalEditar.style.display = 'none');

    document.getElementById('formEditarTurno').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btnSubmit = e.target.querySelector('button[type="submit"]');
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Guardando...';

        const id = document.getElementById('editarTurnoId').value;
        const tipoEventoSel = document.getElementById('editarTipoEvento').value;
        const especificacion = document.getElementById('editarTipoEventoOtro').value.trim();
        const motivoReal = tipoEventoSel === 'Otro' ? (especificacion || 'Otro') : tipoEventoSel;

        const datos = {
            cliente_id: document.getElementById('editarClienteId').value || null,
            causa_id: document.getElementById('editarCausaId').value || null,
            usuario_id: localStorage.getItem('usuario_id'),
            fecha: document.getElementById('editarFecha').value,
            hora: document.getElementById('editarHora').value,
            motivo: motivoReal,
            tipo_evento: tipoEventoSel,
            estado: document.getElementById('editarEstado').value,
            recordatorio_offset_min: parseInt(document.getElementById('editarRecordatorio').value, 10) || 0
        };

        try {
            const res = await fetch(`${API}/api/turnos/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(datos)
            });

            if (res.ok) {
                modalEditar.style.display = 'none';
                localStorage.removeItem('ultima_vigilancia_api');
                cargarTurnos();
            } else {
                Alertas.toast("Error al actualizar el turno.", 'error');
            }
        } catch (error) {
            Alertas.toast("Error de conexión.", 'error');
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.textContent = 'Guardar Cambios';
        }
    });

    // --- Modal DETALLE ---
    document.getElementById('btnCerrarModalDetalle').addEventListener('click', () => document.getElementById('modalDetalleTurno').style.display = 'none');
});

// ==========================================
// CARGA Y RENDER
// ==========================================

async function cargarTurnos() {
    const token = localStorage.getItem('estudio_token');
    const usuarioId = localStorage.getItem('usuario_id');

    try {
        const res = await fetch(`${API}/api/turnos/usuario/${usuarioId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Error del servidor');
        todosLosTurnos = await res.json();

        renderCalendario();
        renderLista();
    } catch (error) {
        console.error("Error al cargar turnos:", error);
        Alertas.toast("Error al cargar la agenda.", 'error');
    }
}

// Filtro común de cliente + tipo (se aplica al calendario y a la lista)
function aplicarFiltrosBase(turnos) {
    return turnos.filter(t => {
        if (filtroCliente && String(t.cliente_id) !== String(filtroCliente)) return false;
        if (filtroTipo && t.tipo_evento !== filtroTipo) return false;
        return true;
    });
}

function renderCalendario() {
    // El calendario muestra solo pendientes (los cerrados viven en la lista)
    const pendientes = aplicarFiltrosBase(todosLosTurnos).filter(t => t.estado === 'pendiente');

    const eventos = pendientes.map(t => ({
        id: t.id,
        title: `${t.nombre_completo || 'Tarea'} - ${t.motivo || t.tipo_evento}`,
        start: `${String(t.fecha).split('T')[0]}T${t.hora}`,
        color: colorDeEvento(t.tipo_evento),
        extendedProps: { tipo_evento: t.tipo_evento }
    }));

    const calendarEl = document.getElementById('calendar');

    if (calendar) {
        calendar.removeAllEvents();
        calendar.addEventSource(eventos);
        return;
    }

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: window.innerWidth < 768 ? 'timeGridDay' : 'timeGridWeek',
        height: 'auto',
        locale: 'es',
        slotMinTime: '08:00:00',
        slotMaxTime: '20:00:00',
        allDaySlot: false,
        nowIndicator: true,
        slotLabelFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        buttonText: { today: 'Hoy', month: 'Mes', week: 'Semana', day: 'Día' },
        events: eventos,

        eventContent: function (arg) {
            const icon = iconoDeEvento(arg.event.extendedProps.tipo_evento);
            return {
                html: `<div style="display: flex; align-items: center; gap: 5px; padding: 2px 4px; overflow: hidden;">
                           <span class="material-symbols-outlined" style="font-size: 15px; flex-shrink: 0;">${icon}</span>
                           <span style="font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 0.85em;">${arg.event.title}</span>
                       </div>`
            };
        },

        // Clic en un día/hora vacía → nuevo turno
        dateClick: function (info) {
            // En la vista de Mes, dateClick se dispara aunque el clic caiga sobre un evento
            // ya agendado. Si es así, no abrimos el modal de creación: lo maneja eventClick.
            if (info.jsEvent && info.jsEvent.target.closest('.fc-event')) {
                return;
            }
            const fechaStr = info.dateStr.split('T')[0];
            const horaStr = info.dateStr.includes('T') ? info.dateStr.split('T')[1].substring(0, 5) : '09:00';
            prepararModalNuevo(fechaStr, horaStr);
        },

        // Clic en un turno → ver detalle (desde ahí se cambia el estado o se edita)
        eventClick: function (info) {
            abrirDetalle(info.event.id);
        }
    });
    calendar.render();
}

function renderLista() {
    const cont = document.getElementById('contenedorLista');
    let lista = aplicarFiltrosBase(todosLosTurnos);

    switch (filtroEstadoLista) {
        case 'pendientes': lista = lista.filter(t => t.estado === 'pendiente'); break;
        case 'vencidos': lista = lista.filter(turnoEsVencido); break;
        case 'completado': lista = lista.filter(t => t.estado === 'completado'); break;
        case 'cancelado': lista = lista.filter(t => t.estado === 'cancelado'); break;
        case 'todos': default: break;
    }

    if (lista.length === 0) {
        cont.innerHTML = '<li class="agenda-vacia"><div class="icono"><span class="material-symbols-outlined" style="font-size:48px; color:#94a3b8;">event_busy</span></div><p>No hay turnos para este filtro.</p></li>';
        return;
    }

    // Pendientes/Todos: próximos primero. Cerrados/Vencidos: más recientes primero.
    const asc = (filtroEstadoLista === 'pendientes' || filtroEstadoLista === 'todos');
    lista = [...lista].sort((a, b) => {
        const da = `${String(a.fecha).split('T')[0]}T${a.hora}`;
        const db = `${String(b.fecha).split('T')[0]}T${b.hora}`;
        return asc ? da.localeCompare(db) : db.localeCompare(da);
    });

    cont.innerHTML = lista.map(renderTarjetaTurno).join('');
}

function renderTarjetaTurno(t) {
    const color = colorDeEvento(t.tipo_evento);
    const hora = String(t.hora).substring(0, 5);
    const fecha = fmtFechaCorta(t.fecha);
    const cliente = t.nombre_completo || 'Sin cliente';
    const causa = t.caratula ? `${t.caratula}${t.nro_expediente ? ` · Nro ${t.nro_expediente}` : ''}` : '';
    const evento = t.motivo || t.tipo_evento;
    const badge = `<span class="badge-estado badge-${t.estado}">${t.estado}</span>`;
    const vencido = turnoEsVencido(t) ? '<span class="badge-vencido">Vencido</span>' : '';

    let acciones = `<button class="btn-icono-turno" title="Ver detalle" onclick="abrirDetalle(${t.id})"><span class="material-symbols-outlined">visibility</span></button>`;
    if (t.estado === 'pendiente') {
        acciones += `<button class="btn-icono-turno completar" title="Marcar completado" onclick="cambiarEstadoTurno(${t.id}, 'completado')"><span class="material-symbols-outlined">check_circle</span></button>`;
        acciones += `<button class="btn-icono-turno cancelar" title="Cancelar turno" onclick="cambiarEstadoTurno(${t.id}, 'cancelado')"><span class="material-symbols-outlined">cancel</span></button>`;
    } else {
        acciones += `<button class="btn-icono-turno reabrir" title="Reabrir (volver a pendiente)" onclick="cambiarEstadoTurno(${t.id}, 'pendiente')"><span class="material-symbols-outlined">undo</span></button>`;
    }
    acciones += `<button class="btn-icono-turno editar" title="Editar" onclick="abrirModalEditar(${t.id})"><span class="material-symbols-outlined">edit</span></button>`;
    acciones += `<button class="btn-icono-turno eliminar" title="Eliminar" onclick="eliminarTurno(${t.id})"><span class="material-symbols-outlined">delete</span></button>`;

    return `
        <li class="turno-card ${t.estado === 'completado' ? 'completado' : t.estado === 'cancelado' ? 'cancelado' : ''}" style="border-left-color:${color}">
            <div class="turno-hora-bloque">
                <div class="hora-grande">${hora}</div>
                <div class="hora-sufijo">${fecha}</div>
            </div>
            <div class="turno-divisor"></div>
            <div class="turno-info">
                <div class="cliente-nombre"><span class="material-symbols-outlined" style="font-size:16px; vertical-align:middle; color:${color};">${iconoDeEvento(t.tipo_evento)}</span> ${evento}</div>
                <div class="turno-motivo">${cliente}${causa ? ` — ${causa}` : ''}</div>
            </div>
            <div class="turno-badges">${vencido}${badge}</div>
            <div class="turno-acciones">${acciones}</div>
        </li>
    `;
}

function renderLeyenda() {
    const el = document.getElementById('leyendaEventos');
    if (!el) return;
    el.innerHTML = Object.entries(COLORES_EVENTO).map(([tipo, color]) =>
        `<span class="leyenda-item"><span class="leyenda-punto" style="background:${color};"></span>${tipo}</span>`
    ).join('');
}

// ==========================================
// DETALLE Y CAMBIO DE ESTADO
// ==========================================

function abrirDetalle(id) {
    const t = todosLosTurnos.find(x => String(x.id) === String(id));
    if (!t) return;

    const color = colorDeEvento(t.tipo_evento);
    const causa = t.caratula ? `${t.caratula}${t.nro_expediente ? ` (Nro ${t.nro_expediente})` : ''}` : '—';

    document.getElementById('detalleTurnoBody').innerHTML = `
        <div class="detalle-header">
            <span class="material-symbols-outlined" style="color:${color}; font-size:28px;">${iconoDeEvento(t.tipo_evento)}</span>
            <div style="flex:1;">
                <strong>${t.motivo || t.tipo_evento}</strong><br>
                <small style="color:#94a3b8;">${t.tipo_evento}</small>
            </div>
            <span class="badge-estado badge-${t.estado}">${t.estado}</span>
        </div>
        <div class="detalle-grid">
            <div><label>Fecha</label><p>${fmtFechaLarga(t.fecha)}</p></div>
            <div><label>Hora</label><p>${String(t.hora).substring(0, 5)} hs</p></div>
            <div><label>Cliente</label><p>${t.nombre_completo || '—'}</p></div>
            <div><label>Expediente / Causa</label><p>${causa}</p></div>
            <div><label>Recordatorio</label><p>${etiquetaRecordatorio(t.recordatorio_offset_min)}</p></div>
        </div>
    `;

    let botones = '';
    if (t.estado === 'pendiente') {
        botones += `<button class="btn-secondary" onclick="cambiarEstadoTurno(${t.id}, 'completado')"><span class="material-symbols-outlined" style="font-size:16px; vertical-align:middle;">check_circle</span> Completar</button>`;
        botones += `<button class="btn-secondary" onclick="cambiarEstadoTurno(${t.id}, 'cancelado')"><span class="material-symbols-outlined" style="font-size:16px; vertical-align:middle;">cancel</span> Cancelar turno</button>`;
    } else {
        botones += `<button class="btn-secondary" onclick="cambiarEstadoTurno(${t.id}, 'pendiente')"><span class="material-symbols-outlined" style="font-size:16px; vertical-align:middle;">undo</span> Reabrir</button>`;
    }
    botones += `<button class="btn-primary" onclick="abrirModalEditar(${t.id})">Editar</button>`;
    document.getElementById('detalleTurnoAcciones').innerHTML = botones;

    document.getElementById('modalDetalleTurno').style.display = 'flex';
}

async function cambiarEstadoTurno(id, estado) {
    const token = localStorage.getItem('estudio_token');

    if (estado === 'cancelado') {
        const ok = await Alertas.confirmar('¿Cancelar turno?', 'El turno pasará a estado cancelado.', 'Sí, cancelar');
        if (!ok) return;
    }

    try {
        const res = await fetch(`${API}/api/turnos/${id}/estado`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ estado })
        });

        if (res.ok) {
            localStorage.removeItem('ultima_vigilancia_api');
            document.getElementById('modalDetalleTurno').style.display = 'none';
            Alertas.toast('Estado del turno actualizado.', 'success');
            cargarTurnos();
        } else {
            Alertas.toast('No se pudo cambiar el estado.', 'error');
        }
    } catch (error) {
        Alertas.toast('Error de conexión.', 'error');
    }
}

// ==========================================
// MODALES: NUEVO / EDITAR
// ==========================================

function prepararModalNuevo(fecha, hora) {
    document.getElementById('formNuevoTurno').reset();
    document.getElementById('fecha').value = fecha;
    document.getElementById('hora').value = hora;
    document.getElementById('tipoEventoOtro').style.display = 'none';
    cargarCausasDeCliente('', 'causaId');
    document.getElementById('recordatorio').value = '1440';
    document.getElementById('modalNuevoTurno').style.display = 'flex';
}

async function abrirModalEditar(id) {
    const t = todosLosTurnos.find(x => String(x.id) === String(id));
    if (!t) return;

    document.getElementById('modalDetalleTurno').style.display = 'none';

    const selectCliente = document.getElementById('editarClienteId');
    if (selectCliente.options.length <= 1) {
        await cargarDesplegableClientes('editarClienteId');
    }

    document.getElementById('editarTurnoId').value = t.id;
    const clienteVal = (t.cliente_id === null || t.cliente_id === undefined || t.cliente_id === 'null') ? '' : String(t.cliente_id);
    selectCliente.value = clienteVal;

    // Cargar las causas del cliente y preseleccionar la del turno
    await cargarCausasDeCliente(clienteVal, 'editarCausaId', t.causa_id || '');

    document.getElementById('editarFecha').value = String(t.fecha).split('T')[0];
    document.getElementById('editarHora').value = String(t.hora).substring(0, 5);

    const categoriasFijas = ['Audiencia', 'Mediación', 'Presentar Escrito', 'Reunión Cliente'];
    if (categoriasFijas.includes(t.tipo_evento)) {
        document.getElementById('editarTipoEvento').value = t.tipo_evento;
        document.getElementById('editarTipoEventoOtro').style.display = 'none';
        document.getElementById('editarTipoEventoOtro').value = '';
    } else {
        document.getElementById('editarTipoEvento').value = 'Otro';
        document.getElementById('editarTipoEventoOtro').style.display = 'block';
        const textoLibre = (t.motivo && t.motivo !== 'Otro') ? t.motivo : (t.tipo_evento && t.tipo_evento !== 'Otro' ? t.tipo_evento : '');
        document.getElementById('editarTipoEventoOtro').value = textoLibre;
    }

    document.getElementById('editarRecordatorio').value = String(t.recordatorio_offset_min ?? 1440);
    document.getElementById('editarEstado').value = t.estado;
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
        if (res.ok) {
            localStorage.removeItem('ultima_vigilancia_api');
            document.getElementById('modalDetalleTurno').style.display = 'none';
            cargarTurnos();
        } else Alertas.toast("No se pudo eliminar el turno.", 'error');
    } catch (error) {
        Alertas.toast("Error de conexión.", 'error');
    }
}

// ==========================================
// SELECTS: CLIENTES Y CAUSAS
// ==========================================

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

async function poblarFiltroClientes() {
    const token = localStorage.getItem('estudio_token');
    try {
        const res = await fetch(`${API}/api/clientes`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return;
        const clientes = await res.json();
        const sel = document.getElementById('filtroCliente');
        sel.innerHTML = '<option value="">Todos los clientes</option>' +
            clientes.map(c => `<option value="${c.id}">${c.nombre_completo}</option>`).join('');
    } catch (error) {
        console.error("Error al poblar filtro de clientes:", error);
    }
}

// Carga las causas de un cliente en un <select>. Si no hay cliente, lo deshabilita.
async function cargarCausasDeCliente(clienteId, causaSelectId, causaIdPreSel = '') {
    const token = localStorage.getItem('estudio_token');
    const select = document.getElementById(causaSelectId);

    if (!clienteId) {
        select.innerHTML = '<option value="">Elegí primero un cliente...</option>';
        select.disabled = true;
        return;
    }

    select.disabled = false;
    select.innerHTML = '<option value="">Cargando expedientes...</option>';

    try {
        const res = await fetch(`${API}/api/causas/cliente/${clienteId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const causas = res.ok ? await res.json() : [];
        select.innerHTML = '<option value="">Sin expediente asociado</option>' +
            causas.map(c => `<option value="${c.id}">${c.caratula || 'Sin carátula'}${c.nro_expediente ? ` (Nro ${c.nro_expediente})` : ''}</option>`).join('');
        if (causaIdPreSel) select.value = String(causaIdPreSel);
    } catch (error) {
        select.innerHTML = '<option value="">Sin expediente asociado</option>';
    }
}

// ==========================================
// TABS Y HELPERS
// ==========================================

// FIX: corrige un error visual de FullCalendar cuando se lo esconde/muestra con tabs
function cambiarTabAgenda(nombre, btn) {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('activo'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('activo'));
    document.getElementById('tab-' + nombre).classList.add('activo');
    btn.classList.add('activo');

    if (nombre === 'calendario' && calendar) {
        setTimeout(() => { calendar.render(); }, 10);
    }
}

function turnoEsVencido(t) {
    if (t.estado !== 'pendiente') return false;
    const fecha = String(t.fecha).split('T')[0];
    const hora = String(t.hora).substring(0, 5);
    const dt = new Date(`${fecha}T${hora}`);
    return !isNaN(dt.getTime()) && dt < new Date();
}

function etiquetaRecordatorio(min) {
    min = parseInt(min, 10);
    if (!min || min <= 0) return 'Sin recordatorio';
    if (min % 1440 === 0) { const d = min / 1440; return d === 1 ? '1 día antes' : `${d} días antes`; }
    if (min % 60 === 0) { const h = min / 60; return h === 1 ? '1 hora antes' : `${h} horas antes`; }
    return `${min} minutos antes`;
}

function fmtFechaCorta(fechaStr) {
    const d = new Date(String(fechaStr).split('T')[0] + 'T00:00:00');
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}

function fmtFechaLarga(fechaStr) {
    const d = new Date(String(fechaStr).split('T')[0] + 'T00:00:00');
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

function cerrarSesion() {
    localStorage.clear();
    window.location.href = 'login.html';
}
