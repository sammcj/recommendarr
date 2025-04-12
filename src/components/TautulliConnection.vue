<template>
  <div class="service-connection">
    <div v-if="!connected" class="connection-form">
      <h2>Connect to Tautulli</h2>
      <p class="connection-description">
        Connect to your Tautulli server to access watch history statistics.
      </p>
      
      <div class="form-group">
        <label for="baseUrl">Tautulli URL:</label>
        <input 
          id="baseUrl" 
          v-model="baseUrl" 
          type="text" 
          placeholder="http://localhost:8181"
          required
          @keyup.enter="connectToTautulli"
        />
        <div class="field-hint">The URL to your Tautulli server (e.g., http://localhost:8181)</div>
      </div>
      
      <div class="form-group">
        <label for="apiKey">API Key:</label>
        <div class="api-key-input">
          <input 
            id="apiKey" 
            v-model="apiKey" 
            :type="showApiKey ? 'text' : 'password'" 
            placeholder="Your Tautulli API key"
            required
            @keyup.enter="connectToTautulli"
          />
          <button type="button" class="toggle-button" @click="showApiKey = !showApiKey">
            {{ showApiKey ? 'Hide' : 'Show' }}
          </button>
        </div>
        <div class="field-hint">
          Found in Tautulli Settings > Web Interface > API
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
            max="10000" 
            @keyup.enter="connectToTautulli"
          />
        </div>
      </div>
      
      <div class="actions">
        <button 
          @click="connectToTautulli" 
          :disabled="isConnecting || !baseUrl || !apiKey"
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
        <h2>Tautulli Connection</h2>
        <div class="connection-status connected">
          <span class="status-icon">✓</span>
          Connected
        </div>
      </div>
      
      <div class="server-info">
        <div class="info-row">
          <span class="info-label">Server URL:</span>
          <span class="info-value">{{ baseUrl }}</span>
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
              max="10000"
            />
            <div class="edit-actions">
              <button class="save-button" @click="updateLimit">Save</button>
              <button class="cancel-button" @click="cancelEditLimit">Cancel</button>
            </div>
          </div>
        </div>
      </div>
      
      
      <div class="actions">
        <button @click="disconnectTautulli" class="disconnect-button">
          Disconnect from Tautulli
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import tautulliService from '../services/TautulliService';
import databaseStorageUtils from '../utils/DatabaseStorageUtils';
import apiService from '../services/ApiService';
import credentialsService from '../services/CredentialsService';

export default {
  name: 'TautulliConnection',
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
      recentLimit: 50,
      showApiKey: false,
      isConnecting: false,
      errorMessage: '',
      editLimit: false,
      newLimit: 50
    };
  },
  async created() {
    // If we're already connected, populate with existing credentials
    if (this.connected) {
      // Make sure credentials are loaded
      if (!tautulliService.isConfigured()) {
        await tautulliService.loadCredentials();
      }
      
      if (tautulliService.isConfigured()) {
        this.baseUrl = tautulliService.baseUrl;
        this.apiKey = tautulliService.apiKey;
        
        // Load recent limit from database
        try {
          const recentLimit = await databaseStorageUtils.getSync('tautulliRecentLimit');
          if (recentLimit !== null) {
            this.recentLimit = recentLimit;
            this.newLimit = this.recentLimit;
          }
        } catch (error) {
          console.error('Error loading Tautulli recent limit from database:', error);
          // Use default value if there's an error
          this.recentLimit = 50;
          this.newLimit = 50;
        }
      }
    }
  },
  methods: {
    async connectToTautulli() {
      if (!this.baseUrl || !this.apiKey) {
        this.errorMessage = 'Please enter both Tautulli URL and API key';
        return;
      }
      
      this.isConnecting = true;
      this.errorMessage = '';
      
      try {
        // First, try to get existing credentials to get the recentLimit
        let recentLimitToUse = this.recentLimit;
        try {
          const existingCredentials = await credentialsService.getCredentials('tautulli');
          if (existingCredentials && existingCredentials.recentLimit !== undefined) {
            recentLimitToUse = existingCredentials.recentLimit;
            
          }
        } catch (credError) {
          console.error(credError);
        }
        
        // Configure the Tautulli service with the credentials and recentLimit
        await tautulliService.configure(this.baseUrl, this.apiKey, '', recentLimitToUse);
        
        // Test the connection
        const success = await tautulliService.testConnection();
        
        if (success) {
          // Save the recent limit to database
          await databaseStorageUtils.set('tautulliRecentLimit', this.recentLimit);
          
          // Save to user settings in database using individual setting API
          try {
            await apiService.saveSetting('tautulliRecentLimit', this.recentLimit);
            
          } catch (settingsError) {
            console.error('Error saving tautulliRecentLimit to database:', settingsError);
            // Continue even if settings save fails
          }
          
          // Emit connected event
          this.$emit('connected');
          
          // Emit limit changed event
          this.$emit('limitChanged', this.recentLimit);
        } else {
          this.errorMessage = 'Could not connect to Tautulli. Please verify your credentials.';
        }
      } catch (error) {
        console.error('Error connecting to Tautulli:', error);
        this.errorMessage = error.response?.data?.message || 'Failed to connect to Tautulli';
      } finally {
        this.isConnecting = false;
      }
    },
    
    async disconnectTautulli() {
      if (confirm('Are you sure you want to disconnect from Tautulli?')) {
        await tautulliService.disconnect();
        this.$emit('disconnected');
      }
    },
    
    async updateLimit() {
      if (this.newLimit < 1) {
        this.newLimit = 1;
      } else if (this.newLimit > 10000) {
        this.newLimit = 10000;
      }
      
      this.recentLimit = this.newLimit;
      
      // Save to database
      await databaseStorageUtils.set('tautulliRecentLimit', this.recentLimit);
      this.editLimit = false;
      
      // Save to user settings in database using individual setting API
      try {
        await apiService.saveSetting('tautulliRecentLimit', this.recentLimit);
        
      } catch (settingsError) {
        console.error('Error saving tautulliRecentLimit to database:', settingsError);
        // Continue even if settings save fails
      }
      
      // Update the credentials in the database with the new limit
      try {
        // Get current credentials
        const credentials = await credentialsService.getCredentials('tautulli');
        if (credentials) {
          // Update the recentLimit
          credentials.recentLimit = this.recentLimit;
          // Store updated credentials
          await credentialsService.storeCredentials('tautulli', credentials);
        }
      } catch (credError) {
        console.error('Error updating Tautulli credentials with new limit:', credError);
        // Continue even if credentials update fails
      }
      
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
  background-color: #7c3aed; /* Tautulli purple color */
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
  background-color: #6d28d9; /* Darker purple on hover */
}

.primary-button:disabled {
  background-color: #c4b5fd; /* Light purple when disabled */
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

.user-selection {
  margin-bottom: 25px;
  text-align: center;
}

.select-user-button {
  background-color: var(--card-bg-color);
  border: 1px solid #7c3aed; /* Tautulli purple color */
  color: #7c3aed;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.select-user-button:hover {
  background-color: rgba(124, 58, 237, 0.1);
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
