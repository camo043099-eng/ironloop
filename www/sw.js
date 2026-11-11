// Ironloop — service worker de la PWA.
// Estrategia: cache-first con actualización en segundo plano
// (stale-while-revalidate) para todo el contenido propio. La carcasa
// (HTML/CSS/JS/datos/iconos) se precachea al instalar; el media
// (media/img, media/vid) se cachea bajo demanda al verse por primera vez,
// para no descargar los ~28 MB de golpe. Sin red tras la primera carga.
// Para publicar cambios: subir VERSION (p. ej. ironloop-v2); el activate
// borra las cachés viejas y la siguiente visita toma lo nuevo.
const VERSION = 'ironloop-v1';
const CACHE = VERSION;

const CARCASA = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/estilos.css',
  'js/almacen.js',
  'js/app.js',
  'js/cuentas.js',
  'js/datos.js',
  'js/generador.js',
  'js/iconos.js',
  'js/sesion.js',
  'js/silueta.js',
  'js/voz.js',
  'data/ejercicios.json',
  'data/grupos.json',
  'data/guia.json',
  'data/lesiones.json',
  'data/mapa-media.json',
  'data/prescripcion.json',
  'data/salud.json',
  'data/voz.json',
  'icons-pwa/icon-192.png',
  'icons-pwa/icon-512.png',
  'icons-pwa/icon-512-maskable.png',
  'icons-pwa/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(CARCASA))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(claves => Promise.all(claves.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(enCache => {
      const deRed = fetch(e.request)
        .then(res => {
          if (res && res.status === 200) {
            const copia = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, copia));
          }
          return res;
        })
        .catch(() => {
          // Sin red: si es una navegación y no hay copia exacta, la carcasa.
          if (e.request.mode === 'navigate') return caches.match('index.html');
          return Response.error();
        });
      return enCache || deRed;
    })
  );
});
