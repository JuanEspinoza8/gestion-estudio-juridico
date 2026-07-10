// public/js/clientes.js

const API_CLIENTES = 'https://api-estudio-juridico-oma1.onrender.com/api/clientes';

// Guardamos todos los clientes en memoria para filtrar sin hacer fetch extra
let todosLosClientes = [];

// Estado de ordenamiento de la tabla
let sortColumn = null;   // 'nombre_completo' | 'dni' | 'telefono'
let sortDir = 'asc';     // 'asc' | 'desc'

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('estudio_token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    cargarClientes();

    // --- Buscador en tiempo real ---
    document.getElementById('searchInput').addEventListener('input', aplicarVistaClientes);

    // --- Ordenamiento por columnas ---
    document.querySelectorAll('#tablaClientes .th-sortable').forEach(th => {
        th.addEventListener('click', () => {
            const columna = th.dataset.sort;
            if (sortColumn === columna) {
                // Segundo clic sobre la misma columna: invierte el sentido
                sortDir = sortDir === 'asc' ? 'desc' : 'asc';
            } else {
                sortColumn = columna;
                sortDir = 'asc';
            }
            aplicarVistaClientes();
        });
    });

    // --- Modal Nuevo Cliente ---
    const modal = document.getElementById('modalNuevoCliente');
    document.getElementById('btnNuevoCliente').addEventListener('click', () => modal.style.display = 'flex');
    document.getElementById('btnCerrarModal').addEventListener('click', () => modal.style.display = 'none');
    document.getElementById('btnCancelarModal').addEventListener('click', () => modal.style.display = 'none');

    // --- Modal Editar Cliente ---
    const modalEditar = document.getElementById('modalEditarCliente');
    document.getElementById('btnCerrarModalEditar').addEventListener('click', () => modalEditar.style.display = 'none');
    document.getElementById('btnCancelarModalEditar').addEventListener('click', () => modalEditar.style.display = 'none');
    document.getElementById('formEditarCliente').addEventListener('submit', guardarEdicionCliente);

    document.getElementById('formNuevoCliente').addEventListener('submit', async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('estudio_token');

        // --- MEJORA UX-01: Aspiradora de puntos para el DNI ---
        const dniCrudo = document.getElementById('dni').value;
        const dniLimpio = dniCrudo.replace(/\./g, ''); // Elimina todos los puntos
        // ------------------------------------------------------

        const nuevoCliente = {
            nombre_completo: document.getElementById('nombre').value,
            dni: dniLimpio, // Enviamos el DNI limpio a la base de datos
            telefono: document.getElementById('telefono').value,
            email: document.getElementById('email').value,
            notas: document.getElementById('notas').value
        };

        try {
            const respuesta = await fetch('https://api-estudio-juridico-oma1.onrender.com/api/clientes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(nuevoCliente)
            });

            if (respuesta.ok) {
                modal.style.display = 'none';
                document.getElementById('formNuevoCliente').reset();
                // Limpiamos la búsqueda para mostrar la lista completa con el nuevo cliente
                document.getElementById('searchInput').value = '';
                cargarClientes();
            } else {
                let errorMessage = "Verifique los datos";
                try {
                    const errorData = await respuesta.json();
                    errorMessage = errorData.error || errorData.message || errorMessage;
                } catch (parseError) {
                    errorMessage = "El servidor está inactivo o devolvió un error inesperado. Intente de nuevo en 1 minuto.";
                }
                Alertas.mensaje('Error', "Error al guardar: " + errorMessage, 'error');
            }
        } catch (error) {
            Alertas.toast("No se pudo conectar con el servidor.", 'error');
        }
    });
}); // <--- Ahora sí, cerramos el bloque principal donde corresponde

async function cargarClientes() {
    const token = localStorage.getItem('estudio_token');
    const tbody = document.getElementById('tbodyClientes');
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#64748b">Cargando...</td></tr>`;

    try {
        const respuesta = await fetch('https://api-estudio-juridico-oma1.onrender.com/api/clientes', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (respuesta.ok) {
            todosLosClientes = await respuesta.json();
            aplicarVistaClientes();
        } else {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:red">Error al cargar clientes.</td></tr>`;
        }
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:red">Error de conexión.</td></tr>`;
    }
}

// Aplica el filtro de búsqueda + el ordenamiento activo y redibuja la tabla
function aplicarVistaClientes() {
    const termino = (document.getElementById('searchInput').value || '').toLowerCase().trim();

    let vista = todosLosClientes;
    if (termino) {
        vista = todosLosClientes.filter(c =>
            c.nombre_completo.toLowerCase().includes(termino) ||
            String(c.dni).includes(termino) ||
            (c.email && c.email.toLowerCase().includes(termino)) ||
            (c.telefono && c.telefono.includes(termino))
        );
    }

    if (sortColumn) {
        const factor = sortDir === 'asc' ? 1 : -1;
        // Copia para no mutar el arreglo original
        vista = [...vista].sort((a, b) => compararClientes(a, b, sortColumn) * factor);
    }

    actualizarIconosOrden();
    renderizarTabla(vista);
}

// Comparador: numérico para DNI, alfabético (con soporte de acentos) para el resto
function compararClientes(a, b, columna) {
    if (columna === 'dni') {
        const na = parseInt(String(a.dni).replace(/\D/g, ''), 10) || 0;
        const nb = parseInt(String(b.dni).replace(/\D/g, ''), 10) || 0;
        return na - nb;
    }
    const va = (a[columna] || '').toString();
    const vb = (b[columna] || '').toString();
    return va.localeCompare(vb, 'es', { sensitivity: 'base', numeric: true });
}

// Refleja la columna y el sentido activos en las flechitas de las cabeceras
function actualizarIconosOrden() {
    document.querySelectorAll('#tablaClientes .th-sortable').forEach(th => {
        const icono = th.querySelector('.sort-icon');
        if (!icono) return;
        if (th.dataset.sort === sortColumn) {
            icono.textContent = sortDir === 'asc' ? '▲' : '▼';
        } else {
            icono.textContent = '';
        }
    });
}

function renderizarTabla(clientes) {
    const tbody = document.getElementById('tbodyClientes');

    if (clientes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#64748b;padding:30px">No se encontraron clientes.</td></tr>`;
        return;
    }

    tbody.innerHTML = clientes.map(c => `
        <tr>
            <td data-label="Nombre y Apellido">
                <strong>${c.nombre_completo}</strong>
                ${c.email ? `<br><small style="color:#64748b">${c.email}</small>` : ''}
            </td>
            <td data-label="DNI">${c.dni ? String(c.dni).replace(/\B(?=(\d{3})+(?!\d))/g, ".") : '-'}</td>
            <td data-label="Teléfono">${c.telefono || '-'}</td>
            <td data-label="Acciones">
                <div class="acciones-cell">
                    <button class="btn-ver-cuenta" onclick="verCuenta(${c.id})">Ver Cuenta</button>
                    <button class="btn-icono-tabla editar" title="Editar cliente" onclick="editarCliente(${c.id})">
                        <span class="material-symbols-outlined">edit</span>
                    </button>
                    <button class="btn-icono-tabla eliminar" title="Eliminar cliente" onclick="eliminarCliente(${c.id})">
                        <span class="material-symbols-outlined">delete</span>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// --- EDITAR CLIENTE ---
function editarCliente(id) {
    const cliente = todosLosClientes.find(c => c.id === id);
    if (!cliente) return;

    document.getElementById('editarClienteId').value = cliente.id;
    document.getElementById('editarNombre').value = cliente.nombre_completo || '';
    document.getElementById('editarDni').value = cliente.dni ? String(cliente.dni).replace(/\B(?=(\d{3})+(?!\d))/g, ".") : '';
    document.getElementById('editarTelefono').value = cliente.telefono || '';
    document.getElementById('editarEmail').value = cliente.email || '';
    document.getElementById('editarNotas').value = cliente.notas || '';

    document.getElementById('modalEditarCliente').style.display = 'flex';
}

async function guardarEdicionCliente(e) {
    e.preventDefault();
    const token = localStorage.getItem('estudio_token');
    const id = document.getElementById('editarClienteId').value;

    const datos = {
        nombre_completo: document.getElementById('editarNombre').value,
        dni: document.getElementById('editarDni').value.replace(/\./g, ''), // DNI sin puntos
        telefono: document.getElementById('editarTelefono').value,
        email: document.getElementById('editarEmail').value,
        notas: document.getElementById('editarNotas').value
    };

    try {
        const respuesta = await fetch(`${API_CLIENTES}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(datos)
        });

        if (respuesta.ok) {
            document.getElementById('modalEditarCliente').style.display = 'none';
            Alertas.toast('Cliente actualizado correctamente.', 'success');
            cargarClientes();
        } else {
            let errorMessage = 'Verifique los datos';
            try {
                const errorData = await respuesta.json();
                errorMessage = errorData.error || errorData.message || errorMessage;
            } catch (parseError) {
                errorMessage = 'El servidor está inactivo o devolvió un error inesperado. Intente de nuevo en 1 minuto.';
            }
            Alertas.mensaje('Error', 'Error al actualizar: ' + errorMessage, 'error');
        }
    } catch (error) {
        Alertas.toast('No se pudo conectar con el servidor.', 'error');
    }
}

// --- ELIMINAR CLIENTE ---
async function eliminarCliente(id) {
    const cliente = todosLosClientes.find(c => c.id === id);
    const nombre = cliente ? cliente.nombre_completo : 'este cliente';

    const confirmado = await Alertas.confirmar(
        '¿Eliminar cliente?',
        `Se borrarán todos los datos de ${nombre} (pagos, honorarios, turnos y notas). Esta acción no se puede deshacer.`,
        'Sí, eliminar'
    );
    if (!confirmado) return;

    const token = localStorage.getItem('estudio_token');
    try {
        const respuesta = await fetch(`${API_CLIENTES}/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (respuesta.ok) {
            Alertas.toast('Cliente eliminado correctamente.', 'success');
            cargarClientes();
        } else {
            let errorMessage = 'No se pudo eliminar el cliente';
            try {
                const errorData = await respuesta.json();
                errorMessage = errorData.error || errorMessage;
            } catch (parseError) { /* respuesta sin cuerpo JSON */ }
            Alertas.mensaje('Error', errorMessage, 'error');
        }
    } catch (error) {
        Alertas.toast('No se pudo conectar con el servidor.', 'error');
    }
}

function cerrarSesion() {
    localStorage.removeItem('estudio_token');
    window.location.href = 'login.html';
}

function verCuenta(id) {
    window.location.href = `cuenta.html?id=${id}`;
}