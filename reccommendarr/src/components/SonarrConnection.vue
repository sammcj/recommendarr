<template>
  <div class="sonarr-connection">
    <h2>Connect to Sonarr</h2>
    
    <form @submit.prevent="connect">
      <div class="form-group">
        <label for="baseUrl">Sonarr URL:</label>
        <input 
          id="baseUrl" 
          v-model="baseUrl" 
          type="text" 
          placeholder="http://localhost:8989"
          required
        />
      </div>
      
      <div class="form-group">
        <label for="apiKey">API Key:</label>
        <input 
          id="apiKey" 
          v-model="apiKey" 
          type="password" 
          placeholder="Your Sonarr API key"
          required
        />
      </div>
      
      <button type="submit" :disabled="connecting">
        {{ connecting ? 'Connecting...' : 'Connect' }}
      </button>
    </form>
    
    <div v-if="connectionStatus" class="connection-status">
      <p v-if="connectionStatus === 'success'" class="success">
        Connected successfully!
      </p>
      <p v-else-if="connectionStatus === 'error'" class="error">
        Connection failed. Please check your URL and API key.
      </p>
    </div>
  </div>
</template>

<script>
import sonarrService from '../services/SonarrService';

export default {
  name: 'SonarrConnection',
  data() {
    return {
      baseUrl: '',
      apiKey: '',
      connectionStatus: null,
      connecting: false
    };
  },
  created() {
    // Load saved credentials if they exist
    const savedBaseUrl = localStorage.getItem('sonarrBaseUrl');
    const savedApiKey = localStorage.getItem('sonarrApiKey');
    
    if (savedBaseUrl && savedApiKey) {
      this.baseUrl = savedBaseUrl;
      this.apiKey = savedApiKey;
      // Try to automatically connect with saved credentials
      this.autoConnect();
    }
  },
  methods: {
    async autoConnect() {
      this.connecting = true;
      
      try {
        // Configure the service with saved details
        sonarrService.configure(this.baseUrl, this.apiKey);
        
        // Test the connection
        const success = await sonarrService.testConnection();
        
        // Only emit event if successful
        if (success) {
          this.$emit('connected');
        } else {
          // Clear invalid credentials
          this.clearStoredCredentials();
        }
      } catch (error) {
        console.error('Error auto-connecting to Sonarr:', error);
        // Clear invalid credentials
        this.clearStoredCredentials();
      } finally {
        this.connecting = false;
      }
    },
    async connect() {
      this.connecting = true;
      this.connectionStatus = null;
      
      try {
        // Configure the service with provided details
        sonarrService.configure(this.baseUrl, this.apiKey);
        
        // Test the connection
        const success = await sonarrService.testConnection();
        
        // Update status based on response
        this.connectionStatus = success ? 'success' : 'error';
        
        // If successful, save credentials and emit event
        if (success) {
          this.saveCredentials();
          this.$emit('connected');
        }
      } catch (error) {
        console.error('Error connecting to Sonarr:', error);
        this.connectionStatus = 'error';
      } finally {
        this.connecting = false;
      }
    },
    saveCredentials() {
      localStorage.setItem('sonarrBaseUrl', this.baseUrl);
      localStorage.setItem('sonarrApiKey', this.apiKey);
    },
    clearStoredCredentials() {
      localStorage.removeItem('sonarrBaseUrl');
      localStorage.removeItem('sonarrApiKey');
    }
  }
};
</script>

<style scoped>
.sonarr-connection {
  max-width: 500px;
  margin: 0 auto;
  padding: 20px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background-color: var(--card-bg-color);
  box-shadow: var(--card-shadow);
  transition: background-color var(--transition-speed), 
              border-color var(--transition-speed),
              box-shadow var(--transition-speed);
}

h2 {
  margin-top: 0;
  color: var(--header-color);
  transition: color var(--transition-speed);
}

.form-group {
  margin-bottom: 15px;
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: var(--text-color);
  transition: color var(--transition-speed);
}

input {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--input-border);
  border-radius: 4px;
  box-sizing: border-box;
  background-color: var(--input-bg);
  color: var(--input-text);
  transition: background-color var(--transition-speed), 
              border-color var(--transition-speed),
              color var(--transition-speed);
}

button {
  background-color: var(--button-primary-bg);
  color: var(--button-primary-text);
  padding: 10px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: background-color var(--transition-speed), 
              color var(--transition-speed),
              filter 0.2s;
}

button:hover:not(:disabled) {
  filter: brightness(1.1);
}

button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.connection-status {
  margin-top: 15px;
  padding: 10px;
  border-radius: 4px;
}

.success {
  color: var(--button-primary-bg);
  transition: color var(--transition-speed);
}

.error {
  color: #f44336;
  transition: color var(--transition-speed);
}
</style>