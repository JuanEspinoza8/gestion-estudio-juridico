const API = 'https://api-estudio-juridico-oma1.onrender.com';
const token = localStorage.getItem('estudio_token');

if (!token) {
    window.location.href = 'login.html';
}

const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
};

let expedientesActuales = [];
let expedienteSeleccionado = null;

document.addEventListener('DOMContentLoaded', () => {
    cargarExpedientes();
    cargarClientesEnSelect();

    document.getElementById('formNuevoExp').addEventListener('submit', guardarExpediente);
    document.getElementById('fileInput').addEventListener('change', subirDocumento);
});

async function cargarExpedientes() {
    try {
        const res = await fetch(`${API}/api/causas`, { headers });
        const causas = await res.json();
        expedientesActuales = causas;
        renderizarLista(causas);
    } catch (error) {
        console.error('Error al cargar expedientes:', error);
    }
}

async function cargarClientesEnSelect() {
    try {
        const res = await fetch(`${API}/api/clientes`, { headers });
        const clientes = await res.json();
        const select = document.getElementById('clienteId');
        select.innerHTML = '<option value="">Seleccionar cliente...</option>' + 
            clientes.map(c => `<option value="${c.id}">${c.nombre_completo}</option>`).join('');
    } catch (error) {
        console.error('Error al cargar clientes:', error);
    }
}

function renderizarLista(causas) {
    const lista = document.getElementById('listaExpedientes');
    if (causas.length === 0) {
        lista.innerHTML = '<p style="padding:15px; color:#64748b; text-align:center;">No hay expedientes registrados.</p>';
        return;
    }

    lista.innerHTML = causas.map(c => `
        <li class="item-exp" onclick="seleccionarExpediente(${c.id}, this)">
            <strong>${c.caratula}</strong>
            <span>Nro: ${c.nro_expediente} | ${c.cliente_nombre}</span>
            <span class="estado-badge" style="${getEstiloEstado(c.estado)}">${c.estado}</span>
        </li>
    `).join('');
}

function getEstiloEstado(estado) {
    const e = (estado || '').toLowerCase();
    if (e.includes('iniciada') || e.includes('investigación') || e === 'iniciado') return 'background: #dbeafe; color: #1e3a8a;'; // Azul
    if (e.includes('mediación') || e.includes('indagatoria') || e.includes('imputación')) return 'background: #e0e7ff; color: #3730a3;'; // Indigo
    if (e.includes('prueba') || e.includes('juicio')) return 'background: #fef3c7; color: #92400e;'; // Naranja
    if (e.includes('alegato') || e.includes('elevación')) return 'background: #fef08a; color: #854d0e;'; // Amarillo
    if (e.includes('sentencia')) return 'background: #d1fae5; color: #065f46;'; // Verde claro
    if (e.includes('apelación') || e.includes('casación')) return 'background: #fee2e2; color: #b91c1c;'; // Rojo claro
    if (e.includes('ejecución')) return 'background: #fae8ff; color: #86198f;'; // Rosa
    if (e.includes('cerrado')) return 'background: #f1f5f9; color: #475569;'; // Gris
    return 'background: #e2e8f0; color: #475569;'; // Por defecto
}

async function seleccionarExpediente(id, element) {
    // UI Activo
    document.querySelectorAll('.item-exp').forEach(el => el.classList.remove('activo'));
    if (element) element.classList.add('activo');

    // Buscar en el array
    expedienteSeleccionado = expedientesActuales.find(c => String(c.id) === String(id));
    if (!expedienteSeleccionado) return;

    // Llenar datos
    document.getElementById('detCaratula').textContent = expedienteSeleccionado.caratula;
    document.getElementById('detEstado').textContent = expedienteSeleccionado.estado;
    document.getElementById('detEstado').className = 'estado-badge';
    document.getElementById('detEstado').style = getEstiloEstado(expedienteSeleccionado.estado);
    document.getElementById('detNro').textContent = expedienteSeleccionado.nro_expediente;
    document.getElementById('detCliente').textContent = expedienteSeleccionado.cliente_nombre;
    document.getElementById('detJuzgado').textContent = expedienteSeleccionado.juzgado;

    // Mostrar detalle
    document.getElementById('estadoVacioDetalle').style.display = 'none';
    document.getElementById('contenidoDetalle').style.display = 'block';

    // Cargar Documentos (Llamar a API)
    cargarDocumentos(id);
}

async function guardarExpediente(e) {
    e.preventDefault();
    const estadoSel = document.getElementById('estado').value;
    const estadoReal = estadoSel === 'Otro' ? (document.getElementById('estadoOtro').value || 'Otro') : estadoSel;

    const datos = {
        cliente_id: document.getElementById('clienteId').value,
        caratula: document.getElementById('caratula').value,
        nro_expediente: document.getElementById('nroExpediente').value,
        juzgado: document.getElementById('juzgado').value,
        estado: estadoReal
    };

    const idEdit = document.getElementById('expedienteIdForm').value;
    const url = idEdit ? `${API}/api/causas/${idEdit}` : `${API}/api/causas`;
    const method = idEdit ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method,
            headers,
            body: JSON.stringify(datos)
        });

        if (res.ok) {
            cerrarModal();
            document.getElementById('formNuevoExp').reset();
            if (idEdit) {
                document.getElementById('estadoVacioDetalle').style.display = 'block';
                document.getElementById('contenidoDetalle').style.display = 'none';
            }
            cargarExpedientes();
        } else {
            Alertas.mensaje('Error', 'Error al guardar el expediente', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function eliminarExpediente() {
    if (!expedienteSeleccionado) return;
    const confirmado = await Alertas.confirmar('¿Eliminar expediente?', 'Esta acción borrará todos sus documentos.', 'Sí, eliminar');
    if (!confirmado) return;
    try {
        const res = await fetch(`${API}/api/causas/${expedienteSeleccionado.id}`, {
            method: 'DELETE',
            headers
        });
        if (res.ok) {
            document.getElementById('estadoVacioDetalle').style.display = 'block';
            document.getElementById('contenidoDetalle').style.display = 'none';
            cargarExpedientes();
        } else {
            Alertas.toast('Error al eliminar', 'error');
        }
    } catch (e) {
        Alertas.toast('Error de conexión', 'error');
    }
}

function editarExpediente() {
    if (!expedienteSeleccionado) return;
    document.getElementById('expedienteIdForm').value = expedienteSeleccionado.id;
    document.getElementById('clienteId').value = expedienteSeleccionado.cliente_id;
    document.getElementById('caratula').value = expedienteSeleccionado.caratula;
    document.getElementById('nroExpediente').value = expedienteSeleccionado.nro_expediente;
    document.getElementById('juzgado').value = expedienteSeleccionado.juzgado;
    
    const estadoSelect = document.getElementById('estado');
    const estadoVal = expedienteSeleccionado.estado;
    const opcionesValidas = Array.from(estadoSelect.options).map(opt => opt.value);

    if (opcionesValidas.includes(estadoVal) && estadoVal !== 'Otro') {
        estadoSelect.value = estadoVal;
        document.getElementById('estadoOtro').style.display = 'none';
        document.getElementById('estadoOtro').value = '';
    } else {
        estadoSelect.value = 'Otro';
        document.getElementById('estadoOtro').style.display = 'block';
        document.getElementById('estadoOtro').value = estadoVal;
    }
    
    document.querySelector('#modalNuevoExp h2').textContent = 'Editar Expediente';
    abrirModal();
}

function abrirModal() {
    if (!document.getElementById('expedienteIdForm').value) {
        document.querySelector('#modalNuevoExp h2').textContent = 'Nuevo Expediente';
        document.getElementById('estadoOtro').style.display = 'none';
    }
    document.getElementById('modalNuevoExp').style.display = 'flex';
}

function cerrarModal() {
    document.getElementById('modalNuevoExp').style.display = 'none';
    document.getElementById('formNuevoExp').reset();
    document.getElementById('expedienteIdForm').value = '';
}

// ==========================================
// Módulo de Documentos (Subida de PDFs)
// ==========================================

async function cargarDocumentos(causaId) {
    const listaDocs = document.getElementById('listaDocs');
    listaDocs.innerHTML = '<li style="color:#64748b; font-size:0.9rem;">Cargando documentos...</li>';
    
    try {
        const res = await fetch(`${API}/api/documentos/causa/${causaId}`, { headers });
        if (!res.ok) throw new Error('No implementado o error');
        const docs = await res.json();
        
        if (docs.length === 0) {
            listaDocs.innerHTML = '<li style="color:#64748b; font-size:0.9rem;">No hay documentos adjuntos.</li>';
        } else {
            listaDocs.innerHTML = docs.map(d => `
                <li class="doc-item">
                    <span class="material-symbols-outlined">picture_as_pdf</span>
                    <a href="${d.url_archivo}" target="_blank">${d.nombre_archivo}</a>
                    <span style="font-size:0.8rem; color:#94a3b8; margin-left:10px;">${new Date(d.subido_en).toLocaleDateString('es-AR')}</span>
                    <button class="btn-eliminar-chico" style="margin-left:auto; cursor:pointer; color:#ef4444; background:none; border:none; display:flex; align-items:center; justify-content:center;" onclick="eliminarDocumento(${d.id})" title="Eliminar archivo"><span class="material-symbols-outlined" style="font-size:18px;">close</span></button>
                </li>
            `).join('');
        }
    } catch (error) {
        listaDocs.innerHTML = '<li style="color:#64748b; font-size:0.9rem;">El módulo de documentos estará disponible pronto.</li>';
    }
}

async function subirDocumento(e) {
    const file = e.target.files[0];
    if (!file || !expedienteSeleccionado) return;
    
    if (file.type !== 'application/pdf') {
        Alertas.toast('Por favor, subí únicamente archivos PDF.', 'warning');
        e.target.value = '';
        return;
    }

    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('causa_id', expedienteSeleccionado.id);

    // UX: Mostrar progreso
    document.getElementById('dropzoneLabel').style.display = 'none';
    document.getElementById('uploadProgress').style.display = 'block';

    try {
        const res = await fetch(`${API}/api/documentos`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
                // NO incluir Content-Type, el navegador lo auto-asigna para form-data con el boundary
            },
            body: formData
        });

        if (res.ok) {
            // Recargar lista
            cargarDocumentos(expedienteSeleccionado.id);
        } else {
            const err = await res.json();
            Alertas.mensaje('Error', 'Error al subir: ' + (err.error || 'Desconocido'), 'error');
        }
    } catch (error) {
        console.error('Error al subir documento:', error);
        Alertas.toast('Error de red al intentar subir el archivo.', 'error');
    } finally {
        // Restaurar UX
        e.target.value = '';
        document.getElementById('dropzoneLabel').style.display = 'block';
        document.getElementById('uploadProgress').style.display = 'none';
    }
}


async function eliminarDocumento(id) {
    const confirmado = await Alertas.confirmar('¿Eliminar archivo?', 'Esta acción no se puede deshacer.', 'Sí, eliminar');
    if (!confirmado) return;
    try {
        const res = await fetch(`${API}/api/documentos/${id}`, {
            method: 'DELETE',
            headers
        });
        if (res.ok) {
            cargarDocumentos(expedienteSeleccionado.id);
        } else {
            Alertas.toast('Error al eliminar documento', 'error');
        }
    } catch (e) {
        Alertas.toast('Error de conexión al eliminar', 'error');
    }
}

// Modal functions (reemplazadas arriba)
function cerrarSesion() { localStorage.clear(); window.location.href = 'login.html'; }
