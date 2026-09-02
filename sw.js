const CACHE_NAME = "assistline-v3";
const APP_SHELL = [
  "./",
  "./index.html",
  "./offline.html",
  "./css/style.css",
  "./js/app.js",
  "./manifest.json",
  "./icons/icon.svg",
  "./icons/icon-maskable.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// Reseau en priorite partout : on essaie toujours d'avoir la version la
// plus fraiche, et on ne retombe sur le cache que si la requete echoue
// (vraiment hors-ligne). Plus simple et plus previsible que du
// stale-while-revalidate pour un projet itere frequemment.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => {
          if (cached) return cached;
          if (request.mode === "navigate") return caches.match("./offline.html");
          return Response.error();
        })
      )
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SHOW_NOTIFICATION") {
    const { title, options } = event.data;
    self.registration.showNotification(title, options);
  }
});
