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
    cargarDesplegableClientes();

    // --- Modal NUEVO TURNO ---
    const modalNuevo = document.getElementById('modalNuevoTurno');
    document.getElementById('btnNuevoTurno').addEventListener('click', () => modalNuevo.style.display = 'flex');
    document.getElementById('btnCerrarModalTurno').addEventListener('click', () => modalNuevo.style.display = 'none');
    document.getElementById('btnCancelarModalTurno').addEventListener('click', () => modalNuevo.style.display = 'none');

    document.getElementById('formNuevoTurno').addEventListener('submit', async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('estudio_token');
        const nuevoTurno = {
            cliente_id: document.getElementById('clienteId').value,
            usuario_id: localStorage.getItem('usuario_id'),
            fecha: document.getElementById('fecha').value,
            hora: document.getElementById('hora').value,
            motivo: document.getElementById('motivo').value
        };

        try {
            const respuesta = await fetch(`${API}/api/turnos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(nuevoTurno)
            });

            if (respuesta.ok) {
                modalNuevo.style.display = 'none';
                document.getElementById('formNuevoTurno').reset();
                cargarTurnos();
            } else {
                const err = await respuesta.json();
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
        const token = localStorage.getItem('estudio_token');
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
            const respuesta = await fetch(`${API}/api/turnos/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(datos)
            });

            if (respuesta.ok) {
                modalEditar.style.display = 'none';
                cargarTurnos();
            } else {
                alert("Error al actualizar el turno.");
            }
        } catch (error) {
            alert("Error de conexión con el servidor.");
        }
    });
});

async function cargarTurnos() {
    const token = localStorage.getItem('estudio_token');
    const usuarioId = localStorage.getItem('usuario_id');
    const contenedor = document.getElementById('contenedorTurnos');

    try {
        const respuesta = await fetch(`${API}/api/turnos/usuario/${usuarioId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!respuesta.ok) throw new Error('Error del servidor');

        const turnos = await respuesta.json();

        if (turnos.length === 0) {
            contenedor.innerHTML = `<p style="text-align: center; color: #64748b; padding: 30px;">No hay turnos agendados próximos.</p>`;
            return;
        }

        contenedor.innerHTML = turnos.map(t => {
            const fecha = new Date(t.fecha + 'T00:00:00'); // Evita desfase de zona horaria
            const fechaFormateada = fecha.toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long' });
            const esHoy = t.fecha === new Date().toISOString().split('T')[0];

            return `
                <li class="turno-card ${esHoy ? 'border-urgente' : 'border-normal'}">
                    <div class="turno-fecha">
                        <strong>${fechaFormateada}</strong>
                        <span>${t.hora.substring(0, 5)} hs</span>
                        ${esHoy ? '<span class="badge-hoy">HOY</span>' : ''}
                    </div>
                    <div class="turno-detalle">
                        <h3>${t.nombre_completo}</h3>
                        <p>${t.motivo}</p>
                    </div>
                    <div class="turno-acciones">
                        <button class="btn-editar" onclick="abrirModalEditar(${t.id}, '${t.cliente_id}', '${t.fecha}', '${t.hora}', '${escapar(t.motivo)}', '${t.estado}')">
                            ✏️ Editar
                        </button>
                        <button class="btn-eliminar" onclick="eliminarTurno(${t.id})">
                            🗑️ Eliminar
                        </button>
                    </div>
                </li>
            `;
        }).join('');

    } catch (error) {
        console.error("Error al cargar turnos:", error);
        contenedor.innerHTML = `<p style="color: red; text-align: center;">Error al cargar la agenda.</p>`;
    }
}

function escapar(texto) {
    return texto.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

async function abrirModalEditar(id, clienteId, fecha, hora, motivo, estado) {
    // Cargar el select de clientes si no está poblado
    const select = document.getElementById('editarClienteId');
    if (select.options.length <= 1) {
        await cargarDesplegableClientesEnSelect('editarClienteId');
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
    if (!confirm('¿Estás seguro de que querés eliminar este turno?')) return;

    const token = localStorage.getItem('estudio_token');
    try {
        const respuesta = await fetch(`${API}/api/turnos/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (respuesta.ok) {
            cargarTurnos();
        } else {
            alert("No se pudo eliminar el turno.");
        }
    } catch (error) {
        alert("Error de conexión.");
    }
}

async function cargarDesplegableClientes() {
    await cargarDesplegableClientesEnSelect('clienteId');
}

async function cargarDesplegableClientesEnSelect(selectId) {
    const token = localStorage.getItem('estudio_token');
    const select = document.getElementById(selectId);

    try {
        const respuesta = await fetch(`${API}/api/clientes`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (respuesta.ok) {
            const clientes = await respuesta.json();
            select.innerHTML = '<option value="">Seleccione un cliente...</option>' +
                clientes.map(c => `<option value="${c.id}">${c.nombre_completo} (DNI: ${c.dni})</option>`).join('');
        }
    } catch (error) {
        console.error("Error al cargar clientes en el select:", error);
    }
}

function cerrarSesion() {
    localStorage.clear();
    window.location.href = 'login.html';
}