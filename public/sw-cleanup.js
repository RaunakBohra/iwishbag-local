// Service Worker Cleanup Script
console.log('Service Worker Cleanup: Starting...');

// Unregister all existing service workers
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function (registrations) {
    for (let registration of registrations) {
      registration.unregister();
      console.log('Service Worker unregistered:', registration.scope);
    }
  });

  // Prevent new service worker registration in development
  const originalRegister = navigator.serviceWorker.register;
  navigator.serviceWorker.register = function () {
    console.log('Service Worker registration blocked in development');
    return Promise.resolve();
  };
}

// Clear all caches
if ('caches' in window) {
  caches.keys().then(function (names) {
    for (let name of names) {
      caches.delete(name);
      console.log('Cache deleted:', name);
    }
  });
}

console.log('Service Worker Cleanup: Complete');
