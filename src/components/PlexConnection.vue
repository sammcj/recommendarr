<template>
  <div class="plex-connection">
    <h2>Connect to Plex</h2>
    
    <form @submit.prevent="connect">
      <div class="form-group">
        <label for="baseUrl">Plex URL:</label>
        <input 
          id="baseUrl" 
          v-model="baseUrl" 
          type="text" 
          placeholder="http://localhost:32400"
          required
        />
        <p class="help-text">Enter your Plex server address, including port (usually 32400)</p>
      </div>
      
      <div class="form-group">
        <label for="token">Plex Token:</label>
        <input 
          id="token" 
          v-model="token" 
          type="password" 
          placeholder="Your Plex token"
          required
        />
        <p class="help-text">Your Plex authentication token - <a href="https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/" target="_blank">How to find your Plex token</a></p>
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
        Connection failed. Please check your URL and token.
      </p>
    </div>

    <div v-if="connectionStatus === 'success'" class="recently-watched-options">
      <h3>Recently Watched Options</h3>
      
      <div class="form-group">
        <label for="recentLimit">Number of recently watched items to include:</label>
        <div class="limit-control">
          <input 
            id="recentLimit" 
            v-model.number="recentLimit" 
            type="number" 
            min="1" 
            max="50" 
            @change="saveRecentLimit"
          />
          <div class="limit-buttons">
            <button type="button" @click="decreaseLimit" class="limit-btn">-</button>
            <button type="button" @click="increaseLimit" class="limit-btn">+</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import plexService from '../services/PlexService';

export default {
  name: 'PlexConnection',
  data() {
    return {
      baseUrl: '',
      token: '',
      connectionStatus: null,
      connecting: false,
      recentLimit: 10 // Default limit for recently watched items
    };
  },
  created() {
    // Load saved credentials if they exist
    const savedBaseUrl = localStorage.getItem('plexBaseUrl');
    const savedToken = localStorage.getItem('plexToken');
    const savedRecentLimit = localStorage.getItem('plexRecentLimit');
    
    if (savedBaseUrl && savedToken) {
      this.baseUrl = savedBaseUrl;
      this.token = savedToken;
      // Try to automatically connect with saved credentials
      this.autoConnect();
    }

    if (savedRecentLimit) {
      this.recentLimit = parseInt(savedRecentLimit, 10);
      // Validate the value is within range
      if (isNaN(this.recentLimit) || this.recentLimit < 1) {
        this.recentLimit = 5;
      } else if (this.recentLimit > 50) {
        this.recentLimit = 50;
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
        plexService.configure(this.baseUrl, this.token);
        
        // Test the connection
        const success = await plexService.testConnection();
        
        // Only emit event if successful
        if (success) {
          // Update the URL in case it was normalized
          this.saveCredentials();
          this.connectionStatus = 'success';
          this.$emit('connected');
        } else {
          // Clear invalid credentials
          this.clearStoredCredentials();
        }
      } catch (error) {
        console.error('Error auto-connecting to Plex:', error);
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
        // Validate and normalize the URL
        if (!this.validateUrl()) {
          this.connectionStatus = 'error';
          return;
        }
        
        // Configure the service with provided details
        plexService.configure(this.baseUrl, this.token);
        
        // Test the connection
        const success = await plexService.testConnection();
        
        // Update status based on response
        this.connectionStatus = success ? 'success' : 'error';
        
        // If successful, save credentials and emit event
        if (success) {
          this.saveCredentials();
          this.$emit('connected');
        }
      } catch (error) {
        console.error('Error connecting to Plex:', error);
        this.connectionStatus = 'error';
      } finally {
        this.connecting = false;
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
    
    saveCredentials() {
      localStorage.setItem('plexBaseUrl', this.baseUrl);
      localStorage.setItem('plexToken', this.token);
    },
    clearStoredCredentials() {
      localStorage.removeItem('plexBaseUrl');
      localStorage.removeItem('plexToken');
    },
    increaseLimit() {
      if (this.recentLimit < 50) {
        this.recentLimit++;
        this.saveRecentLimit();
      }
    },
    decreaseLimit() {
      if (this.recentLimit > 1) {
        this.recentLimit--;
        this.saveRecentLimit();
      }
    },
    saveRecentLimit() {
      // Ensure limit is within bounds
      if (this.recentLimit < 1) this.recentLimit = 1;
      if (this.recentLimit > 50) this.recentLimit = 50;
      
      localStorage.setItem('plexRecentLimit', this.recentLimit);
      this.$emit('limitChanged', this.recentLimit);
    }
  }
};
</script>

<style scoped>
.plex-connection {
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

h2, h3 {
  color: var(--header-color);
  transition: color var(--transition-speed);
}

h2 {
  margin-top: 0;
}

h3 {
  font-size: 1.2em;
  margin-top: 20px;
  margin-bottom: 15px;
  padding-top: 15px;
  border-top: 1px solid var(--border-color);
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

input[type="number"] {
  width: 60px;
  text-align: center;
}

.help-text {
  font-size: 12px;
  margin-top: 5px;
  color: var(--text-muted);
  transition: color var(--transition-speed);
}

.help-text a {
  color: var(--button-primary-bg);
  text-decoration: none;
}

.help-text a:hover {
  text-decoration: underline;
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

.limit-control {
  display: flex;
  align-items: center;
  gap: 10px;
}

.limit-buttons {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.limit-btn {
  width: 24px;
  height: 24px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
}

.recently-watched-options {
  margin-top: 15px;
}
</style>