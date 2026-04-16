// public/js/dashboard.js

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('estudio_token');

    // 1. Verificación de Seguridad (Machete de Juan)
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // 2. Ejecutar la carga de datos
    cargarResumenGeneral();
});

async function cargarResumenGeneral() {
    const token = localStorage.getItem('estudio_token');
    const headers = { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json' 
    };

    try {
        // Pedir KPIs (Clientes, Deuda, Turnos)
        const resClientes = await fetch('http://localhost:3000/api/clientes', { headers });
        const resDeuda = await fetch('http://localhost:3000/api/clientes/deuda-total', { headers });
        const resTurnos = await fetch('http://localhost:3000/api/turnos/proximos', { headers });
        const resDeudores = await fetch('http://localhost:3000/api/clientes/deudores', { headers });

        const clientes = await resClientes.json();
        const deuda = await resDeuda.json();
        const turnos = await resTurnos.json();
        const deudores = await resDeudores.json();

        // Inyectar en los KPIs
        document.getElementById('kpiTotalClientes').textContent = clientes.length;
        document.getElementById('kpiDeudaTotal').textContent = `$ ${new Intl.NumberFormat('es-AR').format(deuda.deuda_total_calle)}`;
        document.getElementById('kpiTurnosHoy').textContent = turnos.length;

        // Inyectar Próximos Turnos
        const listaTurnos = document.getElementById('listaTurnosHoy');
        listaTurnos.innerHTML = turnos.map(t => `
            <li>
                <span class="hora">${t.hora.substring(0, 5)}</span>
                <div class="detalle">
                    <strong>${t.nombre_completo || 'Cliente'}</strong>
                    <span>${t.motivo}</span>
                </div>
            </li>
        `).join('');

        // Inyectar Deudores Urgentes
        const listaDeudas = document.getElementById('listaDeudores');
        listaDeudas.innerHTML = deudores.slice(0, 3).map(d => `
            <li>
                <span class="material-symbols-outlined text-red">warning</span>
                <div class="detalle">
                    <strong>${d.nombre_completo}</strong>
                    <span class="text-red">Debe: $ ${new Intl.NumberFormat('es-AR').format(d.deuda_actual)}</span>
                </div>
            </li>
        `).join('');

    } catch (error) {
        console.error("Error cargando el Dashboard:", error);
    }
}

// Función extra para el botón de cerrar sesión
function cerrarSesion() {
    localStorage.removeItem('estudio_token');
    window.location.href = 'login.html';
}