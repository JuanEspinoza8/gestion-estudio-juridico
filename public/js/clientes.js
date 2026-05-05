// public/js/clientes.js

// Guardamos todos los clientes en memoria para filtrar sin hacer fetch extra
let todosLosClientes = [];

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('estudio_token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    cargarClientes();

    // --- Buscador en tiempo real ---
    document.getElementById('searchInput').addEventListener('input', (e) => {
        const termino = e.target.value.toLowerCase().trim();
        if (!termino) {
            renderizarTabla(todosLosClientes);
            return;
        }
        const filtrados = todosLosClientes.filter(c =>
            c.nombre_completo.toLowerCase().includes(termino) ||
            String(c.dni).includes(termino) ||
            (c.email && c.email.toLowerCase().includes(termino)) ||
            (c.telefono && c.telefono.includes(termino))
        );
        renderizarTabla(filtrados);
    });

    // --- Modal Nuevo Cliente ---
    const modal = document.getElementById('modalNuevoCliente');
    document.getElementById('btnNuevoCliente').addEventListener('click', () => modal.style.display = 'flex');
    document.getElementById('btnCerrarModal').addEventListener('click', () => modal.style.display = 'none');
    document.getElementById('btnCancelarModal').addEventListener('click', () => modal.style.display = 'none');

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
            renderizarTabla(todosLosClientes);
        } else {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:red">Error al cargar clientes.</td></tr>`;
        }
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:red">Error de conexión.</td></tr>`;
    }
}

function renderizarTabla(clientes) {
    const tbody = document.getElementById('tbodyClientes');

    if (clientes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#64748b;padding:30px">No se encontraron clientes.</td></tr>`;
        return;
    }

    tbody.innerHTML = clientes.map(c => `
        <tr>
            <td>
                <strong>${c.nombre_completo}</strong>
                ${c.email ? `<br><small style="color:#64748b">${c.email}</small>` : ''}
            </td>
            <td>${c.dni ? String(c.dni).replace(/\B(?=(\d{3})+(?!\d))/g, ".") : '-'}</td>
            <td>${c.telefono || '-'}</td>
            <td>
                <!-- AQUÍ INYECTAMOS NUESTRA CLASE PREMIUM -->
                <button class="btn-ver-cuenta" onclick="verCuenta(${c.id})">Ver Cuenta</button>
            </td>
        </tr>
    `).join('');
}

function cerrarSesion() {
    localStorage.removeItem('estudio_token');
    window.location.href = 'login.html';
}

function verCuenta(id) {
    window.location.href = `cuenta.html?id=${id}`;
}