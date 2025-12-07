const CACHE_NAME = 'tournoi-ultimate-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://raw.githubusercontent.com/Bdprof/Tournoi-Ultimate/refs/heads/main/Image%20Tournoi-ultimate.png',
  'https://raw.githubusercontent.com/Bdprof/Tournoi-Ultimate/refs/heads/main/Image%20page%20parametres%20tournoi%20Ultimate.png'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('✅ Service Worker en cours d\'installation...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('📦 Mise en cache des ressources...');
      return cache.addAll(ASSETS_TO_CACHE).catch((error) => {
        console.log('⚠️ Quelques ressources n\'ont pas pu être mises en cache:', error);
        // Ne pas échouer l'installation si certaines ressources externes ne sont pas disponibles
        return cache.add('./index.html');
      });
    })
  );
  self.skipWaiting();
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activé');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => {
            console.log('🗑️ Suppression de l\'ancien cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    })
  );
  self.clients.claim();
});

// Gestion des requêtes (Network First pour les données, Cache First pour les assets)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignorer les requêtes non-GET
  if (event.request.method !== 'GET') {
    return;
  }

  // Stratégie: Cache First pour les assets locaux
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request).then((response) => {
          // Mettre en cache les réponses réussies
          if (response.status === 200) {
            const cacheCopy = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, cacheCopy);
            });
          }
          return response;
        });
      }).catch(() => {
        // Fallback pour les ressources manquantes
        if (event.request.destination === 'image') {
          return caches.match('./index.html');
        }
        return caches.match('./index.html');
      })
    );
  } else {
    // Stratégie: Network First pour les ressources externes (CDN, images)
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 200) {
            const cacheCopy = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, cacheCopy);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((response) => {
            return response || new Response('Ressource non disponible', { status: 503 });
          });
        })
    );
  }
});

// Gestion des messages depuis l'app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'GET_CACHE_SIZE') {
    caches.open(CACHE_NAME).then((cache) => {
      cache.keys().then((keys) => {
        event.ports[0].postMessage({ size: keys.length });
      });
    });
  }
});

// Synchronisation en arrière-plan (optionnel)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(
      // Ici vous pouvez ajouter la logique de synchronisation
      Promise.resolve()
    );
  }
});

console.log('✅ Service Worker chargé et prêt');
