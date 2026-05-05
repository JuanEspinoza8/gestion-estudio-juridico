// public/js/login.js

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.querySelector('form');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // --- 1. INICIO DEL EFECTO DE CARGA ---
        const btnSubmit = loginForm.querySelector('button[type="submit"]');
        const textoOriginal = btnSubmit.innerHTML;

        btnSubmit.classList.add('btn-loading');
        btnSubmit.innerHTML = '<span class="material-symbols-outlined spin-anim" style="font-size: 20px;">sync</span> Verificando...';
        // -------------------------------------

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const respuesta = await fetch('https://api-estudio-juridico-oma1.onrender.com/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await respuesta.json();

            if (respuesta.ok) {
                localStorage.setItem('estudio_token', data.token);
                localStorage.setItem('usuario_id', data.usuario.id);
                localStorage.setItem('usuario_nombre', data.usuario.nombre);

                window.location.href = 'dashboard.html';
            } else {
                // --- ALERTA MODERNA: CREDENCIALES INVÁLIDAS ---
                Swal.fire({
                    icon: 'error',
                    title: 'Acceso Denegado',
                    text: data.error || "Credenciales inválidas. Intente nuevamente.",
                    background: '#1e293b', // Fondo oscuro
                    color: '#f8fafc', // Letra blanca
                    confirmButtonColor: '#3b82f6', // Botón azul
                    customClass: {
                        popup: 'swal-premium' // Clase por si luego quiere darle más estilos
                    }
                });

                btnSubmit.classList.remove('btn-loading');
                btnSubmit.innerHTML = textoOriginal;
            }
        } catch (error) {
            console.error("Error de conexión:", error);

            // --- ALERTA MODERNA: ERROR DE SERVIDOR ---
            Swal.fire({
                icon: 'warning',
                title: 'Error de Conexión',
                text: 'No se pudo contactar con el servidor. Verifique su conexión.',
                background: '#1e293b',
                color: '#f8fafc',
                confirmButtonColor: '#3b82f6'
            });

            btnSubmit.classList.remove('btn-loading');
            btnSubmit.innerHTML = textoOriginal;
        }
    });
});