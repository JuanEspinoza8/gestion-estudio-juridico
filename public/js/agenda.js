// public/js/agenda.js

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('estudio_token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // Inicializar pantalla
    cargarTurnos();
    cargarDesplegableClientes();

    // Lógica del Modal
    const modal = document.getElementById('modalNuevoTurno');
    document.getElementById('btnNuevoTurno').addEventListener('click', () => modal.style.display = 'flex');
    document.getElementById('btnCerrarModalTurno').addEventListener('click', () => modal.style.display = 'none');
    document.getElementById('btnCancelarModalTurno').addEventListener('click', () => modal.style.display = 'none');

    // Guardar nuevo turno
    const formNuevoTurno = document.getElementById('formNuevoTurno');
    formNuevoTurno.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Armamos el objeto tal como lo espera Juan en el backend
        const nuevoTurno = {
            cliente_id: document.getElementById('clienteId').value,
            fecha: document.getElementById('fecha').value,
            hora: document.getElementById('hora').value,
            motivo: document.getElementById('motivo').value
        };

        try {
            const respuesta = await fetch('http://localhost:3000/api/turnos', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify(nuevoTurno)
            });

            if (respuesta.ok) {
                modal.style.display = 'none';
                formNuevoTurno.reset();
                cargarTurnos(); // Recarga la lista para mostrar el nuevo turno
                alert("¡Turno agendado con éxito!");
            } else {
                const errorData = await respuesta.json();
                alert("Error al agendar: " + (errorData.message || "Verifique los datos"));
            }
        } catch (error) {
            console.error("Error:", error);
            alert("Error de conexión con el servidor.");
        }
    });
});

async function cargarTurnos() {
    const token = localStorage.getItem('estudio_token');
    const contenedor = document.getElementById('contenedorTurnos');

    try {
        const respuesta = await fetch('http://localhost:3000/api/turnos/proximos', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (respuesta.ok) {
            const turnos = await respuesta.json();
            
            if (turnos.length === 0) {
                contenedor.innerHTML = `<p style="text-align: center; color: #64748b;">No hay turnos agendados próximos.</p>`;
                return;
            }

            contenedor.innerHTML = turnos.map(t => `
                <li class="turno-card">
                    <div class="turno-fecha">
                        <strong>${new Date(t.fecha).toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: 'short' })}</strong>
                        <span>${t.hora.substring(0, 5)} hs</span>
                    </div>
                    <div class="turno-detalle">
                        <h3>${t.nombre_completo || 'Cliente Registrado'}</h3>
                        <p><span class="material-symbols-outlined" style="font-size: 16px; vertical-align: bottom;">gavel</span> ${t.motivo}</p>
                    </div>
                    <div class="turno-estado">
                        <span class="badge ${t.estado === 'pendiente' ? 'badge-warning' : 'badge-success'}">${t.estado.toUpperCase()}</span>
                    </div>
                </li>
            `).join('');
        }
    } catch (error) {
        console.error("Error al cargar turnos:", error);
        contenedor.innerHTML = `<p style="color: red; text-align: center;">Error al cargar la agenda.</p>`;
    }
}

// Función clave: Trae los clientes para armar el <select> del formulario
async function cargarDesplegableClientes() {
    const token = localStorage.getItem('estudio_token');
    const select = document.getElementById('clienteId');

    try {
        const respuesta = await fetch('http://localhost:3000/api/clientes', {
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
    localStorage.removeItem('estudio_token');
    window.location.href = 'login.html';
}