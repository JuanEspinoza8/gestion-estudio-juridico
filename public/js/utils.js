/* =========================================
   MÓDULO DE ALERTAS Y NOTIFICACIONES (SweetAlert2)
   ========================================= */

const Alertas = {
    // 1. Notificación tipo "Toast" (Aparece arriba a la derecha y se va sola)
    toast: (mensaje, icono = 'success') => {
        const isDark = document.body.classList.contains('dark-mode');
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            background: isDark ? '#1e293b' : '#fff',
            color: isDark ? '#f8fafc' : '#1e293b',
            didOpen: (toast) => {
                toast.addEventListener('mouseenter', Swal.stopTimer)
                toast.addEventListener('mouseleave', Swal.resumeTimer)
            }
        });
        Toast.fire({ icon: icono, title: mensaje });
    },

    // 2. Alerta de Éxito o Error (Grande, con botón de OK)
    mensaje: (titulo, texto, icono = 'success') => {
        const isDark = document.body.classList.contains('dark-mode');
        Swal.fire({
            title: titulo,
            text: texto,
            icon: icono,
            background: isDark ? '#1e293b' : '#fff',
            color: isDark ? '#f8fafc' : '#1e293b',
            confirmButtonColor: '#3b82f6',
            confirmButtonText: 'Entendido'
        });
    },

    // 3. Confirmación de Acción (Para borrar cosas)
    confirmar: async (titulo, texto, botonConfirmar = 'Sí, borrar') => {
        const isDark = document.body.classList.contains('dark-mode');
        const resultado = await Swal.fire({
            title: titulo,
            text: texto,
            icon: 'warning',
            showCancelButton: true,
            background: isDark ? '#1e293b' : '#fff',
            color: isDark ? '#f8fafc' : '#1e293b',
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: botonConfirmar,
            cancelButtonText: 'Cancelar',
            reverseButtons: true
        });
        return resultado.isConfirmed;
    }
};