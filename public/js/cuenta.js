// public/js/cuenta.js
// Cuenta corriente de un cliente: datos, honorarios, pagos, cuotas, notas y línea de tiempo.

const params = new URLSearchParams(window.location.search);
const clienteId = params.get('id');

if (requerirSesion() && !clienteId) window.location.href = 'clientes.html';

// LÓGICA DE INTERFAZ
function cambiarTab(nombre, btn) {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('activo'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('activo'));
    document.getElementById('tab-' + nombre).classList.add('activo');
    btn.classList.add('activo');
}

function abrirModal(id) { document.getElementById(id).style.display = 'flex'; }
function cerrarModal(id) { document.getElementById(id).style.display = 'none'; }

// Variable global para almacenar el saldo deudor actual
let saldoDeudorActual = 0;
let expedientesActuales = [];
// Estado del selector de cuotas del modal de Pago
let valorCuotaPagoActual = 0;
let maxCuotasPago = 0;

document.getElementById('btnAbrirModalPago').onclick = () => {
    if (saldoDeudorActual <= 0) {
        Alertas.mensaje('Sin deuda pendiente', 'Este cliente no tiene saldo deudor. No se puede registrar un pago.', 'warning');
        return;
    }
    // Cargar honorarios disponibles en el select
    const select = document.getElementById('honorarioDestino');
    select.innerHTML = '<option value="">Seleccionar honorario...</option>' +
        expedientesActuales.map(exp => `<option value="${escapeHtml(exp.id)}">${escapeHtml(exp.descripcion || 'Sin descripción')} — $ ${fmt(exp.honorarios_totales)}</option>`).join('');
    document.getElementById('fechaPago').value = new Date().toISOString().split('T')[0];
    document.getElementById('montoPago').value = '';
    resetearCuotasPago();
    abrirModal('modalPago');
};

// --- SELECTOR DE CUOTAS DEL MODAL DE PAGO ---
// Al elegir un honorario, calculamos el valor de cada cuota y cuántas cuotas
// entran dentro del saldo deudor pendiente.
document.getElementById('honorarioDestino').addEventListener('change', () => {
    resetearCuotasPago();
    const exp = expedientesActuales.find(e => String(e.id) === document.getElementById('honorarioDestino').value);
    const hint = document.getElementById('cuotasPagoHint');
    if (!exp) {
        hint.textContent = 'Elegí un honorario para calcular el valor de cada cuota.';
        return;
    }
    const total = parseFloat(exp.honorarios_totales) || 0;
    const cuotasTot = parseInt(exp.cuotas_totales) || 1;
    valorCuotaPagoActual = cuotasTot > 0 ? total / cuotasTot : total;
    // Cuántas cuotas caben dentro del saldo deudor (la última puede ser parcial)
    maxCuotasPago = valorCuotaPagoActual > 0 ? Math.ceil(saldoDeudorActual / valorCuotaPagoActual) : 0;
    hint.textContent = `Valor de cuota: $ ${fmt(valorCuotaPagoActual)} · Podés cubrir hasta ${maxCuotasPago} cuota(s) con el saldo actual.`;
});

function resetearCuotasPago() {
    valorCuotaPagoActual = 0;
    maxCuotasPago = 0;
    document.getElementById('cuotasPago').value = 0;
    document.getElementById('cuotasPagoHint').textContent = 'Elegí un honorario para calcular el valor de cada cuota.';
}

function actualizarMontoDesdeCuotas() {
    const cuotas = parseInt(document.getElementById('cuotasPago').value) || 0;
    const inputMonto = document.getElementById('montoPago');
    if (cuotas <= 0 || valorCuotaPagoActual <= 0) {
        inputMonto.value = '';
        return;
    }
    // No permitimos que el auto-cálculo supere el saldo deudor (la última cuota se recorta)
    const monto = Math.min(Math.round(valorCuotaPagoActual * cuotas), Math.round(saldoDeudorActual));
    inputMonto.value = new Intl.NumberFormat('es-AR').format(monto);
}

document.getElementById('btnSumarCuotaPago').onclick = () => {
    if (valorCuotaPagoActual <= 0) return; // Necesita un honorario elegido
    const input = document.getElementById('cuotasPago');
    let valor = parseInt(input.value) || 0;
    if (valor < maxCuotasPago) {
        input.value = valor + 1;
        actualizarMontoDesdeCuotas();
    }
};

document.getElementById('btnRestarCuotaPago').onclick = () => {
    const input = document.getElementById('cuotasPago');
    let valor = parseInt(input.value) || 0;
    if (valor > 0) {
        input.value = valor - 1;
        actualizarMontoDesdeCuotas();
    }
};
document.getElementById('btnAbrirModalDeuda').onclick = () => abrirModal('modalDeuda');
// LÓGICA DE LOS BOTONES + Y - PARA LAS CUOTAS
document.getElementById('btnSumarCuota').onclick = () => {
    const input = document.getElementById('cantidadCuotas');
    let valor = parseInt(input.value) || 1;
    if (valor < 36) input.value = valor + 1; // Tope máximo de 36 cuotas
};

document.getElementById('btnRestarCuota').onclick = () => {
    const input = document.getElementById('cantidadCuotas');
    let valor = parseInt(input.value) || 1;
    if (valor > 1) input.value = valor - 1; // Tope mínimo de 1 cuota
};

// FORMATEADOR DE MILES EN TIEMPO REAL
function formatMonedaInput(e) {
    let rawValue = e.target.value.replace(/\D/g, ''); // Deja solo los números puros
    if (rawValue === '') {
        e.target.value = '';
        return;
    }
    const numero = parseInt(rawValue, 10);
    e.target.value = new Intl.NumberFormat('es-AR').format(numero); // Aplica el punto .
}

document.getElementById('montoPago').addEventListener('input', formatMonedaInput);
document.getElementById('montoDeuda').addEventListener('input', formatMonedaInput);

// Si el usuario escribe un monto libre, deseleccionamos el contador de cuotas
document.getElementById('montoPago').addEventListener('input', () => {
    document.getElementById('cuotasPago').value = 0;
});

// ENVÍO DE PAGO
document.getElementById('formPago').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = e.target.querySelector('button[type="submit"]');

    const montoRaw = document.getElementById('montoPago').value.replace(/\./g, '');
    const honorarioId = document.getElementById('honorarioDestino').value;
    const montoNum = parseFloat(montoRaw) || 0;

    // Validación 1: el monto debe ser un número positivo
    if (montoNum <= 0) {
        Alertas.mensaje('Monto inválido', 'Ingresá un monto de pago mayor a cero.', 'warning');
        return;
    }

    // Validación 2: no se puede pagar más que el saldo deudor pendiente
    if (montoNum > Math.round(saldoDeudorActual)) {
        Alertas.mensaje('Pago superior a la deuda', `El pago no puede superar el saldo deudor de $ ${fmt(saldoDeudorActual)}.`, 'warning');
        return;
    }

    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Guardando...';

    const guardado = await fetchPost('/api/pagos', {
        cliente_id: clienteId,
        expediente_id: honorarioId || null,
        monto: montoRaw,
        metodo_pago: document.getElementById('metodoPago').value,
        fecha_pago: document.getElementById('fechaPago').value
    }, "Pago registrado correctamente");

    // Si falló, el modal queda abierto con los datos para corregirlos
    if (guardado) {
        cerrarModal('modalPago');
        document.getElementById('formPago').reset();
    }
    btnSubmit.disabled = false;
    btnSubmit.textContent = 'Guardar Pago';
    cargarTodo();
});

// ENVÍO DE DEUDA (Le mandamos a Juan la cantidad de cuotas)
document.getElementById('formDeuda').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = e.target.querySelector('button[type="submit"]');
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Guardando...';

    const montoRaw = document.getElementById('montoDeuda').value.replace(/\./g, ''); // Quita los puntos antes de enviar
    const guardado = await fetchPost('/api/expedientes', {
        cliente_id: clienteId,
        descripcion: document.getElementById('descripcionDeuda').value,
        honorarios_totales: montoRaw,
        cuotas_totales: document.getElementById('cantidadCuotas').value
    }, "Honorario agregado al sistema");

    if (guardado) {
        cerrarModal('modalDeuda');
        document.getElementById('formDeuda').reset();
    }
    btnSubmit.disabled = false;
    btnSubmit.textContent = 'Agregar Deuda';
    cargarTodo();
});

// FUNCIONES DE API Y CARGA
// Devuelven true si la operación salió bien; si no, muestran el error.
async function fetchPost(ruta, body, mensajeExito) {
    try {
        const res = await apiFetch(ruta, { method: 'POST', body });
        if (!res.ok) {
            Alertas.mensaje('Error', await mensajeDeError(res, 'Error al guardar'), 'error');
            return false;
        }
        if (mensajeExito) Alertas.toast(mensajeExito);
        return true;
    } catch (error) {
        Alertas.mensaje('Conexión fallida', 'Error al conectar con el servidor', 'error');
        return false;
    }
}

async function fetchDelete(ruta) {
    try {
        const res = await apiFetch(ruta, { method: 'DELETE' });
        if (!res.ok) Alertas.mensaje('Error', await mensajeDeError(res, 'No se pudo eliminar'), 'error');
        return res.ok;
    } catch (error) {
        Alertas.toast('Error de conexión', 'error');
        return false;
    }
}

async function cargarTodo() {
    try {
        const [resC, resS, resP, resE, resN, resT] = await Promise.all([
            apiFetch(`/api/clientes/${clienteId}`),
            apiFetch(`/api/clientes/${clienteId}/saldo`),
            apiFetch(`/api/pagos/cliente/${clienteId}`),
            apiFetch(`/api/expedientes/cliente/${clienteId}`),
            apiFetch(`/api/notas/cliente/${clienteId}`),
            apiFetch(`/api/turnos/cliente/${clienteId}`)
        ]);

        // 1. Datos del Cliente
        const c = await resC.json();
        document.getElementById('tituloCliente').textContent = c.nombre_completo;
        document.getElementById('infoCliente').innerHTML = `
            <div class="info-campo"><label>DNI</label><p>${c.dni ? escapeHtml(String(c.dni).replace(/\B(?=(\d{3})+(?!\d))/g, ".")) : '-'}</p></div>
            <div class="info-campo"><label>Teléfono</label><p>${escapeHtml(c.telefono || '—')}</p></div>
            <div class="info-campo"><label>Email</label><p>${escapeHtml(c.email || '—')}</p></div>
        `;

        // 2. Saldos y Pagos
        const s = await resS.json();
        saldoDeudorActual = parseFloat(s.saldo_deudor) || 0;
        document.getElementById('saldoDeudor').textContent = '$ ' + fmt(s.saldo_deudor || 0);

        const pagos = await resP.json();
        const totalPagado = pagos.reduce((sum, p) => sum + parseFloat(p.monto), 0);
        document.getElementById('totalPagado').textContent = '$ ' + fmt(totalPagado);

        const tbody = document.getElementById('tbodyPagos');
        tbody.innerHTML = pagos.length === 0
            ? '<tr><td colspan="3" class="estado-vacio">No hay pagos registrados aún.</td></tr>'
            : pagos.map(p => `<tr>
                <td data-label="Fecha">${fmtFecha(p.fecha_pago)}</td>
                <td data-label="Monto"><strong>$ ${fmt(p.monto)}</strong></td>
                <td data-label="Método">${escapeHtml(p.metodo_pago || '—')}</td>
              </tr>`).join('');

        const exps = await resE.json();
        expedientesActuales = exps;
        const totalHon = exps.reduce((sum, e) => sum + parseFloat(e.honorarios_totales), 0);
        document.getElementById('totalHonorarios').textContent = '$ ' + fmt(totalHon);

        document.getElementById('listaExpedientes').innerHTML = exps.length === 0
            ? '<p class="estado-vacio">No hay honorarios cargados. Usá "+ Agregar Deuda".</p>'
            : exps.map(exp => `
                <div class="expediente-item">
                    <div class="expediente-info">
                        <strong>${escapeHtml(exp.descripcion || 'Sin descripción')}</strong>
                        <p>Cargado el ${escapeHtml(fmtFechaHora(exp.creado_en))}</p>
                    </div>
                    <span class="expediente-monto">$ ${fmt(exp.honorarios_totales)}</span>
                    <button class="btn-eliminar-chico" style="display:inline-flex; align-items:center; justify-content:center; border:none; background:none; color:#ef4444; cursor:pointer;" onclick="eliminarExpediente(${Number(exp.id)})" title="Eliminar"><span class="material-symbols-outlined" style="font-size:18px;">delete</span></button>
                </div>`).join('');

        // 3. ACTUALIZACIÓN AUTOMÁTICA DE LA TARJETA DE CUOTAS
        const uiCuotas = document.getElementById('estadoCuotasUI');
        const uiValorBase = document.getElementById('valorCuotaEstimado');
        const rowRestante = document.getElementById('rowRestanteCuota');
        const labelRestante = document.getElementById('labelRestanteCuota');
        const valorRestante = document.getElementById('valorRestanteCuota');
        const barraProgreso = document.getElementById('barraProgresoFinanzas');
        const porcentajeTexto = document.getElementById('porcentajeProgresoTexto');

        if (totalHon === 0) {
            uiCuotas.innerHTML = '<span class="material-symbols-outlined" style="font-size: 18px; vertical-align: text-bottom;">info</span> <strong>Sin plan activo</strong>';
            uiValorBase.textContent = '—';
            rowRestante.style.display = 'none';
            barraProgreso.style.width = '0%';
            porcentajeTexto.textContent = '0%';
        } else if (s.saldo_deudor <= 0) {
            uiCuotas.innerHTML = '<span class="material-symbols-outlined" style="font-size: 18px; vertical-align: text-bottom;">task_alt</span> <strong>Plan Cancelado al 100%</strong>';
            uiCuotas.style.color = '#10b981';
            uiValorBase.textContent = 'Completado';
            rowRestante.style.display = 'none';
            barraProgreso.style.width = '100%';
            porcentajeTexto.textContent = '100%';
        } else {
            // Lógica de "Cuota X de Y" y pagos parciales
            const planActivo = exps[exps.length - 1] || exps[0]; 
            let totalCuotas = planActivo && planActivo.cuotas_totales ? parseInt(planActivo.cuotas_totales) : 1;
            
            const valorCuotaIdeal = totalHon / totalCuotas;
            
            // Cálculo de en qué cuota vamos
            let cuotaActual = Math.floor(totalPagado / valorCuotaIdeal) + 1;
            if (cuotaActual > totalCuotas) cuotaActual = totalCuotas;
            
            const pagadoHaciaCuotaActual = totalPagado % valorCuotaIdeal;
            const restanteParaCuotaActual = valorCuotaIdeal - pagadoHaciaCuotaActual;

            uiCuotas.innerHTML = `<strong>Cuota ${cuotaActual} de ${totalCuotas}</strong>`;
            uiValorBase.textContent = '$ ' + fmt(valorCuotaIdeal);

            if (pagadoHaciaCuotaActual > 0 && cuotaActual <= totalCuotas) {
                rowRestante.style.display = 'flex';
                labelRestante.textContent = `Falta para cubrir Cuota ${cuotaActual}:`;
                valorRestante.textContent = '$ ' + fmt(restanteParaCuotaActual);
            } else {
                rowRestante.style.display = 'none';
            }

            // Actualizar barra de progreso
            const porcentaje = Math.min(100, Math.round((totalPagado / totalHon) * 100));
            barraProgreso.style.width = `${porcentaje}%`;
            porcentajeTexto.textContent = `${porcentaje}%`;
        }

        // Resto de la carga (Notas y Timeline)
        const notas = await resN.json();
        renderizarNotas(notas);

        const turnos = await resT.json();
        const timeline = [];
        pagos.forEach(p => timeline.push({ fecha: p.fecha_pago, icono: 'payments', titulo: 'Pago recibido: ' + (p.metodo_pago || ''), monto: p.monto, color: '#10b981' }));
        exps.forEach(e => timeline.push({ fecha: e.creado_en.split('T')[0], icono: 'description', titulo: 'Honorario: ' + (e.descripcion || ''), monto: e.honorarios_totales, color: '#ef4444' }));
        turnos.forEach(t => timeline.push({ fecha: t.fecha, icono: 'calendar_month', titulo: 'Turno: ' + (t.tipo_evento || t.motivo), monto: null, color: '#3b82f6' }));

        timeline.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        document.getElementById('listaHistorial').innerHTML = timeline.length === 0
            ? '<li class="estado-vacio">No hay historial para este cliente.</li>'
            : timeline.map(item => `
                <li class="nota-item" style="border-left-color: ${item.color}">
                    <div style="margin-right: 10px;"><span class="material-symbols-outlined" style="color:${item.color}">${item.icono}</span></div>
                    <div class="nota-contenido">
                        <p><strong>${escapeHtml(item.titulo)}</strong></p>
                        <div class="nota-fecha">${escapeHtml(fmtFecha(item.fecha))}</div>
                    </div>
                    ${item.monto !== null ? `<div style="font-size: 1.1rem; font-weight: bold; color: ${item.color};">$ ${fmt(item.monto)}</div>` : ''}
                </li>
            `).join('');

    } catch (err) { console.error('Error cargando datos:', err); }
}

// --- FUNCIONES SECUNDARIAS (Notas, Eliminar, Formateo) ---
function renderizarNotas(notas) {
    const hoy = new Date();
    document.getElementById('listaNota').innerHTML = notas.length === 0
        ? '<li class="estado-vacio">No hay notas todavía.</li>'
        : notas.map(n => {
            const vencida = n.fecha_vencimiento && new Date(n.fecha_vencimiento + 'T00:00:00') < hoy && n.estado !== 'completado';
            return `
            <li class="nota-item" style="${n.estado === 'completado' ? 'opacity:0.6;' : ''}">
                <div class="nota-contenido">
                    <p>${escapeHtml(n.contenido)}</p>
                    <div class="nota-fecha">
                        Creado: ${escapeHtml(fmtFechaHora(n.creado_en))}
                        ${n.fecha_vencimiento ? `<br><span class="material-symbols-outlined" style="font-size:14px; vertical-align:middle; color:${vencida ? '#ef4444' : '#f59e0b'}">warning</span> Vence: <strong style="${vencida ? 'color:#ef4444;' : 'color:#f59e0b;'}">${escapeHtml(fmtFecha(n.fecha_vencimiento))}</strong>` : ''}
                    </div>
                </div>
                <div style="display:flex; flex-direction:column; gap:6px;">
                    ${n.estado !== 'completado' ? `<button class="btn-eliminar-chico" style="color:#10b981;" onclick="completarNota(${Number(n.id)})"><span class="material-symbols-outlined">check_circle</span></button>` : `<span class="material-symbols-outlined" style="color:#10b981;">task_alt</span>`}
                    <button class="btn-eliminar-chico" onclick="eliminarNota(${Number(n.id)})"><span class="material-symbols-outlined">delete</span></button>
                </div>
            </li>`;
        }).join('');
}

async function agregarNota() {
    const ta = document.getElementById('nuevaNota');
    const dateInput = document.getElementById('fechaVencimientoNota');
    if (!ta.value.trim()) return ta.focus();
    const payload = { cliente_id: clienteId, contenido: ta.value.trim() };
    if (dateInput && dateInput.value) payload.fecha_vencimiento = dateInput.value;
    await fetchPost('/api/notas', payload, null);
    ta.value = ''; if (dateInput) dateInput.value = '';
    cargarTodo();
}

async function completarNota(id) {
    try {
        await apiFetch(`/api/notas/${id}/estado`, { method: 'PUT', body: { estado: 'completado' } });
        cargarTodo();
    } catch (error) { Alertas.toast('No se pudo completar la nota', 'error'); }
}

async function eliminarNota(id) {
    if (await Alertas.confirmar('¿Eliminar nota?', 'Esta acción no se puede deshacer.', 'Sí, eliminar')) {
        await fetchDelete(`/api/notas/${id}`);
        cargarTodo();
    }
}

async function eliminarExpediente(id) {
    if (await Alertas.confirmar('¿Eliminar honorario?', 'Afectará el saldo del cliente.', 'Sí, eliminar')) {
        await fetchDelete(`/api/expedientes/${id}`);
        cargarTodo();
    }
}

function fmt(n) { return new Intl.NumberFormat('es-AR').format(parseFloat(n) || 0); }
function fmtFecha(str) {
    if (!str) return '—';
    const cleanStr = str.includes('T') ? str.split('T')[0] : str;
    const d = new Date(cleanStr + 'T00:00:00');
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-AR');
}
function fmtFechaHora(str) { return new Date(str).toLocaleString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }

// ELIMINAR CLIENTE
document.getElementById('btnEliminarCliente').onclick = async () => {
    const confirmado = await Alertas.confirmar(
        '¿Eliminar este cliente?',
        'Se borrarán todos sus datos, pagos, notas y honorarios. Esta acción no se puede deshacer.',
        'Sí, eliminar definitivamente'
    );
    if (!confirmado) return;

    if (await fetchDelete(`/api/clientes/${clienteId}`)) {
        Alertas.toast('Cliente eliminado. Volviendo al listado...');
        setTimeout(() => { window.location.href = 'clientes.html'; }, 1500);
    }
};

document.addEventListener('DOMContentLoaded', cargarTodo);
