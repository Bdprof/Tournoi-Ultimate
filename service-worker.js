const CACHE_NAME = 'tournoi-ultimate-permanent'; // Cache persistant illimité
const STATIC_ASSETS = [
  './',
  './index.html'
];

const EXTERNAL_ASSETS = [
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://raw.githubusercontent.com/Bdprof/Tournoi-Ultimate/refs/heads/main/Image%20Tournoi-ultimate.png',
  'https://raw.githubusercontent.com/Bdprof/Tournoi-Ultimate/refs/heads/main/Image%20page%20parametres%20tournoi%20Ultimate.png'
];

// Installation - Mise en cache des assets statiques
self.addEventListener('install', (event) => {
  console.log('🔧 Installation du Service Worker');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('📦 Mise en cache des ressources statiques');
      return cache.addAll(STATIC_ASSETS).then(() => {
        // Mettre en cache les ressources externes en arrière-plan
        EXTERNAL_ASSETS.forEach(url => {
          cache.add(url).catch(err => console.log('⚠️ Impossible de cacher:', url));
        });
      });
    })
  );
  self.skipWaiting();
});

// Activation - Nettoyer les anciens caches (versionnés)
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activé');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith('tournoi-ultimate-') && cacheName !== CACHE_NAME)
          .map((cacheName) => {
            console.log('🗑️ Suppression ancien cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    })
  );
  self.clients.claim();
});

// Gestion des requêtes - Stratégie Cache First avec fallback Network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-GET
  if (request.method !== 'GET') {
    return;
  }

  // Pour les ressources locales: Cache First
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(request).then((response) => {
          if (response) {
            return response;
          }

          // Si pas en cache, essayer le réseau
          return fetch(request)
            .then((networkResponse) => {
              // Mettre en cache les réponses valides
              if (networkResponse && networkResponse.status === 200) {
                const clonedResponse = networkResponse.clone();
                cache.put(request, clonedResponse);
              }
              return networkResponse;
            })
            .catch(() => {
              // Si le réseau échoue, retourner la version en cache ou une réponse par défaut
              return cache.match(request) || caches.match('./index.html');
            });
        });
      })
    );
  } else {
    // Pour les ressources externes: Network First avec fallback Cache
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clonedResponse = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clonedResponse);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Retourner la version en cache si disponible
          return caches.match(request).then((cachedResponse) => {
            return cachedResponse || new Response('Ressource non disponible hors ligne', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
        })
    );
  }
});

// Gestion des messages depuis l'application
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('✅ Service Worker prêt - Cache permanent activé (sans limite de durée)');
