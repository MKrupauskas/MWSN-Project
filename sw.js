const cacheName = "static-cache-v5";
const cacheFiles = [
  "./",
  "./index.html",
  "./restaurant.html",
  "./js/main.js",
  "./js/dbhelper.js",
  "./js/idb.js",
  "./js/restaurant_info.js"
];

self.addEventListener("install", function(e) {
  e.waitUntil(
    caches.open(cacheName).then(function(cache) {
      return cache.addAll(cacheFiles);
    })
  );
});

self.addEventListener("activate", function(e) {
  e.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(name => {
          if (name !== cacheName) {
            console.log("[SW] Removing cached files from", name);
            return caches.delete(name);
          }
        })
      );
    })
  );
});

self.addEventListener("fetch", function(e) {
  // caches.match(event.request).then(function(res){
  //     return res || requestBackend(event);
  //   })

  // special case for responding to requests for a specific restaurant's page
  if (e.request.url.includes("restaurant.html?")) {
    const url = e.request.url.split("?")[0];
    e.respondWith(caches.match(url));
  } else {
    e.respondWith(
      caches.match(e.request).then(function(response) {
        if (response) {
          return response;
        }
        const requestClone = e.request.clone();

        return fetch(e.request).then(response => {
          if (!response) {
            return response;
          }
          if (e.request.url.startsWith("https://maps")) return response;

          console.log(response)

          const responseClone = response.clone();

          caches.open(cacheName).then(function(cache) {
            cache.put(requestClone, responseClone);
          });
          return response;
        });
      })
    );
  }
});
