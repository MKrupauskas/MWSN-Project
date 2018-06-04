const cacheName = 'v14';
const cacheFiles = [
    './',
    './index.html',
    './restaurant.html',
    './css/styles.css',
    './data/restaurants.json',
    './js/main.js',
    './js/dbhelper.js',
    './js/restaurant_info.js'
]

self.addEventListener('install', function (e) {
    console.log('[SW] Installed');
    e.waitUntil(
        caches.open(cacheName).then(function (cache) {
            console.log('[SW] Caching cache files');
            return cache.addAll(cacheFiles);
        })
    );
});

self.addEventListener('activate', function (e) {
    console.log('[SW] Activated');

    e.waitUntil(caches.keys().then(function (cacheNames) {
        return Promise.all(cacheNames.map(name => {
            if (name !== cacheName) {
                console.log('[SW] Removing cached files from', name);
                return caches.delete(name);
            }
        }))
    }));
});

self.addEventListener('fetch', function (e) {

    // caches.match(event.request).then(function(res){
    //     return res || requestBackend(event);
    //   })

    e.respondWith(
        caches.match(e.request).then(function (response) {
            if (response) {
                console.info('WOOOOOOOOO [SW] Found in cache', e.request.url)
                return response;
            }
            const requestClone = e.request.clone();

            console.log('[SW] Fetching', e.request.url);
            return fetch(e.request)
                .then(response => {

                    if (!response) {
                        console.log('[SW] No response from fetch');
                        return response;
                    }
                    if (e.request.url.startsWith('https://maps')) return response;

                    const responseClone = response.clone();

                    caches.open(cacheName).then(function (cache) {
                        cache.put(requestClone, responseClone);
                    })
                    return response;
                }).catch(function (err) {
                    console.log('[SW] Error Fetching and Caching', err);
                });
        })
    );
});