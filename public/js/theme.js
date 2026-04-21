// public/js/theme.js
document.addEventListener('DOMContentLoaded', () => {
    // Inject the button into the navbar if it exists
    const navUl = document.querySelector('.navbar ul');
    if (navUl) {
        const li = document.createElement('li');
        li.style.marginTop = 'auto'; // push to bottom, since other item has margin-top: 20px
        li.innerHTML = `<button class="theme-toggle-btn" onclick="toggleTheme()">
            <span class="material-symbols-outlined" id="themeIcon">dark_mode</span>
            <span id="themeText">Modo Oscuro</span>
        </button>`;
        navUl.appendChild(li);
    }
    
    actualizarBoton();
});

function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    actualizarBoton();
}

function actualizarBoton() {
    const isDark = document.body.classList.contains('dark-mode');
    const icon = document.getElementById('themeIcon');
    const text = document.getElementById('themeText');
    if (icon && text) {
        icon.textContent = isDark ? 'light_mode' : 'dark_mode';
        text.textContent = isDark ? 'Modo Claro' : 'Modo Oscuro';
    }
}

// Ejecutar inmediatamente para evitar FOUC
(function() {
    if (localStorage.getItem('theme') === 'dark') {
        document.addEventListener('DOMContentLoaded', () => {
            document.body.classList.add('dark-mode');
            actualizarBoton();
        });
        // Si el body ya existe (raro si está en el head), aplicamos de una
        if (document.body) {
            document.body.classList.add('dark-mode');
        }
    }
})();
