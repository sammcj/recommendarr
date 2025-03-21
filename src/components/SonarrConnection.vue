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
        <small>Enter your Sonarr URL using the internal network IP (e.g., http://192.168.0.x:8989) for best results, especially for external access.</small>
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
    
    <div v-if="connectionStatus === 'success'" class="disconnection-section">
      <button type="button" @click="disconnect" class="disconnect-btn">
        Disconnect Sonarr
      </button>
    </div>
  </div>
</template>

<script>
import sonarrService from '../services/SonarrService';
import credentialsService from '../services/CredentialsService';
import axios from 'axios';

export default {
  name: 'SonarrConnection',
  props: {
    connected: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      baseUrl: '',
      apiKey: '',
      connectionStatus: null,
      connecting: false
    };
  },
  async created() {
    // If connected prop is true, set connection status right away
    if (this.connected) {
      this.connectionStatus = 'success';
      
      // Load current values from service
      this.baseUrl = sonarrService.baseUrl;
      this.apiKey = sonarrService.apiKey;
    }
    
    // Try to load credentials from server
    if (!this.baseUrl || !this.apiKey) {
      try {
        const credentials = await credentialsService.getCredentials('sonarr');
        if (credentials && credentials.baseUrl && credentials.apiKey) {
          this.baseUrl = credentials.baseUrl;
          this.apiKey = credentials.apiKey;
          
          // Try to automatically connect with loaded credentials
          if (!this.connected) {
            this.autoConnect();
          }
        }
      } catch (error) {
        console.error('Error loading saved Sonarr credentials:', error);
      }
    }
  },
  methods: {
    async autoConnect() {
      this.connecting = true;
      
      try {
        // Validate and normalize the URL
        if (!this.validateUrl()) {
          // Clear invalid credentials
          this.clearStoredCredentials();
          return;
        }
        
        // Configure the service with saved details
        sonarrService.configure(this.baseUrl, this.apiKey);
        
        // Test the connection
        const success = await sonarrService.testConnection();
        
        // Only emit event if successful
        if (success) {
          // Update credentials in service
          await sonarrService.configure(this.baseUrl, this.apiKey);
          this.$emit('connected');
        } else {
          // Clear invalid credentials
          this.clearStoredCredentials();
        }
      } catch (error) {
        console.error('Error auto-connecting to Sonarr:', error);
        // Clear invalid credentials
        this.clearStoredCredentials();
        
        // No need to show alerts during auto-connect
      } finally {
        this.connecting = false;
      }
    },
    async connect() {
      this.connecting = true;
      this.connectionStatus = null;
      
      try {
        // Validate and normalize the URL
        if (!this.validateUrl()) {
          this.connectionStatus = 'error';
          return;
        }
        
        // Configure the service with provided details
        await sonarrService.configure(this.baseUrl, this.apiKey);
        
        // Test the connection
        const success = await sonarrService.testConnection();
        
        // Update status based on response
        this.connectionStatus = success ? 'success' : 'error';
        
        // If successful, emit event
        if (success) {
          this.$emit('connected');
        }
      } catch (error) {
        console.error('Error connecting to Sonarr:', error);
        this.connectionStatus = 'error';
        
        // Try to diagnose connection issue
        const sonarrUrl = new URL(this.baseUrl);
        this.diagnoseConnection(sonarrUrl.hostname, sonarrUrl.port);
        
        // Display more helpful error message based on the error
        if (error.message) {
          // Show the message from the server if available
          alert(`Connection error: ${error.message}`);
        } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          alert('Cannot connect to Sonarr. Please ensure the service is running and the URL is correct.');
        } else if (error.status === 0) {
          alert('Cannot connect to the API server. Please check your network connection.');
        }
      } finally {
        this.connecting = false;
      }
    },
    
    // Diagnostic helper to test network connectivity
    async diagnoseConnection(host, port) {
      try {
        console.log(`Diagnosing connection to ${host}:${port}`);
        // Check if the API server can reach the Sonarr host
        const response = await axios.get(`/api/net-test?target=${host}&port=${port}`);
        console.log('Connection diagnostic results:', response.data);
      } catch (error) {
        console.error('Error running connection diagnostics:', error);
      }
    },
    
    validateUrl() {
      try {
        // Validate URL format
        if (!this.baseUrl) {
          return false;
        }
        
        // Make sure URL starts with http:// or https://
        if (!this.baseUrl.match(/^https?:\/\//)) {
          this.baseUrl = 'http://' + this.baseUrl;
        }
        
        // Normalize URL by removing trailing slashes
        this.baseUrl = this.baseUrl.replace(/\/+$/, '');
        
        // Basic validation that it looks like a URL
        new URL(this.baseUrl);
        return true;
      } catch (e) {
        console.error('Invalid URL format:', e);
        return false;
      }
    },
    
    // No longer needed - credentials are stored server-side now
    async clearStoredCredentials() {
      // Delete credentials from server instead of localStorage
      await credentialsService.deleteCredentials('sonarr');
    },
    
    disconnect() {
      // Clear stored credentials
      this.clearStoredCredentials();
      
      // Reset component state
      this.connectionStatus = null;
      this.baseUrl = '';
      this.apiKey = '';
      
      // Notify parent components
      this.$emit('disconnected');
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
  border-radius: var(--border-radius-md);
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
  padding: 8px 10px;
  border: 1px solid var(--input-border);
  border-radius: var(--border-radius-sm);
  box-sizing: border-box;
  background-color: var(--input-bg);
  color: var(--input-text);
  transition: background-color var(--transition-speed), 
              border-color var(--transition-speed),
              color var(--transition-speed);
  font-size: 14px;
}

button {
  background-color: var(--button-primary-bg);
  color: var(--button-primary-text);
  padding: 8px 15px;
  border: none;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  font-weight: 500;
  transition: background-color var(--transition-speed), 
              color var(--transition-speed),
              filter 0.2s;
  font-size: 14px;
  letter-spacing: 0.2px;
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

.disconnection-section {
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid var(--border-color);
}

.disconnect-btn {
  background-color: #f44336;
  width: 100%;
  color: white;
  margin-top: 10px;
  font-weight: 500;
  padding: 8px 15px;
  border-radius: var(--border-radius-sm);
  font-size: 14px;
  letter-spacing: 0.2px;
}

.disconnect-btn:hover {
  filter: brightness(1.1);
}
</style>