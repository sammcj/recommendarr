<template>
  <div class="tmdb-connection">
    <h2>TMDB Connection</h2>
    <div class="card-content">
      <p class="info-text">
        Connect to The Movie Database (TMDB) to retrieve posters and movie/show information when Sonarr/Radarr isn't available.
        <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener noreferrer">Get your TMDB API key</a>
      </p>
      
      <div class="input-group">
        <label for="tmdbApiKey">API Key:</label>
        <div class="password-input">
          <input 
            :type="showApiKey ? 'text' : 'password'" 
            id="tmdbApiKey" 
            v-model="apiKey" 
            placeholder="Enter your TMDB API key"
          />
          <button 
            type="button" 
            class="toggle-visibility" 
            @click="showApiKey = !showApiKey"
          >
            {{ showApiKey ? 'Hide' : 'Show' }}
          </button>
        </div>
      </div>
        
      <div class="button-group">
        <button 
          @click="testConnection" 
          class="test-button" 
          :disabled="!apiKey || loading"
        >
          {{ loading ? 'Testing...' : 'Test Connection' }}
        </button>
        
        <button 
          @click="saveConnection" 
          class="save-button" 
          :disabled="!apiKey || saving"
        >
          {{ saving ? 'Saving...' : 'Save Connection' }}
        </button>
      </div>
      
      <div v-if="message" class="message" :class="{ 'error': isError }">
        {{ message }}
      </div>
    </div>
  </div>
</template>

<script>
import credentialsService from '../services/CredentialsService';
import tmdbService from '../services/TMDBService';

export default {
  name: 'TMDBConnection',
  data() {
    return {
      apiKey: '',
      loading: false,
      saving: false,
      showApiKey: false,
      message: '',
      isError: false
    };
  },
  mounted() {
    this.loadCredentials();
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
      } catch (error) {
        console.error('Error saving TMDB connection:', error);
        this.showError('Failed to save connection: ' + (error.message || 'Unknown error'));
      } finally {
        this.saving = false;
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
    }
  }
};
</script>

<style scoped>
.tmdb-connection {
  margin-bottom: 2rem;
  width: 100%;
}

.card-content {
  background-color: var(--card-bg);
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.info-text {
  margin-bottom: 1rem;
  line-height: 1.5;
}

.info-text a {
  color: var(--primary-color);
  text-decoration: none;
}

.info-text a:hover {
  text-decoration: underline;
}

.input-group {
  margin-bottom: 1rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--input-bg);
  color: var(--text-color);
  font-size: 1rem;
  margin-bottom: 0.5rem;
}

.password-input {
  position: relative;
}

.toggle-visibility {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--text-color);
  cursor: pointer;
  font-size: 0.8rem;
  opacity: 0.7;
  padding: 0.25rem 0.5rem;
}

.toggle-visibility:hover {
  opacity: 1;
}

.button-group {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.test-button {
  background-color: var(--secondary-color);
  color: white;
}

.test-button:hover:not(:disabled) {
  background-color: var(--secondary-color-dark);
}

.save-button {
  background-color: var(--primary-color);
  color: white;
}

.save-button:hover:not(:disabled) {
  background-color: var(--primary-color-dark);
}

.message {
  margin-top: 1rem;
  padding: 0.75rem;
  border-radius: 4px;
  background-color: rgba(0, 128, 0, 0.1);
  color: green;
  text-align: center;
}

.message.error {
  background-color: rgba(255, 0, 0, 0.1);
  color: red;
}
</style>