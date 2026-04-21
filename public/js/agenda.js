// public/js/agenda.js

const API = 'https://api-estudio-juridico-oma1.onrender.com';

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
    document.getElementById('btnNuevoTurno').addEventListener('click', () => modalNuevo.style.display = 'flex');
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
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('estudio_token')}` },
                body: JSON.stringify(nuevoTurno)
            });

            if (res.ok) {
                modalNuevo.style.display = 'none';
                document.getElementById('formNuevoTurno').reset();
                cargarTurnos();
            } else {
                const err = await res.json();
                alert("Error al agendar: " + (err.message || "Verifique los datos"));
            }
        } catch (error) {
            alert("Error de conexión con el servidor.");
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
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('estudio_token')}` },
                body: JSON.stringify(datos)
            });

            if (res.ok) {
                modalEditar.style.display = 'none';
                cargarTurnos();
            } else {
                alert("Error al actualizar el turno.");
            }
        } catch {
            alert("Error de conexión.");
        }
    });
});

async function cargarTurnos() {
    const token = localStorage.getItem('estudio_token');
    const usuarioId = localStorage.getItem('usuario_id');
    const contenedor = document.getElementById('contenedorTurnos');
    const contenedorComp = document.getElementById('contenedorCompletados');
    contenedor.innerHTML = '<p style="text-align:center;color:#64748b;padding:30px">Cargando agenda...</p>';
    contenedorComp.innerHTML = '<p style="text-align:center;color:#64748b;padding:30px">Cargando historial...</p>';

    try {
        const res = await fetch(`${API}/api/turnos/usuario/${usuarioId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Error del servidor');
        const turnos = await res.json();

        const pendientes = turnos.filter(t => t.estado === 'pendiente');
        const completados = turnos.filter(t => t.estado === 'completado' || t.estado === 'cancelado');

        if (pendientes.length === 0) {
            contenedor.innerHTML = '<div class="agenda-vacia"><div class="icono">📅</div><p>No hay turnos agendados próximos.</p></div>';
        } else {
            contenedor.innerHTML = renderizarAgenda(pendientes, false);
        }

        if (completados.length === 0) {
            contenedorComp.innerHTML = '<div class="agenda-vacia"><div class="icono">📜</div><p>No hay registro de turnos pasados.</p></div>';
        } else {
            contenedorComp.innerHTML = renderizarAgenda(completados, true);
        }

    } catch (error) {
        contenedor.innerHTML = '<p style="color:red;text-align:center;padding:20px">Error al cargar la agenda.</p>';
    }
}

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
            ? '🔵 Hoy — ' + fechaObj.toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long' })
            : fechaObj.toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

        const hoyObj = new Date();
        hoyObj.setHours(0, 0, 0, 0);
        if (esHistorial && fechaObj > hoyObj) {
            etiquetaFecha += ' (Completado por adelantado)';
        }

        // Si es historial ordenamos descendente la hora
        turnosDia.sort((a,b) => esHistorial ? b.hora.localeCompare(a.hora) : a.hora.localeCompare(b.hora));
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
                <div class="turno-motivo">📋 ${t.tipo_evento || t.motivo}</div>
            </div>
            <span class="badge-estado ${badgeClase}">${t.estado}</span>
            <div class="turno-acciones">
                ${t.estado === 'pendiente' ? `
                <button class="btn-icono" title="Marcar Completado" style="color: #10b981; background: #d1fae5; border-radius: 5px; padding: 6px;"
                    onclick="marcarCompletado(${t.id})">
                    ✔️
                </button>
                ` : ''}
                <button class="btn-icono editar" title="Editar"
                    onclick="abrirModalEditar(${t.id}, '${t.cliente_id}', '${t.fecha}', '${t.hora}', '${t.tipo_evento || motivoEscapado}', '${t.estado}')">
                    ✏️
                </button>
                <button class="btn-icono eliminar" title="Eliminar"
                    onclick="eliminarTurno(${t.id})">
                    🗑️
                </button>
            </div>
        </li>
    `;
}

function cambiarTabAgenda(nombre, btn) {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('activo'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('activo'));
    document.getElementById('tab-' + nombre).classList.add('activo');
    btn.classList.add('activo');
}

async function marcarCompletado(id) {
    if (!confirm('¿Marcar este turno como completado?')) return;
    const token = localStorage.getItem('estudio_token');
    try {
        const res = await fetch(`${API}/api/turnos/${id}/estado`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ estado: 'completado' })
        });
        if (res.ok) cargarTurnos();
        else alert("No se pudo completar el turno.");
    } catch {
        alert("Error de conexión.");
    }
}

async function abrirModalEditar(id, clienteId, fecha, hora, tipoEvento, estado) {
    const select = document.getElementById('editarClienteId');
    if (select.options.length <= 1) {
        await cargarDesplegableClientes('editarClienteId');
    }
    document.getElementById('editarTurnoId').value = id;
    document.getElementById('editarClienteId').value = clienteId === 'null' ? '' : clienteId;
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
    if (!confirm('¿Eliminás este turno?')) return;
    const token = localStorage.getItem('estudio_token');
    try {
        const res = await fetch(`${API}/api/turnos/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) cargarTurnos();
        else alert("No se pudo eliminar el turno.");
    } catch {
        alert("Error de conexión.");
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
            select.innerHTML = '<option value="">Sin cliente asociado</option>' +
                clientes.map(c => '<option value="' + c.id + '">' + c.nombre_completo + ' (DNI: ' + c.dni + ')</option>').join('');
        }
    } catch (error) {
        console.error("Error al cargar clientes:", error);
    }
}

function cerrarSesion() {
    localStorage.clear();
    window.location.href = 'login.html';
}