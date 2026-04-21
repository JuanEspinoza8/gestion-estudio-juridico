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
            <span class="estado-badge ${c.estado}">${c.estado}</span>
        </li>
    `).join('');
}

async function seleccionarExpediente(id, element) {
    // UI Activo
    document.querySelectorAll('.item-exp').forEach(el => el.classList.remove('activo'));
    if (element) element.classList.add('activo');

    // Buscar en el array
    expedienteSeleccionado = expedientesActuales.find(c => c.id === id);
    if (!expedienteSeleccionado) return;

    // Llenar datos
    document.getElementById('detCaratula').textContent = expedienteSeleccionado.caratula;
    document.getElementById('detEstado').textContent = expedienteSeleccionado.estado;
    document.getElementById('detEstado').className = `estado-badge ${expedienteSeleccionado.estado}`;
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
    const datos = {
        cliente_id: document.getElementById('clienteId').value,
        caratula: document.getElementById('caratula').value,
        nro_expediente: document.getElementById('nroExpediente').value,
        juzgado: document.getElementById('juzgado').value,
        estado: document.getElementById('estado').value
    };

    try {
        const res = await fetch(`${API}/api/causas`, {
            method: 'POST',
            headers,
            body: JSON.stringify(datos)
        });

        if (res.ok) {
            cerrarModal();
            document.getElementById('formNuevoExp').reset();
            cargarExpedientes();
        } else {
            alert('Error al guardar el expediente');
        }
    } catch (error) {
        console.error('Error:', error);
    }
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
        alert('Por favor, subí únicamente archivos PDF.');
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
            alert('Error al subir: ' + (err.error || 'Desconocido'));
        }
    } catch (error) {
        console.error('Error al subir documento:', error);
        alert('Error de red al intentar subir el archivo.');
    } finally {
        // Restaurar UX
        e.target.value = '';
        document.getElementById('dropzoneLabel').style.display = 'block';
        document.getElementById('uploadProgress').style.display = 'none';
    }
}

// Modal functions
function abrirModal() { document.getElementById('modalNuevoExp').style.display = 'flex'; }
function cerrarModal() { document.getElementById('modalNuevoExp').style.display = 'none'; }
function cerrarSesion() { localStorage.clear(); window.location.href = 'login.html'; }
