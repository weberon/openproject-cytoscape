const CACHE_NAME = 'op-graph-viewer-v4';
const urlsToCache = [
    '/openproject-cytoscape/',
    '/openproject-cytoscape/graph.js',
    '/openproject-cytoscape/icon-192x192.png',
    '/openproject-cytoscape/icon-512x512.png'
    '/openproject-cytoscape/index.html',
    '/openproject-cytoscape/lib/cytoscape.min.js',
    '/openproject-cytoscape/lib/xlsx.full.min.js',
    '/openproject-cytoscape/manifest.json',
    '/openproject-cytoscape/styles.css'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => response || fetch(event.request))
    );
});
