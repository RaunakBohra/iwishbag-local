// Service Worker Update Handler
// Forces update when a new service worker is available

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SW_UPDATED') {
      console.log(`[SW Update] ${event.data.message} (v${event.data.version})`);
      
      // Show a notification to the user that the app has been updated
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 10000;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 14px;
        max-width: 300px;
        cursor: pointer;
        transition: opacity 0.3s ease;
      `;
      notification.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 4px;">App Updated!</div>
        <div>Service Worker v${event.data.version} loaded. Click to refresh.</div>
      `;
      
      notification.onclick = () => {
        window.location.reload();
      };
      
      document.body.appendChild(notification);
      
      // Auto-remove after 10 seconds
      setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      }, 10000);
    }
  });

  // Force service worker update check
  navigator.serviceWorker.register('/sw.js').then((registration) => {
    console.log('[SW] Registered successfully');
    
    // Force update check
    registration.update();
    
    // Check for updates every 60 seconds
    setInterval(() => {
      registration.update();
    }, 60000);
    
  }).catch((error) => {
    console.log('[SW] Registration failed:', error);
  });
}