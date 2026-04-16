// public/js/clientes.js

document.addEventListener('DOMContentLoaded', () => {
    // 1. Verificación de Seguridad (Token)
    const token = localStorage.getItem('estudio_token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // 2. Cargar la tabla al iniciar
    cargarClientes();

    // 3. Lógica visual del Modal Flotante
    const modal = document.getElementById('modalNuevoCliente');
    const btnNuevo = document.getElementById('btnNuevoCliente');
    const btnCerrar = document.getElementById('btnCerrarModal');
    const btnCancelar = document.getElementById('btnCancelarModal');

    // Funciones para abrir y cerrar (Cambiamos el display del CSS)
    btnNuevo.addEventListener('click', () => modal.style.display = 'flex');
    btnCerrar.addEventListener('click', () => modal.style.display = 'none');
    btnCancelar.addEventListener('click', () => modal.style.display = 'none');

    // 4. Lógica para GUARDAR un nuevo cliente
    const formNuevoCliente = document.getElementById('formNuevoCliente');
    
    formNuevoCliente.addEventListener('submit', async (e) => {
        e.preventDefault(); // Evitamos que la página recargue

        // Recolectamos los datos del formulario
        const nuevoCliente = {
            nombre_completo: document.getElementById('nombre').value,
            dni: document.getElementById('dni').value,
            telefono: document.getElementById('telefono').value,
            email: document.getElementById('email').value,
            notas: document.getElementById('notas').value
        };

        try {
            // Hacemos un POST a la API de Juan
            const respuesta = await fetch('http://localhost:3000/api/clientes', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify(nuevoCliente)
            });

            if (respuesta.ok) {
                // Si la BD lo guardó, cerramos el modal, limpiamos el formulario y recargamos la tabla
                modal.style.display = 'none';
                formNuevoCliente.reset();
                cargarClientes(); // Vuelve a pedir la lista actualizada
                alert("¡Cliente guardado exitosamente!");
            } else {
                const errorData = await respuesta.json();
                alert("Error al guardar: " + (errorData.message || "Desconocido"));
            }
        } catch (error) {
            console.error("Error de red:", error);
            alert("No se pudo conectar con el servidor.");
        }
    });
});

// Función para pedir los datos a la BD y armar la tabla
async function cargarClientes() {
    const token = localStorage.getItem('estudio_token');
    const tbody = document.getElementById('tbodyClientes');

    try {
        const respuesta = await fetch('http://localhost:3000/api/clientes', {
            method: 'GET',
            headers: { 
                'Authorization': `Bearer ${token}` 
            }
        });

        if (respuesta.ok) {
            const clientes = await respuesta.json();
            
            // Si no hay clientes en la base de datos
            if (clientes.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4" style="text-align: center;">No hay clientes registrados aún.</td></tr>`;
                return;
            }

            // Mapeamos los clientes reales al HTML
            tbody.innerHTML = clientes.map(c => `
                <tr>
                    <td><strong>${c.nombre_completo}</strong><br><small style="color: #64748b">${c.email || ''}</small></td>
                    <td>${c.dni}</td>
                    <td>${c.telefono || '-'}</td>
                    <td>
                        <button class="btn-secondary" onclick="verCuenta(${c.id})">Ver Cuenta</button>
                    </td>
                </tr>
            `).join('');
            
        } else {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: red;">Error al cargar clientes.</td></tr>`;
        }
    } catch (error) {
        console.error("Error al cargar la tabla:", error);
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: red;">Error de conexión con el servidor.</td></tr>`;
    }
}

// Función global para el cierre de sesión (reciclada del dashboard)
function cerrarSesion() {
    localStorage.removeItem('estudio_token');
    window.location.href = 'login.html';
}

function verCuenta(id) {
    // Redirige pasando el ID por la URL (Ej: cuenta.html?id=5)
    window.location.href = `cuenta.html?id=${id}`;
}