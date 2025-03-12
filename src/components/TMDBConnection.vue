<template>
  <div class="service-connection">
    <div v-if="!isConnected" class="connection-form">
      <h2>Connect to TMDB</h2>
      <p class="connection-description">
        Connect to The Movie Database (TMDB) to retrieve posters and movie/show information when Sonarr/Radarr isn't available.
      </p>
      
      <div class="form-group">
        <label for="tmdbApiKey">API Key:</label>
        <div class="api-key-input">
          <input 
            :type="showApiKey ? 'text' : 'password'" 
            id="tmdbApiKey" 
            v-model="apiKey" 
            placeholder="Enter your TMDB API key"
            required
            @keyup.enter="testConnection"
          />
          <button 
            type="button" 
            class="toggle-button" 
            @click="showApiKey = !showApiKey"
          >
            {{ showApiKey ? 'Hide' : 'Show' }}
          </button>
        </div>
        <div class="field-hint">
          <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener noreferrer">Get your TMDB API key</a>
        </div>
      </div>
        
      <div class="actions">
        <button 
          @click="testConnection" 
          class="primary-button" 
          :disabled="!apiKey || loading"
        >
          <span v-if="loading" class="loading-spinner"></span>
          {{ loading ? 'Testing...' : 'Test Connection' }}
        </button>
      </div>
      
      <div class="actions" style="margin-top: 10px;">
        <button 
          @click="saveConnection" 
          class="save-button" 
          :disabled="!apiKey || saving"
        >
          {{ saving ? 'Saving...' : 'Save Connection' }}
        </button>
      </div>
      
      <div v-if="message" class="message" :class="{ 'error-message': isError }">
        {{ message }}
      </div>
    </div>
    
    <div v-else class="connection-info">
      <div class="connection-header">
        <h2>TMDB Connection</h2>
        <div class="connection-status connected">
          <span class="status-icon">✓</span>
          Connected
        </div>
      </div>
      
      <div class="server-info">
        <div class="info-row">
          <span class="info-label">API Key:</span>
          <span class="info-value">{{ maskApiKey(apiKey) }}</span>
        </div>
      </div>
      
      <div class="actions">
        <button @click="disconnectTMDB" class="disconnect-button">
          Disconnect from TMDB
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import credentialsService from '../services/CredentialsService';
import tmdbService from '../services/TMDBService';

export default {
  name: 'TMDBConnection',
  props: {
    connected: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      apiKey: '',
      loading: false,
      saving: false,
      showApiKey: false,
      message: '',
      isError: false,
      isConnected: false
    };
  },
  async created() {
    // Check if already connected
    this.isConnected = this.connected;
    
    // Load credentials
    await this.loadCredentials();
    
    // If the API key is loaded, mark as connected
    if (this.apiKey) {
      this.isConnected = true;
    }
  },
  methods: {
    async loadCredentials() {
      try {
        const credentials = await credentialsService.getCredentials('tmdb');
        
        if (credentials && credentials.apiKey) {
          this.apiKey = credentials.apiKey;
        }
      } catch (error) {
        console.error('Error loading TMDB credentials:', error);
      }
    },
    async testConnection() {
      if (!this.apiKey) {
        this.showError('Please enter an API key');
        return;
      }
      
      this.loading = true;
      this.message = 'Testing connection...';
      this.isError = false;
      
      try {
        // Save credentials temporarily for testing
        await credentialsService.storeCredentials('tmdb', {
          apiKey: this.apiKey
        });
        
        // Force reload and test configuration
        await tmdbService.loadCredentials();
        
        // Test with a simple configuration request
        const testResult = await tmdbService._apiRequest('/configuration');
        
        if (testResult && testResult.images) {
          this.showSuccess('Connection successful!');
        } else {
          this.showError('Connection failed. Please check your API key.');
        }
      } catch (error) {
        console.error('TMDB connection test error:', error);
        this.showError('Connection failed: ' + (error.message || 'Unknown error'));
      } finally {
        this.loading = false;
      }
    },
    async saveConnection() {
      if (!this.apiKey) {
        this.showError('Please enter an API key');
        return;
      }
      
      this.saving = true;
      this.message = 'Saving connection...';
      this.isError = false;
      
      try {
        await credentialsService.storeCredentials('tmdb', {
          apiKey: this.apiKey
        });
        
        // Reload credentials in the service
        await tmdbService.loadCredentials();
        
        this.showSuccess('Connection saved successfully!');
        this.isConnected = true;
        
        // Emit connected event
        this.$emit('connected');
      } catch (error) {
        console.error('Error saving TMDB connection:', error);
        this.showError('Failed to save connection: ' + (error.message || 'Unknown error'));
      } finally {
        this.saving = false;
      }
    },
    async disconnectTMDB() {
      if (confirm('Are you sure you want to disconnect from TMDB?')) {
        try {
          // Clear credentials
          await credentialsService.deleteCredentials('tmdb');
          
          // Reset service - set apiKey to empty to force disconnect
          tmdbService.apiKey = '';
          await tmdbService.loadCredentials();
          
          // Reset local state
          this.apiKey = '';
          this.isConnected = false;
          this.message = '';
          
          // Emit disconnected event
          this.$emit('disconnected');
          
          // Force refresh component state
          this.$forceUpdate();
        } catch (error) {
          console.error('Error disconnecting from TMDB:', error);
          this.showError('Failed to disconnect: ' + (error.message || 'Unknown error'));
        }
      }
    },
    showSuccess(message) {
      this.message = message;
      this.isError = false;
      
      // Clear message after 3 seconds
      setTimeout(() => {
        if (this.message === message) {
          this.message = '';
        }
      }, 3000);
    },
    showError(message) {
      this.message = message;
      this.isError = true;
    },
    maskApiKey(key) {
      if (!key) return '';
      
      // Show only first 4 and last 4 characters
      const firstFour = key.substring(0, 4);
      const lastFour = key.substring(key.length - 4);
      const middleLength = key.length - 8;
      
      return `${firstFour}${'*'.repeat(middleLength)}${lastFour}`;
    }
  }
};
</script>

<style scoped>
.service-connection {
  max-width: 500px;
  margin: 0 auto;
  padding: 20px;
}

h2 {
  margin-top: 0;
  margin-bottom: 15px;
  color: var(--header-color);
  text-align: center;
  transition: color var(--transition-speed);
}

.connection-description {
  margin-bottom: 20px;
  text-align: center;
  color: var(--text-color);
  line-height: 1.5;
  transition: color var(--transition-speed);
}

.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--text-color);
  transition: color var(--transition-speed);
}

input[type="text"],
input[type="password"],
input[type="number"] {
  width: 100%;
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--input-bg);
  color: var(--input-text);
  transition: background-color var(--transition-speed), 
              border-color var(--transition-speed),
              color var(--transition-speed);
}

.api-key-input {
  display: flex;
  gap: 10px;
}

.api-key-input input {
  flex: 1;
}

.toggle-button {
  background-color: var(--button-secondary-bg);
  color: var(--button-secondary-text);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 0 10px;
  cursor: pointer;
  transition: background-color var(--transition-speed), 
              color var(--transition-speed),
              border-color var(--transition-speed);
}

.toggle-button:hover {
  background-color: var(--nav-hover-bg);
}

.field-hint {
  font-size: 12px;
  margin-top: 5px;
  color: var(--text-color);
  opacity: 0.7;
  transition: color var(--transition-speed);
}

.field-hint a {
  color: #01b4e4; /* TMDB blue */
  text-decoration: none;
}

.field-hint a:hover {
  text-decoration: underline;
}

.actions {
  margin-top: 25px;
  display: flex;
  justify-content: center;
}

.primary-button {
  background-color: #01b4e4; /* TMDB blue color */
  color: white;
  border: none;
  border-radius: 4px;
  padding: 10px 20px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 150px;
  transition: background-color 0.2s;
}

.primary-button:hover:not(:disabled) {
  background-color: #0096c5; /* Darker blue on hover */
}

.primary-button:disabled {
  background-color: #81d8f6; /* Light blue when disabled */
  cursor: not-allowed;
}

.save-button {
  background-color: #90cea1; /* TMDB green */
  color: white;
  border: none;
  border-radius: 4px;
  padding: 10px 20px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 150px;
  transition: background-color 0.2s;
}

.save-button:hover:not(:disabled) {
  background-color: #76b888; /* Darker green on hover */
}

.save-button:disabled {
  background-color: #c5e6ce; /* Light green when disabled */
  cursor: not-allowed;
}

.loading-spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.message {
  margin-top: 15px;
  padding: 10px;
  background-color: rgba(0, 180, 228, 0.1); /* TMDB blue */
  border-left: 3px solid #01b4e4;
  color: var(--text-color);
  border-radius: 4px;
  transition: color var(--transition-speed);
}

.error-message {
  margin-top: 15px;
  padding: 10px;
  background-color: rgba(255, 59, 48, 0.1);
  border-left: 3px solid #FF3B30;
  color: var(--text-color);
  border-radius: 4px;
  transition: color var(--transition-speed);
}

/* Connected state styling */
.connection-info {
  background-color: var(--card-bg-color);
  border-radius: 8px;
  box-shadow: var(--card-shadow);
  padding: 20px;
  transition: background-color var(--transition-speed), box-shadow var(--transition-speed);
}

.connection-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
}

.status-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background-color: #90cea1; /* TMDB green */
  color: white;
  font-size: 10px;
}

.server-info {
  margin-bottom: 25px;
  padding: 15px;
  background-color: var(--bg-color);
  border-radius: 6px;
  transition: background-color var(--transition-speed);
}

.info-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 12px;
  position: relative;
}

.info-row:last-child {
  margin-bottom: 0;
}

.info-label {
  font-weight: 500;
  width: 140px;
  color: var(--text-color);
  transition: color var(--transition-speed);
}

.info-value {
  flex: 1;
  color: var(--text-color);
  font-family: monospace;
  word-break: break-all;
  transition: color var(--transition-speed);
}

.disconnect-button {
  background-color: rgba(255, 59, 48, 0.1);
  color: #FF3B30;
  border: 1px solid #FF3B30;
  border-radius: 4px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.disconnect-button:hover {
  background-color: rgba(255, 59, 48, 0.2);
}
</style>