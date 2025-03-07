<template>
  <div class="service-connection">
    <div v-if="!connected" class="connection-form">
      <h2>Connect to Trakt</h2>
      <p class="connection-description">
        Connect to your Trakt.tv account to access watch history statistics.
      </p>
      
      <div class="form-group">
        <label for="clientId">Client ID:</label>
        <input 
          id="clientId" 
          v-model="clientId" 
          type="text" 
          placeholder="Your Trakt Client ID"
          required
          @keyup.enter="connectToTrakt"
        />
        <div class="field-hint">Obtain by creating an app in your Trakt account settings</div>
      </div>
      
      <div class="form-group">
        <label for="accessToken">Access Token:</label>
        <div class="api-key-input">
          <input 
            id="accessToken" 
            v-model="accessToken" 
            :type="showToken ? 'text' : 'password'" 
            placeholder="Your Trakt Access Token"
            required
            @keyup.enter="connectToTrakt"
          />
          <button type="button" class="toggle-button" @click="showToken = !showToken">
            {{ showToken ? 'Hide' : 'Show' }}
          </button>
        </div>
        <div class="field-hint">
          Generate an access token with permission to read your watch history.
        </div>
      </div>
      
      <div class="form-group">
        <label for="recentLimit">Number of recent items to fetch:</label>
        <div class="limit-input">
          <input 
            id="recentLimit" 
            v-model.number="recentLimit" 
            type="number" 
            min="1" 
            max="100" 
            @keyup.enter="connectToTrakt"
          />
        </div>
      </div>
      
      <div class="actions">
        <button 
          @click="connectToTrakt" 
          :disabled="isConnecting || !clientId || !accessToken"
          class="primary-button"
        >
          <span v-if="isConnecting" class="loading-spinner"></span>
          {{ isConnecting ? 'Connecting...' : 'Connect' }}
        </button>
      </div>
      
      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>
    </div>
    
    <div v-else class="connection-info">
      <div class="connection-header">
        <h2>Trakt Connection</h2>
        <div class="connection-status connected">
          <span class="status-icon">✓</span>
          Connected
        </div>
      </div>
      
      <div class="server-info">
        <div class="info-row">
          <span class="info-label">Client ID:</span>
          <span class="info-value">{{ maskedClientId }}</span>
        </div>
        
        <div class="info-row">
          <span class="info-label">Recent History Limit:</span>
          <span class="info-value">{{ recentLimit }} items</span>
          <button class="edit-button" @click="editLimit = true" v-if="!editLimit">Edit</button>
          
          <div v-if="editLimit" class="edit-limit">
            <input 
              type="number" 
              v-model.number="newLimit" 
              min="1" 
              max="100"
            />
            <div class="edit-actions">
              <button class="save-button" @click="updateLimit">Save</button>
              <button class="cancel-button" @click="cancelEditLimit">Cancel</button>
            </div>
          </div>
        </div>
      </div>
      
      <div class="actions">
        <button @click="disconnectTrakt" class="disconnect-button">
          Disconnect from Trakt
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import traktService from '../services/TraktService';

export default {
  name: 'TraktConnection',
  props: {
    connected: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      clientId: '',
      accessToken: '',
      recentLimit: 50,
      showToken: false,
      isConnecting: false,
      errorMessage: '',
      editLimit: false,
      newLimit: 50
    };
  },
  computed: {
    maskedClientId() {
      if (!this.clientId) return '';
      if (this.clientId.length <= 8) return '********';
      return this.clientId.substring(0, 4) + '*'.repeat(this.clientId.length - 8) + this.clientId.substring(this.clientId.length - 4);
    }
  },
  async created() {
    // If we're already connected, populate with existing credentials
    if (this.connected) {
      // Make sure credentials are loaded
      if (!traktService.isConfigured()) {
        await traktService.loadCredentials();
      }
      
      if (traktService.isConfigured()) {
        this.clientId = traktService.clientId;
        this.accessToken = traktService.accessToken;
        
        // Load recent limit from localStorage if available
        const savedLimit = localStorage.getItem('traktRecentLimit');
        if (savedLimit) {
          this.recentLimit = parseInt(savedLimit, 10);
          this.newLimit = this.recentLimit;
        }
      }
    }
  },
  methods: {
    async connectToTrakt() {
      if (!this.clientId || !this.accessToken) {
        this.errorMessage = 'Please enter both Client ID and Access Token';
        return;
      }
      
      this.isConnecting = true;
      this.errorMessage = '';
      
      try {
        // Configure the Trakt service with the credentials
        await traktService.configure(this.clientId, this.accessToken);
        
        // Test the connection
        const success = await traktService.testConnection();
        
        if (success) {
          // Save the recent limit to localStorage
          localStorage.setItem('traktRecentLimit', this.recentLimit.toString());
          
          // Emit connected event
          this.$emit('connected');
          
          // Emit limit changed event
          this.$emit('limitChanged', this.recentLimit);
        } else {
          this.errorMessage = 'Could not connect to Trakt. Please verify your credentials.';
        }
      } catch (error) {
        console.error('Error connecting to Trakt:', error);
        this.errorMessage = error.response?.data?.message || 'Failed to connect to Trakt';
      } finally {
        this.isConnecting = false;
      }
    },
    
    async disconnectTrakt() {
      if (confirm('Are you sure you want to disconnect from Trakt?')) {
        this.$emit('disconnected');
      }
    },
    
    updateLimit() {
      if (this.newLimit < 1) {
        this.newLimit = 1;
      } else if (this.newLimit > 100) {
        this.newLimit = 100;
      }
      
      this.recentLimit = this.newLimit;
      localStorage.setItem('traktRecentLimit', this.recentLimit.toString());
      this.editLimit = false;
      
      // Emit the limit changed event
      this.$emit('limitChanged', this.recentLimit);
    },
    
    cancelEditLimit() {
      this.newLimit = this.recentLimit;
      this.editLimit = false;
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

input[type="number"] {
  width: 80px;
  text-align: center;
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

.limit-input {
  display: flex;
  align-items: center;
}

.actions {
  margin-top: 25px;
  display: flex;
  justify-content: center;
}

.primary-button {
  background-color: #ED1C24; /* Trakt red color */
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
  background-color: #d11920; /* Darker red on hover */
}

.primary-button:disabled {
  background-color: #f6a1a5; /* Light red when disabled */
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
  background-color: #34C759;
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

.edit-button {
  background: none;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 12px;
  cursor: pointer;
  color: var(--text-color);
  margin-left: 10px;
  transition: all 0.2s;
}

.edit-button:hover {
  background-color: var(--nav-hover-bg);
  border-color: var(--button-primary-bg);
}

.edit-limit {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
  width: 100%;
}

.edit-actions {
  display: flex;
  gap: 8px;
}

.save-button, .cancel-button {
  padding: 4px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.save-button {
  background-color: var(--button-primary-bg);
  border: none;
  color: white;
}

.cancel-button {
  background-color: var(--button-secondary-bg);
  border: 1px solid var(--border-color);
  color: var(--text-color);
}

.save-button:hover {
  filter: brightness(1.1);
}

.cancel-button:hover {
  background-color: var(--nav-hover-bg);
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