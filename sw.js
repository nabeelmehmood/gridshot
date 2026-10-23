// The site moved to https://nabeelmehmood.github.io/fpsdojo/. This replaces the old service worker for returning players:
// it deletes the old cache and unregisters itself, so the redirect is never skipped.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('gridshot')).map(key => caches.delete(key))))
      .then(() => self.registration.unregister())
  );
});
