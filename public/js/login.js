// public/js/login.js

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Evita que la página se recargue al tocar el botón

        // Capturamos los valores que escribió el usuario
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            // El machete de Juan: Hacemos el POST a la API
            const respuesta = await fetch('http://localhost:3000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await respuesta.json();

            if (respuesta.ok) {
                // Si todo sale bien, guardamos la "llave" en el navegador
                localStorage.setItem('estudio_token', data.token);
                // Guardamos el ID del usuario dinámicamente
                localStorage.setItem('usuario_id', data.usuario.id);
                localStorage.setItem('usuario_nombre', data.usuario.nombre);
                
                // Redirigimos al panel principal
                window.location.href = 'dashboard.html';
            } else {
                // Si la contraseña está mal, mostramos el error
                alert(data.error || "Credenciales inválidas");
            }
        } catch (error) {
            console.error("Error de conexión:", error);
            alert("Error al conectar con el servidor. ¿Está encendido?");
        }
    });
});