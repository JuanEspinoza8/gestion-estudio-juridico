// eslint.config.js
const js = require('@eslint/js');
const globals = require('globals');
const prettier = require('eslint-config-prettier/flat');

module.exports = [
    { ignores: ['node_modules/', 'coverage/', 'estudio-juridico-capturas/'] },

    js.configs.recommended,

    // Backend, scripts y tests: Node con CommonJS
    {
        files: ['**/*.js'],
        ignores: ['public/**'],
        languageOptions: {
            ecmaVersion: 2023,
            sourceType: 'commonjs',
            globals: globals.node
        },
        rules: {
            'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }]
        }
    },
    {
        files: ['tests/**/*.js'],
        languageOptions: { globals: globals.jest }
    },

    // Frontend: scripts clásicos del navegador (sin bundler) que comparten
    // funciones globales entre archivos y las usan desde onclick="..." en el HTML
    {
        files: ['public/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'script',
            globals: {
                ...globals.browser,
                // Librerías cargadas desde CDN
                Swal: 'readonly',
                FullCalendar: 'readonly',
                // config.js, api.js y utils.js
                API_URL: 'readonly',
                apiFetch: 'readonly',
                obtenerToken: 'readonly',
                requerirSesion: 'readonly',
                cerrarSesion: 'readonly',
                mensajeDeError: 'readonly',
                escapeHtml: 'readonly',
                normalizarTexto: 'readonly',
                soloDigitos: 'readonly',
                Alertas: 'readonly'
            }
        },
        rules: {
            // Las funciones de nivel superior son globales: se usan desde otros archivos o el HTML
            'no-unused-vars': ['error', { vars: 'local', args: 'none', caughtErrors: 'none' }],
            'no-redeclare': ['error', { builtinGlobals: false }]
        }
    },
    {
        files: ['public/service-worker.js'],
        languageOptions: { globals: globals.serviceworker }
    },

    // Desactiva las reglas de formato que se ocupan de Prettier
    prettier
];
