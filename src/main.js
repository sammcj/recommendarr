import { createApp } from 'vue'
import App from './App.vue'
// Import Font Awesome
import '@fortawesome/fontawesome-free/css/all.css'

// PWA registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
  });
}

// Initialize the application
function initApp() {
  // Create and mount the Vue application
  createApp(App).mount('#app');
}

// Start the application
initApp();
