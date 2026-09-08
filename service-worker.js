/**
 * MonerAlo Service Worker
 * Caches the app shell (HTML/CSS/JS/icons/local images) for offline use.
 * Network calls to OpenRouter are NEVER intercepted or cached — replies
 * always require a live network connection, as communicated in the UI.
 *
 * Uses relative paths (scope-relative) so it works correctly when hosted
 * under a GitHub Pages project subpath (e.g. https://user.github.io/repo/).
 */

const CACHE_VERSION = 'moneralo-v1.0.0';
const CACHE_NAME = `moneralo-shell-${CACHE_VERSION}`;

// Paths are relative to the service worker's own scope.
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/variables.css',
  './css/base.css',
  './css/layout.css',
  './css/chat.css',
  './css/components.css',
  './css/onboarding.css',
  './css/settings.css',
  './css/animations.css',
  './js/main.js',
  './js/types.js',
  './js/utils/helpers.js',
  './js/utils/toast.js',
  './js/utils/modal.js',
  './js/utils/emojiData.js',
  './js/services/StorageService.js',
  './js/services/MemoryService.js',
  './js/services/PromptBuilder.js',
  './js/services/OpenRouterService.js',
  './js/services/SoundManager.js',
  './js/services/ThemeService.js',
  './js/components/ChatList.js',
  './js/components/ChatWindow.js',
  './js/components/MessageBubble.js',
  './js/components/Settings.js',
  './js/components/Onboarding.js',
  './js/components/EmojiPicker.js',
  './assets/mrittika.png',
  './icons/icon-72.png',
  './icons/icon-96.png',
  './icons/icon-128.png',
  './icons/icon-144.png',
  './icons/icon-152.png',
  './icons/icon-192.png',
  './icons/icon-384.png',
  './icons/icon-512.png',
  './icons/maskable-192.png',
  './icons/maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon.ico',
];

// Third-party assets we opportunistically cache but don't block install on.
const RUNTIME_CACHEABLE_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdnjs.cloudflare.com'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch((err) => {
        // Don't fail install entirely if a single non-critical asset 404s;
        // log and continue so the app shell mostly works offline.
        console.warn('[SW] Some app shell assets failed to cache:', err);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('moneralo-shell-') && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isOpenRouterRequest(url) {
  return url.hostname === 'openrouter.ai';
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Never intercept or cache OpenRouter API calls — always go straight
  // to the network so replies are always live and never stale/cached.
  if (isOpenRouterRequest(url)) {
    return;
  }

  // App-shell: cache-first with network fallback + background refresh.
  const isSameOrigin = url.origin === self.location.origin;
  const isRuntimeCacheable = RUNTIME_CACHEABLE_HOSTS.includes(url.hostname);

  if (isSameOrigin || isRuntimeCacheable) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const networkFetch = fetch(req)
          .then((response) => {
            if (response && response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
            }
            return response;
          })
          .catch(() => cached); // offline: fall back to cache if network fails

        return cached || networkFetch;
      })
    );
  }
});
