<template>
  <div class="service-connection">
    <div v-if="!connected" class="connection-form">
      <h2>Connect to Trakt</h2>
      <p class="connection-description">
        Connect to your Trakt.tv account to access watch history statistics.
      </p>
      
      <div class="oauth-explanation">
        <h3>Connect with OAuth</h3>
        <p>
          This will securely connect to your Trakt account by redirecting you to Trakt.tv,
          where you can authorize this application. No need to manually create access tokens.
        </p>
        
        <div class="redirect-info">
          <strong>Important:</strong> Make sure your Trakt application has this callback URL configured:
          <div class="redirect-url">{{ redirectUri }}</div>
        </div>
        
        <div class="form-group">
          <label for="clientId">Client ID:</label>
          <input 
            id="clientId" 
            v-model="clientId" 
            type="text" 
            placeholder="Your Trakt Client ID"
            required
          />
          <div class="field-hint">Obtain by creating an app in your Trakt account settings</div>
        </div>
        
        <div class="form-group">
          <label for="clientSecret">Client Secret: <span class="optional">(Optional)</span></label>
          <div class="api-key-input">
            <input 
              id="clientSecret" 
              v-model="clientSecret" 
              :type="showSecret ? 'text' : 'password'" 
              placeholder="Your Trakt Client Secret (optional)"
            />
            <button type="button" class="toggle-button" @click="showSecret = !showSecret">
              {{ showSecret ? 'Hide' : 'Show' }}
            </button>
          </div>
          <div class="field-hint">
            Optional, but recommended. Found in your Trakt API application settings.
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
            />
          </div>
        </div>
        
        <div class="actions">
          <button 
            @click="startOAuthFlow" 
            :disabled="isConnecting || !clientId"
            class="primary-button"
          >
            <span v-if="isConnecting" class="loading-spinner"></span>
            {{ isConnecting ? 'Connecting...' : 'Connect with Trakt' }}
          </button>
        </div>
        
        <div class="oauth-note">
          <p>
            <strong>Note:</strong> You'll be redirected to Trakt.tv to securely authorize this application.
            After you authorize, you'll be redirected back here to complete the connection.
          </p>
        </div>
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
          <span class="info-label">Connection Type:</span>
          <span class="info-value">OAuth Authorization</span>
        </div>
        
        <div class="info-row">
          <span class="info-label">Client ID:</span>
          <span class="info-value">{{ maskedClientId }}</span>
        </div>
        
        <div class="info-row">
          <span class="info-label">Authorization:</span>
          <span class="info-value auth-status">
            <span class="auth-indicator connected"></span>
            Authorized
            <span class="auth-expiry" v-if="expiresAt">
              (expires {{ formatExpiryDate(expiresAt) }})
            </span>
          </span>
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
        <button @click="disconnectTrakt" class="disconnect-button">
          Disconnect from Trakt
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import traktService from '../services/TraktService';
import storageUtils from '../utils/StorageUtils';
import apiService from '../services/ApiService';

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
      clientSecret: '',
      recentLimit: 50,
      expiresAt: null,
      showSecret: false,
      isConnecting: false,
      errorMessage: '',
      editLimit: false,
      newLimit: 50,
      redirectUri: window.location.origin + '/trakt-callback'
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
    // Check for OAuth callback parameters in URL
    if (!this.connected) {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      
      if (code && state) {
        this.handleOAuthCallback(code, state);
      }
    }
    
    // If we're already connected, populate with existing credentials
    if (this.connected) {
      // Make sure credentials are loaded
      if (!traktService.isConfigured()) {
        await traktService.loadCredentials();
      }
      
      if (traktService.isConfigured()) {
        this.clientId = traktService.clientId;
        this.clientSecret = traktService.clientSecret;
        this.expiresAt = traktService.expiresAt;
        
        // Load recent limit from storageUtils instead of localStorage
        this.recentLimit = storageUtils.get('traktRecentLimit', 50);
        this.newLimit = this.recentLimit;
      }
    }
  },
  methods: {
    // Format expiry date for display
    formatExpiryDate(timestamp) {
      if (!timestamp) return 'unknown';
      const date = new Date(timestamp);
      return date.toLocaleString();
    },
    
    // Start OAuth flow
    async startOAuthFlow() {
      if (!this.clientId) {
        this.errorMessage = 'Please enter your Trakt Client ID';
        return;
      }
      
      this.isConnecting = true;
      this.errorMessage = '';
      
      try {
        // Configure Trakt service with client ID and secret
        await traktService.configure(this.clientId, this.clientSecret);
        
        // Save the recent limit to storageUtils instead of localStorage
        storageUtils.set('traktRecentLimit', this.recentLimit);
        
        // Save to user settings in database
        try {
          const userData = await apiService.getSettings();
          userData.traktRecentLimit = this.recentLimit;
          await apiService.saveSettings(userData);
        } catch (settingsError) {
          console.error('Error saving Trakt limit to user settings:', settingsError);
          // Continue even if settings save fails
        }
        
        // Start OAuth flow
        await traktService.startOAuthFlow();
        
        // The page will redirect to Trakt.tv
      } catch (error) {
        console.error('Error starting OAuth flow:', error);
        this.errorMessage = error.message || 'Failed to connect to Trakt';
        this.isConnecting = false;
      }
    },
    
    // Handle OAuth callback
    async handleOAuthCallback(code, state) {
      this.isConnecting = true;
      this.errorMessage = '';
      
      try {
        // Exchange code for token
        await traktService.handleOAuthCallback(code, state);
        
        // Test connection with the obtained token
        const success = await traktService.testConnection();
        
        if (success) {
          // Get the recent limit from storageUtils instead of localStorage
          const recentLimit = storageUtils.get('traktRecentLimit', 50);
          
          // Fetch and cache watch history after successful connection
          try {
            console.log('Fetching Trakt watch history for caching...');
            const movieHistory = await traktService.getRecentlyWatchedMovies(recentLimit);
            const showHistory = await traktService.getRecentlyWatchedShows(recentLimit);
            
            // Import ApiService and save watch history to server cache
            const { default: apiService } = await import('../services/ApiService');
            await apiService.saveWatchHistory('movies', movieHistory);
            await apiService.saveWatchHistory('shows', showHistory);
            console.log(`Cached ${movieHistory.length} movies and ${showHistory.length} shows from Trakt`);
          } catch (historyError) {
            console.error('Error fetching and caching Trakt watch history:', historyError);
            // Continue with connection success even if history fetch fails
          }
          
          // Emit connected event
          this.$emit('connected');
          
          // Emit limit changed event
          this.$emit('limitChanged', recentLimit);
          
          // Clean up URL to remove OAuth parameters
          const url = new URL(window.location.href);
          url.search = '';
          window.history.replaceState({}, document.title, url.toString());
        } else {
          this.errorMessage = 'Could not connect to Trakt after authorization.';
        }
      } catch (error) {
        console.error('Error handling OAuth callback:', error);
        this.errorMessage = error.message || 'Failed to complete Trakt authorization';
      } finally {
        this.isConnecting = false;
      }
    },
    
    async disconnectTrakt() {
      if (confirm('Are you sure you want to disconnect from Trakt? This will revoke your authorization.')) {
        // Attempt to revoke the token on Trakt.tv
        try {
          // Reset the client info but keep the form values
          await traktService.revokeAccess();
          console.log('Successfully revoked Trakt access');
        } catch (error) {
          console.error('Error revoking Trakt access:', error);
        }
        
        // Emit disconnected event
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
      
      // Use storageUtils instead of localStorage
      storageUtils.set('traktRecentLimit', this.recentLimit);
      this.editLimit = false;
      
      // Save to user settings in database
      try {
        const userData = await apiService.getSettings();
        userData.traktRecentLimit = this.recentLimit;
        await apiService.saveSettings(userData);
      } catch (settingsError) {
        console.error('Error saving Trakt limit to user settings:', settingsError);
        // Continue even if settings save fails
      }
      
      // Fetch and cache watch history with the new limit
      try {
        console.log('Fetching Trakt watch history with updated limit for caching...');
        const movieHistory = await traktService.getRecentlyWatchedMovies(this.recentLimit);
        const showHistory = await traktService.getRecentlyWatchedShows(this.recentLimit);
        
        // Save watch history to server cache
        await apiService.saveWatchHistory('movies', movieHistory);
        await apiService.saveWatchHistory('shows', showHistory);
        console.log(`Cached ${movieHistory.length} movies and ${showHistory.length} shows from Trakt with new limit`);
      } catch (historyError) {
        console.error('Error fetching and caching Trakt watch history with new limit:', historyError);
        // Continue with limit update even if history fetch fails
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

/* OAuth related styles */
.oauth-explanation {
  background-color: rgba(237, 28, 36, 0.05);
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
  border-left: 3px solid #ED1C24; /* Trakt red */
}

.oauth-explanation h3 {
  margin-top: 0;
  color: #ED1C24; /* Trakt red */
  font-size: 18px;
  margin-bottom: 10px;
}

.redirect-info {
  background-color: var(--card-bg-color);
  border-left: 3px solid #2563eb;
  padding: 10px 15px;
  margin-bottom: 20px;
  border-radius: 4px;
  color: var(--text-color);
  transition: background-color var(--transition-speed), color var(--transition-speed);
}

.redirect-url {
  font-family: monospace;
  background-color: #333;
  color: #fff;
  padding: 8px 12px;
  border-radius: 4px;
  word-break: break-all;
  margin-top: 8px;
}

.oauth-note {
  margin-top: 20px;
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 6px;
  padding: 10px 15px;
  font-size: 13px;
}

.oauth-note p {
  margin: 0;
}

.optional {
  font-size: 12px;
  font-weight: normal;
  color: #888;
}

.auth-status {
  display: flex;
  align-items: center;
}

.auth-indicator {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 8px;
}

.auth-indicator.connected {
  background-color: #4CAF50; /* Green */
  box-shadow: 0 0 5px rgba(76, 175, 80, 0.5);
}

.auth-expiry {
  display: inline-block;
  margin-left: 8px;
  font-size: 12px;
  color: #666;
  font-style: italic;
}
</style>
