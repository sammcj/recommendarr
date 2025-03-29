import { createApp } from 'vue'
import App from './App.vue'
// Import Font Awesome
import '@fortawesome/fontawesome-free/css/all.css'
// Import migration utilities
import { runFullMigration } from './utils/MigrationUtils'

// PWA registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      })
      .catch(error => {
        console.log('ServiceWorker registration failed: ', error);
      });
  });
}

// Initialize the application
async function initApp() {
  try {
    // Run localStorage migration for multi-user support
    await runFullMigration().catch(err => {
      console.error('Storage migration error:', err);
      // Continue even if migration fails
    });
  } catch (error) {
    console.error('Error during initialization:', error);
    // Continue even if there are initialization errors
  }
  
  // Create and mount the Vue application
  createApp(App).mount('#app');
}

// Start the application
initApp();
