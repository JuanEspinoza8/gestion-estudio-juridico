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
        const nuevoTurno = {
            cliente_id: document.getElementById('clienteId').value,
            usuario_id: localStorage.getItem('usuario_id'),
            fecha: document.getElementById('fecha').value,
            hora: document.getElementById('hora').value,
            motivo: document.getElementById('motivo').value
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
        const datos = {
            cliente_id: document.getElementById('editarClienteId').value,
            usuario_id: localStorage.getItem('usuario_id'),
            fecha: document.getElementById('editarFecha').value,
            hora: document.getElementById('editarHora').value,
            motivo: document.getElementById('editarMotivo').value,
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
    contenedor.innerHTML = '<p style="text-align:center;color:#64748b;padding:30px">Cargando agenda...</p>';

    try {
        const res = await fetch(`${API}/api/turnos/usuario/${usuarioId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Error del servidor');
        const turnos = await res.json();

        if (turnos.length === 0) {
            contenedor.innerHTML = '<div class="agenda-vacia"><div class="icono">📅</div><p>No hay turnos agendados próximos.</p></div>';
            return;
        }

        contenedor.innerHTML = renderizarAgenda(turnos);

    } catch (error) {
        contenedor.innerHTML = '<p style="color:red;text-align:center;padding:20px">Error al cargar la agenda.</p>';
    }
}

function renderizarAgenda(turnos) {
    const hoy = new Date().toISOString().split('T')[0];

    const grupos = {};
    turnos.forEach(t => {
        if (!grupos[t.fecha]) grupos[t.fecha] = [];
        grupos[t.fecha].push(t);
    });

    return Object.entries(grupos).map(([fecha, turnosDia]) => {
        const esHoy = fecha === hoy;
        const fechaObj = new Date(fecha + 'T00:00:00');
        const etiquetaFecha = esHoy
            ? '🔵 Hoy — ' + fechaObj.toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long' })
            : fechaObj.toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

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
                <div class="cliente-nombre">${t.nombre_completo}</div>
                <div class="turno-motivo">📋 ${t.motivo}</div>
            </div>
            <span class="badge-estado ${badgeClase}">${t.estado}</span>
            <div class="turno-acciones">
                <button class="btn-icono editar" title="Editar"
                    onclick="abrirModalEditar(${t.id}, '${t.cliente_id}', '${t.fecha}', '${t.hora}', '${motivoEscapado}', '${t.estado}')">
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

async function abrirModalEditar(id, clienteId, fecha, hora, motivo, estado) {
    const select = document.getElementById('editarClienteId');
    if (select.options.length <= 1) {
        await cargarDesplegableClientes('editarClienteId');
    }
    document.getElementById('editarTurnoId').value = id;
    document.getElementById('editarClienteId').value = clienteId;
    document.getElementById('editarFecha').value = fecha;
    document.getElementById('editarHora').value = hora.substring(0, 5);
    document.getElementById('editarMotivo').value = motivo;
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
            select.innerHTML = '<option value="">Seleccione un cliente...</option>' +
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