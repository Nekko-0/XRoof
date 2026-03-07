const CACHE_NAME = "xroof-v1"

self.addEventListener("install", (event) => {
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim())
})

self.addEventListener("fetch", (event) => {
  // Let all requests pass through to the network
  // This minimal SW just enables the install prompt
  event.respondWith(fetch(event.request))
})
