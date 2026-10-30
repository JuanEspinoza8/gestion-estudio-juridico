// Subir la versión cada vez que cambia ASSETS_TO_CACHE: así se descarta la caché vieja
const CACHE_NAME = 'estudio-juridico-v2';
const ASSETS_TO_CACHE = [
    './',
    './login.html',
    './dashboard.html',
    './clientes.html',
    './agenda.html',
    './expedientes.html',
    './cuenta.html',
    './favicon.svg',
    './icon-192.png',
    './icon-512.png',
    './css/login.css',
    './css/dashboard.css',
    './css/clientes.css',
    './css/agenda.css',
    './js/login.js',
    './js/utils.js',
    './js/dashboard.js',
    './js/clientes.js',
    './js/agenda.js',
    './js/expedientes.js',
    './js/theme.js'
];

// Instalar Service Worker y almacenar recursos iniciales.
// Se cachea archivo por archivo: con cache.addAll, si faltaba uno solo no se
// guardaba ninguno.
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache =>
            Promise.allSettled(ASSETS_TO_CACHE.map(url => cache.add(url))).then(resultados => {
                resultados.forEach((r, i) => {
                    if (r.status === 'rejected') console.log('No se pudo cachear', ASSETS_TO_CACHE[i], r.reason);
                });
            })
        )
    );
    self.skipWaiting();
});

// Activar y limpiar cachés antiguos
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Interceptar peticiones (Estrategia: Network First, falling back to cache)
// Esto asegura que la app siempre cargue la última versión si hay internet,
// pero carga desde caché si el dispositivo está offline.
self.addEventListener('fetch', event => {
    // Solo cacheamos GET requests (ignoramos POST a la API, etc)
    if (event.request.method !== 'GET') return;

    // Nunca cacheamos la API (local o en Render): son datos de clientes
    const url = new URL(event.request.url);
    if (!url.protocol.startsWith('http') || url.pathname.startsWith('/api/')) return;

    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Si la red responde bien, guardamos en caché una copia fresquita
                if (response.ok) {
                    const resClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, resClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // Si falla la red (offline), servimos desde caché
                return caches.match(event.request).then(response => {
                    return response || caches.match('./dashboard.html');
                });
            })
    );
});
