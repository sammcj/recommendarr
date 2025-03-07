<template>
  <div class="callback-container">
    <div class="callback-card">
      <h2>Trakt Authorization</h2>
      
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Processing your authorization...</p>
      </div>
      
      <div v-else-if="error" class="error-state">
        <div class="error-icon">!</div>
        <h3>Authorization Failed</h3>
        <p>{{ error }}</p>
        <button @click="goToSettings" class="action-button">Return to Settings</button>
      </div>
      
      <div v-else-if="success" class="success-state">
        <div class="success-icon">✓</div>
        <h3>Authorization Successful</h3>
        <p>Your Trakt account has been connected successfully!</p>
        <button @click="goToSettings" class="action-button">Continue to Settings</button>
      </div>
    </div>
  </div>
</template>

<script>
import traktService from '../services/TraktService';

export default {
  name: 'TraktCallback',
  data() {
    return {
      loading: true,
      error: null,
      success: false
    };
  },
  async mounted() {
    // Get code and state from URL
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    
    // Check if required parameters exist
    if (!code || !state) {
      this.loading = false;
      this.error = 'Missing authorization code or state parameter.';
      return;
    }
    
    try {
      console.log('TraktCallback: Processing OAuth callback with code and state');
      // Process the OAuth callback
      await traktService.handleOAuthCallback(code, state);
      
      // Test connection
      const success = await traktService.testConnection();
      
      if (success) {
        this.success = true;
        console.log('TraktCallback: Successfully connected to Trakt');
      } else {
        this.error = 'Connected to Trakt, but could not fetch data. Please try again.';
        console.error('TraktCallback: Connection test failed after OAuth');
      }
    } catch (error) {
      console.error('OAuth callback error:', error);
      this.error = error.message || 'An error occurred during authorization.';
    } finally {
      this.loading = false;
      
      // Clean up URL to remove OAuth parameters
      const url = new URL(window.location.href);
      url.search = '';
      window.history.replaceState({}, document.title, url.toString());
    }
  },
  methods: {
    goToSettings() {
      // Without a proper router, we'll use location.href to redirect
      // The page will reload and will check for Trakt credentials
      console.log("Redirecting to settings after successful authorization");
      window.location.href = '/';
    }
  }
};
</script>

<style scoped>
.callback-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 20px;
  background-color: #f8f9fa;
}

.callback-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
  padding: 30px;
  width: 100%;
  max-width: 500px;
  text-align: center;
}

h2 {
  color: #ED1C24; /* Trakt red */
  margin-top: 0;
  margin-bottom: 30px;
  font-size: 24px;
}

h3 {
  margin-top: 15px;
  margin-bottom: 10px;
  font-size: 20px;
}

p {
  color: #555;
  line-height: 1.5;
  margin-bottom: 20px;
}

.loading-state, .error-state, .success-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 5px solid rgba(237, 28, 36, 0.1);
  border-radius: 50%;
  border-top-color: #ED1C24;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-icon, .success-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  margin-bottom: 15px;
  font-size: 30px;
  font-weight: bold;
}

.error-icon {
  background-color: rgba(255, 59, 48, 0.1);
  color: #ff3b30;
}

.success-icon {
  background-color: rgba(76, 175, 80, 0.1);
  color: #4CAF50;
}

.action-button {
  background-color: #ED1C24;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 10px 20px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.2s;
  margin-top: 10px;
}

.action-button:hover {
  background-color: #d1171e;
}
</style>