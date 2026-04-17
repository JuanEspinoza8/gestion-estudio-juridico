// public/js/dashboard.js

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('estudio_token');
    const usuarioId = localStorage.getItem('usuario_id');

    if (!token || !usuarioId) {
        window.location.href = 'login.html';
        return;
    }

    cargarResumenGeneral();
});

async function cargarResumenGeneral() {
    const token = localStorage.getItem('estudio_token');
    const usuarioId = localStorage.getItem('usuario_id');
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    try {
        const [resClientes, resDeuda, resTurnosHoy, resDeudores] = await Promise.all([
            fetch('https://api-estudio-juridico-oma1.onrender.com/api/clientes', { headers }),
            fetch('https://api-estudio-juridico-oma1.onrender.com/api/clientes/deuda-total', { headers }),
            // Usamos el endpoint /hoy para que solo cuente los turnos de hoy
            fetch(`https://api-estudio-juridico-oma1.onrender.com/api/turnos/usuario/${usuarioId}/hoy`, { headers }),
            fetch('https://api-estudio-juridico-oma1.onrender.com/api/clientes/deudores', { headers })
        ]);

        const clientes = await resClientes.json();
        const deuda = await resDeuda.json();
        const turnosHoy = await resTurnosHoy.json();
        const deudores = await resDeudores.json();

        // KPIs
        document.getElementById('kpiTotalClientes').textContent = clientes.length;
        document.getElementById('kpiDeudaTotal').textContent =
            `$ ${new Intl.NumberFormat('es-AR').format(deuda.deuda_total_calle || 0)}`;
        document.getElementById('kpiTurnosHoy').textContent = turnosHoy.length;

        // Panel: Próximos Turnos de HOY
        const listaTurnos = document.getElementById('listaTurnosHoy');
        if (turnosHoy.length === 0) {
            listaTurnos.innerHTML = `<li style="color: #64748b; font-size: 0.9rem; padding: 10px 0;">No hay turnos agendados para hoy.</li>`;
        } else {
            listaTurnos.innerHTML = turnosHoy.map(t => `
                <li>
                    <span class="hora">${t.hora.substring(0, 5)}</span>
                    <div class="detalle">
                        <strong>${t.nombre_completo}</strong>
                        <span>${t.motivo}</span>
                    </div>
                </li>
            `).join('');
        }

        // Panel: Deudores Urgentes
        const listaDeudas = document.getElementById('listaDeudores');
        if (deudores.length === 0) {
            listaDeudas.innerHTML = `<li style="color: #64748b; font-size: 0.9rem; padding: 10px 0;">No hay deudores pendientes.</li>`;
        } else {
            listaDeudas.innerHTML = deudores.slice(0, 3).map(d => `
                <li>
                    <span class="material-symbols-outlined text-red">warning</span>
                    <div class="detalle">
                        <strong>${d.nombre_completo}</strong>
                        <span style="color: #ef4444;">Debe: $ ${new Intl.NumberFormat('es-AR').format(d.deuda_actual)}</span>
                    </div>
                </li>
            `).join('');
        }

    } catch (error) {
        console.error("Error cargando el Dashboard:", error);
    }
}

function cerrarSesion() {
    localStorage.clear();
    window.location.href = 'login.html';
}