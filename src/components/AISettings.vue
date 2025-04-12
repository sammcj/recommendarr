<template>
  <div class="ai-settings">
    <h2>Settings</h2>
    
    <!-- Settings Tabs -->
    <div class="settings-tabs">
      <button 
        @click="activeTab = 'account'" 
        :class="{ active: activeTab === 'account' }" 
        class="tab-button"
      >
        Account
      </button>
      <button 
        v-if="isAdmin"
        @click="activeTab = 'users'" 
        :class="{ active: activeTab === 'users' }" 
        class="tab-button"
      >
        User Management
      </button>
      <button 
        v-if="isAdmin"
        @click="activeTab = 'ai'" 
        :class="{ active: activeTab === 'ai' }" 
        class="tab-button"
      >
        AI Service
      </button>
      <button 
        v-if="isAdmin"
        @click="activeTab = 'sonarr'" 
        :class="{ active: activeTab === 'sonarr' }" 
        class="tab-button"
      >
        Sonarr
      </button>
      <button 
        v-if="isAdmin"
        @click="activeTab = 'radarr'" 
        :class="{ active: activeTab === 'radarr' }" 
        class="tab-button"
      >
        Radarr
      </button>
      <button 
        v-if="isAdmin"
        @click="activeTab = 'plex'" 
        :class="{ active: activeTab === 'plex' }" 
        class="tab-button"
      >
        Plex
      </button>
      <button 
        v-if="isAdmin"
        @click="activeTab = 'jellyfin'" 
        :class="{ active: activeTab === 'jellyfin' }" 
        class="tab-button"
      >
        Jellyfin
      </button>
      <button 
        v-if="isAdmin"
        @click="activeTab = 'tautulli'" 
        :class="{ active: activeTab === 'tautulli' }" 
        class="tab-button"
      >
        Tautulli
      </button>
      <button 
        @click="activeTab = 'trakt'" 
        :class="{ active: activeTab === 'trakt' }" 
        class="tab-button"
      >
        Trakt
      </button>
      <button 
        v-if="isAdmin"
        @click="activeTab = 'tmdb'" 
        :class="{ active: activeTab === 'tmdb' }" 
        class="tab-button"
      >
        TMDB
      </button>
      <button 
        v-if="isAdmin && (sonarrConnected || radarrConnected || plexConnected || jellyfinConnected || tautulliConnected || traktConnected)"
        @click="activeTab = 'connections'" 
        :class="{ active: activeTab === 'connections' }" 
        class="tab-button"
      >
        Connections
      </button>
    </div>
    <!-- Connections Tab -->
    <div v-if="activeTab === 'connections' && isAdmin" class="settings-section">
      <div class="settings-intro">
        <p>Manage your connected services. You can disconnect any service you no longer want to use.</p>
      </div>
      
      <div class="connected-services-wrapper section-card">
        <div class="collapsible-header" @click="toggleConnectionsPanel">
          <div class="header-content">
            <h3>Manage Connected Services</h3>
            <p class="section-description">You can disconnect any service you no longer want to use.</p>
          </div>
          <button class="collapse-toggle" @click.stop="toggleConnectionsPanel">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :class="{ rotate: !connectionsCollapsed }">
              <path d="M6 9l6 6 6-6"></path>
            </svg>
          </button>
        </div>
        <div class="collapsible-content" v-show="!connectionsCollapsed">
          <div class="connected-services">
          <button v-if="plexConnected" class="connection-button plex-button" @click="showPlexConnectModal">
            <span class="connection-name">Plex</span>
            <span class="connection-action">Manage Connection</span>
          </button>
          <button v-if="jellyfinConnected" class="connection-button jellyfin-button" @click="showJellyfinConnectModal">
            <span class="connection-name">Jellyfin</span>
            <span class="connection-action">Manage Connection</span>
          </button>
          <button v-if="tautulliConnected" class="connection-button tautulli-button" @click="showTautulliConnectModal">
            <span class="connection-name">Tautulli</span>
            <span class="connection-action">Manage Connection</span>
          </button>
          <button v-if="sonarrConnected" class="connection-button sonarr-button" @click="showSonarrConnectModal">
            <span class="connection-name">Sonarr</span>
            <span class="connection-action">Manage Connection</span>
          </button>
          <button v-if="radarrConnected" class="connection-button radarr-button" @click="showRadarrConnectModal">
            <span class="connection-name">Radarr</span>
            <span class="connection-action">Manage Connection</span>
          </button>
          <button v-if="traktConnected" class="connection-button trakt-button" @click="showTraktConnectModal">
            <span class="connection-name">Trakt</span>
            <span class="connection-action">Manage Connection</span>
          </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Connection Management Modals - These remain fixed position overlays -->
    <teleport to="body">
      <!-- Plex Connection Management Modal -->
      <div v-if="showPlexConnect" class="connection-modal-overlay" @click.self="closePlexModal">
        <div class="connection-modal">
          <div class="modal-header">
            <h3>Manage Plex Connection</h3>
            <button class="modal-close-x" @click="closePlexModal">&times;</button>
          </div>
          <div class="modal-body">
            <PlexConnection 
              :connected="plexConnected" 
              @connected="handlePlexConnected" 
              @disconnected="handlePlexDisconnected" 
            />
          </div>
          <div class="modal-footer">
            <button class="modal-close-button" @click="closePlexModal">Close</button>
          </div>
        </div>
      </div>
      
      <!-- Jellyfin Connection Management Modal -->
      <div v-if="showJellyfinConnect" class="connection-modal-overlay" @click.self="closeJellyfinModal">
        <div class="connection-modal">
          <div class="modal-header">
            <h3>Manage Jellyfin Connection</h3>
            <button class="modal-close-x" @click="closeJellyfinModal">&times;</button>
          </div>
          <div class="modal-body">
            <JellyfinConnection 
              :connected="jellyfinConnected" 
              @connected="handleJellyfinConnected" 
              @disconnected="handleJellyfinDisconnected" 
            />
          </div>
          <div class="modal-footer">
            <button class="modal-close-button" @click="closeJellyfinModal">Close</button>
          </div>
        </div>
      </div>
      
      <!-- Sonarr Connection Management Modal -->
      <div v-if="showSonarrConnect" class="connection-modal-overlay" @click.self="closeSonarrModal">
        <div class="connection-modal">
          <div class="modal-header">
            <h3>Manage Sonarr Connection</h3>
            <button class="modal-close-x" @click="closeSonarrModal">&times;</button>
          </div>
          <div class="modal-body">
            <SonarrConnection 
              :connected="sonarrConnected" 
              @connected="handleSonarrConnected" 
              @disconnected="handleSonarrDisconnected" 
            />
          </div>
          <div class="modal-footer">
            <button class="modal-close-button" @click="closeSonarrModal">Close</button>
          </div>
        </div>
      </div>
      
      <!-- Radarr Connection Management Modal -->
      <div v-if="showRadarrConnect" class="connection-modal-overlay" @click.self="closeRadarrModal">
        <div class="connection-modal">
          <div class="modal-header">
            <h3>Manage Radarr Connection</h3>
            <button class="modal-close-x" @click="closeRadarrModal">&times;</button>
          </div>
          <div class="modal-body">
            <RadarrConnection 
              :connected="radarrConnected" 
              @connected="handleRadarrConnected" 
              @disconnected="handleRadarrDisconnected" 
            />
          </div>
          <div class="modal-footer">
            <button class="modal-close-button" @click="closeRadarrModal">Close</button>
          </div>
        </div>
      </div>
      
      <!-- Tautulli Connection Management Modal -->
      <div v-if="showTautulliConnect" class="connection-modal-overlay" @click.self="closeTautulliModal">
        <div class="connection-modal">
          <div class="modal-header">
            <h3>Manage Tautulli Connection</h3>
            <button class="modal-close-x" @click="closeTautulliModal">&times;</button>
          </div>
          <div class="modal-body">
            <TautulliConnection 
              :connected="tautulliConnected" 
              @connected="handleTautulliConnected" 
              @disconnected="handleTautulliDisconnected" 
              @limitChanged="handleTautulliLimitChanged"
            />
          </div>
          <div class="modal-footer">
            <button class="modal-close-button" @click="closeTautulliModal">Close</button>
          </div>
        </div>
      </div>
      
      <!-- Trakt Connection Management Modal -->
      <div v-if="showTraktConnect" class="connection-modal-overlay" @click.self="closeTraktConnectModal">
        <div class="connection-modal">
          <div class="modal-header">
            <h3>Manage Trakt Connection</h3>
            <button class="modal-close-x" @click="closeTraktConnectModal">&times;</button>
          </div>
          <div class="modal-body">
            <TraktConnection 
              :connected="traktConnected" 
              @connected="onTraktConnectionSuccessful" 
              @disconnected="disconnectTrakt" 
              @limitChanged="onTraktLimitChange"
            />
          </div>
          <div class="modal-footer">
            <button class="modal-close-button" @click="closeTraktConnectModal">Close</button>
          </div>
        </div>
      </div>
    </teleport>
    
    <!-- User Management Tab (Admin Only) -->
    <div v-if="activeTab === 'users' && isAdmin" class="settings-section">
      <div class="settings-intro">
        <p>Manage user accounts and permissions for Recommendarr.</p>
      </div>
      
      <UserManagement />
    </div>
    
    <!-- Account Settings Tab -->
    <div v-if="activeTab === 'account'" class="settings-section">
      <div class="settings-intro">
        <p>Manage your account settings and change your password.</p>
      </div>
      
      <div class="settings-form">
        <div class="account-info">
          <h3>Account Information</h3>
          <div class="info-row">
            <span class="info-label">Username:</span>
            <span class="info-value">{{ currentUser?.username }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Role:</span>
            <span class="info-value">{{ currentUser?.isAdmin ? 'Administrator' : 'User' }}</span>
          </div>
        </div>
        
        <div class="password-change-section">
          <h3>Change Password</h3>
          <div class="form-group">
            <label for="currentPassword">Current Password:</label>
            <input 
              id="currentPassword" 
              v-model="passwordForm.currentPassword" 
              type="password" 
              placeholder="Enter your current password" 
              required
            />
          </div>
          
          <div class="form-group">
            <label for="newPassword">New Password:</label>
            <input 
              id="newPassword" 
              v-model="passwordForm.newPassword" 
              type="password" 
              placeholder="Enter your new password" 
              required
            />
          </div>
          
          <div class="form-group">
            <label for="confirmPassword">Confirm New Password:</label>
            <input 
              id="confirmPassword" 
              v-model="passwordForm.confirmPassword" 
              type="password" 
              placeholder="Confirm your new password" 
              required
            />
            <div v-if="passwordForm.newPassword && passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword" class="field-error">
              Passwords do not match
            </div>
          </div>
          
          <div class="actions">
            <button 
              type="button" 
              @click="changePassword" 
              class="save-button"
              :disabled="isChangingPassword || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword || passwordForm.newPassword !== passwordForm.confirmPassword"
            >
              <span v-if="isChangingPassword">Changing Password...</span>
              <span v-else>Change Password</span>
            </button>
          </div>
          
          <div v-if="passwordMessage" class="password-message" :class="{ 'success': passwordSuccess, 'error': !passwordSuccess }">
            {{ passwordMessage }}
          </div>
        </div>
      </div>
    </div>
    
    <!-- AI Service Settings Tab -->
    <div v-if="activeTab === 'ai'" class="settings-section">
      <div class="settings-intro">
        <p>Enter your AI service details below to enable media recommendations. Your API key will be stored locally in your browser and never sent to our servers.</p>
        <p>You can use <strong>any AI service</strong> with an OpenAI-compatible API format, including OpenAI, local models, or other providers.</p>
      </div>
      
      <div class="settings-form">
        <div class="form-group">
          <label for="apiUrl">API URL:</label>
          <input 
            id="apiUrl" 
            v-model="aiSettings.apiUrl" 
            type="text" 
            placeholder="https://api.openai.com/v1 or http://localhost:1234/v1"
            required
          />
          <div class="field-hint">The base URL of the AI service (OpenAI, local server, etc.)</div>
        </div>
        
        <div class="form-group">
          <label for="apiKey">API Key:</label>
          <div class="api-key-input">
            <input 
              id="apiKey" 
              v-model="aiSettings.apiKey" 
              :type="showApiKey ? 'text' : 'password'" 
              placeholder="Your API key (can be empty for local models)"
              @input="validateApiKey"
              @blur="validateApiKey"
            />
            <button type="button" class="toggle-button" @click="showApiKey = !showApiKey">
              {{ showApiKey ? 'Hide' : 'Show' }}
            </button>
          </div>
          <div v-if="apiKeyError" class="field-error">{{ apiKeyError }}</div>
          <div class="field-hint">The API key for authentication (not needed for some local servers)</div>
        </div>
        
        <div class="form-group">
          <label>Available Models:</label>
          <div class="model-actions">
            <button 
              type="button" 
              @click="fetchModels" 
              :disabled="isLoading"
              class="action-button"
            >
              <span class="button-icon" v-if="isLoading">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
                </svg>
              </span>
              {{ isLoading ? 'Loading Models...' : 'Fetch Available Models' }}
            </button>
          </div>
          
          <div v-if="fetchError" class="error-message">
            {{ fetchError }}
          </div>
          
          <div v-if="models.length > 0" class="models-container">
            <div class="search-box">
              <input 
                type="text" 
                v-model="modelSearch" 
                placeholder="Search models..." 
                class="model-search"
              />
              <span class="model-count">{{ filteredModels.length }} models</span>
            </div>
            
            <div class="models-list">
              <div v-for="model in filteredModels" :key="model.id" class="model-option">
                <input 
                  type="radio" 
                  :id="model.id" 
                  :value="model.id" 
                  v-model="aiSettings.selectedModel" 
                  name="model" 
                  @change="saveOnModelSelect"
                />
                <label :for="model.id" :title="model.id">{{ model.id }}</label>
              </div>
              
              <div v-if="filteredModels.length === 0" class="no-results">
                <p>No models match your search</p>
              </div>
            </div>
          </div>
          
          <div v-else-if="!fetchError && !isLoading" class="no-models">
            <p>Click "Fetch Available Models" to load models from the API</p>
          </div>
        </div>
        
        <div class="form-group">
          <label for="max-tokens">Max Tokens:</label>
          <div class="slider-container">
            <input 
              id="max-tokens" 
              v-model.number="aiSettings.maxTokens" 
              type="range" 
              min="100" 
              max="4000" 
              step="100" 
            />
            <span class="slider-value">{{ aiSettings.maxTokens }}</span>
          </div>
        </div>
        
        <div class="form-group">
          <label for="temperature">Temperature:</label>
          <div class="slider-container">
            <input 
              id="temperature" 
              v-model.number="aiSettings.temperature" 
              type="range" 
              min="0" 
              max="1" 
              step="0.1" 
            />
            <span class="slider-value">{{ aiSettings.temperature }}</span>
          </div>
        </div>
        
        <div class="actions">
          <div v-if="!aiSettings.selectedModel" class="model-warning">
            <span class="warning-icon">⚠️</span>
            <span>You must select a model for recommendations to work. Click "Fetch Available Models" after entering API URL.</span>
          </div>
          <button type="button" @click="saveAISettings" class="save-button">
            Save AI Settings
          </button>
        </div>
        
        <div class="settings-help">
          <h3>Compatible AI Services</h3>
          <p>You can use any of these services with an OpenAI-compatible API:</p>
          <ul>
            <li><strong>OpenAI:</strong> Default URL (https://api.openai.com/v1) with your <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">OpenAI API key</a></li> 
            <li><strong>LM Studio:</strong> Local URL (e.g., http://localhost:1234/v1) running models on your computer</li>
            <li><strong>Ollama:</strong> Local URL (e.g., http://localhost:11434/v1) for locally hosted models</li>
            <li><strong>Anthropic Claude:</strong> Anthropic's API with proper base URL</li>
            <li><strong>Self-hosted:</strong> Your own LLM API server with OpenAI compatibility</li>
            <li><strong>Mistral, Groq, Cohere:</strong> Most AI providers with OpenAI-compatible endpoints</li>
          </ul>
          <p class="api-note">Note: The API format must be compatible with OpenAI's chat completions endpoint.</p>
        </div>
      </div>
    </div>

    <!-- Sonarr Settings Tab -->
    <div v-if="activeTab === 'sonarr'" class="settings-section">
      <div class="settings-intro">
        <p>Connect to your Sonarr server to enable TV show recommendations. Your server details will be stored locally in your browser.</p>
      </div>
      
      <div class="settings-form">
        <div class="form-group">
          <label for="sonarrUrl">Sonarr URL:</label>
          <input 
            id="sonarrUrl" 
            v-model="sonarrSettings.baseUrl" 
            type="text" 
            placeholder="http://localhost:8989"
            required
          />
          <div class="field-hint">The URL of your Sonarr server (e.g., http://localhost:8989 or https://sonarr.yourdomain.com)</div>
        </div>
        
        <div class="form-group">
          <label for="sonarrApiKey">API Key:</label>
          <div class="api-key-input">
            <input 
              id="sonarrApiKey" 
              v-model="sonarrSettings.apiKey" 
              :type="showSonarrApiKey ? 'text' : 'password'" 
              placeholder="Your Sonarr API key"
              required
            />
            <button type="button" class="toggle-button" @click="showSonarrApiKey = !showSonarrApiKey">
              {{ showSonarrApiKey ? 'Hide' : 'Show' }}
            </button>
          </div>
          <div class="field-hint">Found in Settings > General in your Sonarr interface</div>
        </div>
        
        <div class="actions">
          <button type="button" @click="testSonarrConnection" class="test-button" :disabled="testingSonarr">
            {{ testingSonarr ? 'Testing...' : 'Test Connection' }}
          </button>
          <button type="button" @click="saveSonarrSettings" class="save-button" :disabled="testingSonarr">
            Save Sonarr Settings
          </button>
        </div>
        
        <div v-if="sonarrConnectionMessage" class="connection-message" :class="{ 'success': sonarrConnectionStatus, 'error': !sonarrConnectionStatus }">
          <div class="notification-content">
            <span class="notification-icon">
              <svg v-if="sonarrConnectionStatus" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </span>
            {{ sonarrConnectionMessage }}
          </div>
        </div>
      </div>
    </div>

    <!-- Radarr Settings Tab -->
    <div v-if="activeTab === 'radarr'" class="settings-section">
      <div class="settings-intro">
        <p>Connect to your Radarr server to enable movie recommendations. Your server details will be stored locally in your browser.</p>
      </div>
      
      <div class="settings-form">
        <div class="form-group">
          <label for="radarrUrl">Radarr URL:</label>
          <input 
            id="radarrUrl" 
            v-model="radarrSettings.baseUrl" 
            type="text" 
            placeholder="http://localhost:7878"
            required
          />
          <div class="field-hint">The URL of your Radarr server (e.g., http://localhost:7878 or https://radarr.yourdomain.com)</div>
        </div>
        
        <div class="form-group">
          <label for="radarrApiKey">API Key:</label>
          <div class="api-key-input">
            <input 
              id="radarrApiKey" 
              v-model="radarrSettings.apiKey" 
              :type="showRadarrApiKey ? 'text' : 'password'" 
              placeholder="Your Radarr API key"
              required
            />
            <button type="button" class="toggle-button" @click="showRadarrApiKey = !showRadarrApiKey">
              {{ showRadarrApiKey ? 'Hide' : 'Show' }}
            </button>
          </div>
          <div class="field-hint">Found in Settings > General in your Radarr interface</div>
        </div>
        
        <div class="actions">
          <button type="button" @click="testRadarrConnection" class="test-button" :disabled="testingRadarr">
            {{ testingRadarr ? 'Testing...' : 'Test Connection' }}
          </button>
          <button type="button" @click="saveRadarrSettings" class="save-button" :disabled="testingRadarr">
            Save Radarr Settings
          </button>
        </div>
        
        <div v-if="radarrConnectionMessage" class="connection-message" :class="{ 'success': radarrConnectionStatus, 'error': !radarrConnectionStatus }">
          <div class="notification-content">
            <span class="notification-icon">
              <svg v-if="radarrConnectionStatus" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </span>
            {{ radarrConnectionMessage }}
          </div>
        </div>
      </div>
    </div>
    
    <!-- Plex Settings Tab -->
    <div v-if="activeTab === 'plex'" class="settings-section">
      <div class="settings-intro">
        <p>Connect to your Plex server to include recently watched content in your recommendations. Your server details will be stored locally in your browser.</p>
      </div>
      
      <div class="settings-form">
        <div class="form-group">
          <label for="plexUrl">Plex URL:</label>
          <input 
            id="plexUrl" 
            v-model="plexSettings.baseUrl" 
            type="text" 
            placeholder="http://localhost:32400"
            required
          />
          <div class="field-hint">The URL of your Plex server (e.g., http://localhost:32400 or https://plex.yourdomain.com)</div>
        </div>
        
        <div class="form-group">
          <label for="plexToken">Plex Token:</label>
          <div class="api-key-input">
            <input 
              id="plexToken" 
              v-model="plexSettings.token" 
              :type="showPlexToken ? 'text' : 'password'" 
              placeholder="Your Plex authentication token"
              required
            />
            <button type="button" class="toggle-button" @click="showPlexToken = !showPlexToken">
              {{ showPlexToken ? 'Hide' : 'Show' }}
            </button>
          </div>
          <div class="field-hint">Learn how to <a href="https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/" target="_blank">find your Plex token</a></div>
        </div>
        
        <div class="form-group">
          <label for="plexRecentLimit">Number of recently watched items:</label>
          <div class="slider-container">
            <input 
              id="plexRecentLimit" 
              v-model.number="plexSettings.recentLimit" 
              type="range" 
              min="1" 
              max="10000" 
              step="1" 
              @change="savePlexLimit"
            />
            <span class="slider-value">{{ plexSettings.recentLimit }}</span>
          </div>
          <div class="field-hint">How many recently watched items to include in recommendations</div>
        </div>
        
        <div class="actions">
          <button type="button" @click="testPlexConnection" class="test-button" :disabled="testingPlex">
            {{ testingPlex ? 'Testing...' : 'Test Connection' }}
          </button>
          <button type="button" @click="savePlexSettings" class="save-button" :disabled="testingPlex">
            Save Plex Settings
          </button>
        </div>
        
        <div v-if="plexConnectionMessage" class="connection-message" :class="{ 'success': plexConnectionStatus, 'error': !plexConnectionStatus }">
          <div class="notification-content">
            <span class="notification-icon">
              <svg v-if="plexConnectionStatus" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </span>
            {{ plexConnectionMessage }}
          </div>
        </div>
      </div>
    </div>
    
    <!-- Jellyfin Settings Tab -->
    <div v-if="activeTab === 'jellyfin'" class="settings-section">
      <div class="settings-intro">
        <p>Connect to your Jellyfin server to include recently watched content in your recommendations. Your server details will be stored locally in your browser.</p>
      </div>
      
      <div class="settings-form">
        <div class="form-group">
          <label for="jellyfinUrl">Jellyfin URL:</label>
          <input 
            id="jellyfinUrl" 
            v-model="jellyfinSettings.baseUrl" 
            type="text" 
            placeholder="http://localhost:8096"
            required
          />
          <div class="field-hint">The URL of your Jellyfin server (e.g., http://localhost:8096 or https://jellyfin.yourdomain.com)</div>
        </div>
        
        <div class="form-group">
          <label for="jellyfinApiKey">API Key:</label>
          <div class="api-key-input">
            <input 
              id="jellyfinApiKey" 
              v-model="jellyfinSettings.apiKey" 
              :type="showJellyfinApiKey ? 'text' : 'password'" 
              placeholder="Your Jellyfin API key"
              required
            />
            <button type="button" class="toggle-button" @click="showJellyfinApiKey = !showJellyfinApiKey">
              {{ showJellyfinApiKey ? 'Hide' : 'Show' }}
            </button>
          </div>
          <div class="field-hint">Found in Dashboard > API Keys in your Jellyfin admin interface</div>
        </div>
        
        <div class="form-group">
          <label for="jellyfinUsername">Username:</label>
          <input
            id="jellyfinUsername"
            v-model="jellyfinSettings.username"
            type="text"
            placeholder="Your Jellyfin Username"
            :disabled="testingJellyfin"
            required
          />
          <div class="field-hint">
            Enter your Jellyfin username (the name you use to log in)
          </div>
        </div>
        
        <div class="form-group">
          <label for="jellyfinRecentLimit">Number of recently watched items:</label>
          <div class="slider-container">
            <input 
              id="jellyfinRecentLimit" 
              v-model.number="jellyfinSettings.recentLimit" 
              type="range" 
              min="1" 
              max="10000" 
              step="1" 
            />
            <span class="slider-value">{{ jellyfinSettings.recentLimit }}</span>
          </div>
          <div class="field-hint">How many recently watched items to include in recommendations</div>
        </div>
        
        <div class="actions">
          <button type="button" @click="testJellyfinConnection" class="test-button" :disabled="testingJellyfin">
            {{ testingJellyfin ? 'Testing...' : 'Test Connection' }}
          </button>
          <button type="button" @click="saveJellyfinSettings" class="save-button" :disabled="testingJellyfin">
            Save Jellyfin Settings
          </button>
        </div>
        
        <div v-if="jellyfinConnectionMessage" class="connection-message" :class="{ 'success': jellyfinConnectionStatus, 'error': !jellyfinConnectionStatus }">
          <div class="notification-content">
            <span class="notification-icon">
              <svg v-if="jellyfinConnectionStatus" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </span>
            {{ jellyfinConnectionMessage }}
          </div>
        </div>
      </div>
    </div>
    
    <!-- Tautulli Settings Tab -->
    <div v-if="activeTab === 'tautulli'" class="settings-section">
      <div class="settings-intro">
        <p>Connect to your Tautulli server to access watch history statistics for Plex users. Your server details will be stored locally in your browser.</p>
      </div>
      
      <div class="settings-form">
        <div class="form-group">
          <label for="tautulliUrl">Tautulli URL:</label>
          <input 
            id="tautulliUrl" 
            v-model="tautulliSettings.baseUrl" 
            type="text" 
            placeholder="http://localhost:8181"
            required
          />
          <div class="field-hint">The URL of your Tautulli server (e.g., http://localhost:8181 or https://tautulli.yourdomain.com)</div>
        </div>
        
        <div class="form-group">
          <label for="tautulliApiKey">API Key:</label>
          <div class="api-key-input">
            <input 
              id="tautulliApiKey" 
              v-model="tautulliSettings.apiKey" 
              :type="showTautulliApiKey ? 'text' : 'password'" 
              placeholder="Your Tautulli API key"
              required
            />
            <button type="button" class="toggle-button" @click="showTautulliApiKey = !showTautulliApiKey">
              {{ showTautulliApiKey ? 'Hide' : 'Show' }}
            </button>
          </div>
          <div class="field-hint">Found in Tautulli Settings > Web Interface > API</div>
        </div>
        
        <div class="form-group">
          <label for="tautulliRecentLimit">Number of recently watched items:</label>
          <div class="slider-container">
            <input 
              id="tautulliRecentLimit" 
              v-model.number="tautulliSettings.recentLimit" 
              type="range" 
              min="1" 
              max="10000" 
              step="1" 
            />
            <span class="slider-value">{{ tautulliSettings.recentLimit }}</span>
          </div>
          <div class="field-hint">How many recently watched items to include in recommendations</div>
        </div>
        
        <div class="actions">
          <button type="button" @click="testTautulliConnection" class="test-button" :disabled="testingTautulli">
            {{ testingTautulli ? 'Testing...' : 'Test Connection' }}
          </button>
          <button type="button" @click="saveTautulliSettings" class="save-button" :disabled="testingTautulli">
            Save Tautulli Settings
          </button>
        </div>
        
        <div v-if="tautulliConnectionMessage" class="connection-message" :class="{ 'success': tautulliConnectionStatus, 'error': !tautulliConnectionStatus }">
          <div class="notification-content">
            <span class="notification-icon">
              <svg v-if="tautulliConnectionStatus" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </span>
            {{ tautulliConnectionMessage }}
          </div>
        </div>
      </div>
    </div>
    
    <!-- Trakt Settings Tab -->
    <div v-if="activeTab === 'trakt'" class="settings-section">
      <div class="settings-intro">
        <p>Connect to your Trakt.tv account to access your watch history. Authentication is managed securely through OAuth.</p>
      </div>
      
      <div v-if="!traktConnected">
        <TraktConnection 
          :connected="traktConnected" 
          @connected="handleTraktConnected" 
          @limitChanged="handleTraktLimitChanged"
        />
      </div>
      
      <div v-else class="settings-form">
        <div class="connected-service">
          <div class="service-header">
            <div class="service-name">
              <span class="connection-icon trakt">T</span>
              <h3>Trakt.tv</h3>
            </div>
            <div class="connection-badge connected">
              <span class="badge-icon">✓</span>
              Connected
            </div>
          </div>
          
          <div class="service-details">
            <div class="detail-row">
              <span class="detail-label">Authentication:</span>
              <span class="detail-value">OAuth (secure token)</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Recent History Limit:</span>
              <span class="detail-value">{{ traktSettings.recentLimit }} items</span>
            </div>
          </div>
          
          <div class="form-group">
            <label for="traktRecentLimit">Number of recently watched items:</label>
            <div class="slider-container">
              <input 
                id="traktRecentLimit" 
                v-model.number="traktSettings.recentLimit" 
                type="range" 
                min="1" 
                max="10000" 
                step="1" 
              />
              <span class="slider-value">{{ traktSettings.recentLimit }}</span>
            </div>
            <div class="field-hint">How many recently watched items to include in recommendations</div>
          </div>
          
          <div class="actions">
            <button type="button" @click="saveTraktLimit" class="save-button">
              Update Limit
            </button>
            <button type="button" @click="reconnectTrakt" class="reconnect-button">
              Reconnect with OAuth
            </button>
            <button type="button" @click="disconnectTrakt" class="disconnect-button">
              Disconnect from Trakt
            </button>
          </div>
        </div>
        
        <div v-if="traktConnectionMessage" class="connection-message" :class="{ 'success': traktConnectionStatus, 'error': !traktConnectionStatus }">
          <div class="notification-content">
            <span class="notification-icon">
              <svg v-if="traktConnectionStatus" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </span>
            {{ traktConnectionMessage }}
          </div>
        </div>
      </div>
    </div>
    
    <!-- TMDB Settings Tab -->
    <div v-if="activeTab === 'tmdb'" class="settings-section">
      <div class="settings-intro">
        <p>Connect to The Movie Database (TMDB) API to retrieve poster images and movie/TV show information when Sonarr/Radarr isn't available.</p>
      </div>
      
      <div class="settings-form">
        <TMDBConnection />
      </div>
    </div>
    
    
    <!-- Fixed Position Notification Toast -->
    <div v-if="saveMessage" class="save-notification" :class="{ 'success': saveSuccess, 'error': !saveSuccess }">
      <div class="notification-content">
        <span class="notification-icon">
          <svg v-if="saveSuccess" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </span>
        {{ saveMessage }}
      </div>
    </div>
  </div>
</template>

<script>
import openAIService from '../services/OpenAIService';
import sonarrService from '../services/SonarrService';
import radarrService from '../services/RadarrService';
import plexService from '../services/PlexService';
import jellyfinService from '../services/JellyfinService';
import tautulliService from '../services/TautulliService';
import traktService from '../services/TraktService';
import credentialsService from '../services/CredentialsService';
import authService from '../services/AuthService';
import apiService from '../services/ApiService';
import databaseStorageUtils from '../utils/DatabaseStorageUtils';
import PlexConnection from './PlexConnection.vue';
import JellyfinConnection from './JellyfinConnection.vue';
import TautulliConnection from './TautulliConnection.vue';
import SonarrConnection from './SonarrConnection.vue';
import RadarrConnection from './RadarrConnection.vue';
import TraktConnection from './TraktConnection.vue';
import TMDBConnection from './TMDBConnection.vue';
import UserManagement from './UserManagement.vue';

export default {
  name: 'AIServiceSettings',
  components: {
    PlexConnection,
    JellyfinConnection,
    TautulliConnection,
    SonarrConnection,
    RadarrConnection,
    TraktConnection,
    TMDBConnection,
    UserManagement
  },
  props: {
    sonarrConnected: {
      type: Boolean,
      default: false
    },
    radarrConnected: {
      type: Boolean,
      default: false
    },
    plexConnected: {
      type: Boolean,
      default: false
    },
    jellyfinConnected: {
      type: Boolean,
      default: false
    },
    tautulliConnected: {
      type: Boolean,
      default: false
    },
    traktConnected: {
      type: Boolean,
      default: false
    },
    defaultActiveTab: {
      type: String,
      default: 'account'
    }
  },
    data() {
      return {
        activeTab: this.defaultActiveTab,
        connectionsCollapsed: false,
        showSonarrConnect: false,
      showRadarrConnect: false,
      showPlexConnect: false,
      showJellyfinConnect: false,
      showTautulliConnect: false,
      showTraktConnect: false,
      
      // Account related data
      currentUser: authService.getUser(),
      passwordForm: {
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      },
      isChangingPassword: false,
      passwordMessage: '',
      passwordSuccess: false,
      
      // AI Settings
      aiSettings: {
        apiUrl: '',
        apiKey: '',
        selectedModel: '',
        maxTokens: 4000,
        temperature: 0.8
      },
      models: [],
      modelSearch: '',
      showApiKey: false,
      isLoading: false,
      fetchError: null,
      apiKeyError: null,
      
      // Sonarr Settings
      sonarrSettings: {
        baseUrl: '',
        apiKey: ''
      },
      showSonarrApiKey: false,
      testingSonarr: false,
      sonarrConnectionMessage: '',
      sonarrConnectionStatus: false,
      
      // Radarr Settings
      radarrSettings: {
        baseUrl: '',
        apiKey: ''
      },
      showRadarrApiKey: false,
      testingRadarr: false,
      radarrConnectionMessage: '',
      radarrConnectionStatus: false,
      
      // Plex Settings
      plexSettings: {
        baseUrl: '',
        token: '',
        recentLimit: 10
      },
      showPlexToken: false,
      testingPlex: false,
      plexConnectionMessage: '',
      plexConnectionStatus: false,
      
      // Jellyfin Settings
      jellyfinSettings: {
        baseUrl: '',
        apiKey: '',
        userId: '',
        username: '',
        recentLimit: 10
      },
      showJellyfinApiKey: false,
      testingJellyfin: false,
      jellyfinConnectionMessage: '',
      jellyfinConnectionStatus: false,
      
      // Tautulli Settings
      tautulliSettings: {
        baseUrl: '',
        apiKey: '',
        recentLimit: 50
      },
      showTautulliApiKey: false,
      testingTautulli: false,
      tautulliConnectionMessage: '',
      tautulliConnectionStatus: false,
      
      // Trakt Settings
      traktSettings: {
        clientId: '',
        accessToken: '',
        recentLimit: 50
      },
      showTraktToken: false,
      testingTrakt: false,
      traktConnectionMessage: '',
      traktConnectionStatus: false,
      
      // Common
      saveMessage: '',
      saveSuccess: false
    };
  },
  computed: {
    filteredModels() {
      if (!this.modelSearch) {
        return this.models;
      }
      
      const search = this.modelSearch.toLowerCase();
      return this.models.filter(model => 
        model.id.toLowerCase().includes(search)
      );
    },
    isAdmin() {
      return authService.isAdmin();
    }
  },
  async created() {
    // Load saved settings initially
    this.loadAllSettings();
  },
  
  mounted() {
    // Check if we should activate a specific tab (set by App.vue's handleNavigate)
    const activeTabFromNav = localStorage.getItem('aiSettingsActiveTab');
    if (activeTabFromNav) {
      this.activeTab = activeTabFromNav;
      // Clear the value after using it
      localStorage.removeItem('aiSettingsActiveTab');
    }
  },
  
  watch: {
    // Watch for tab changes to reload credentials when a tab is visited
    activeTab: {
      handler(newTab) {
        // Load the appropriate credentials when the tab changes
        switch(newTab) {
          case 'sonarr':
            this.loadSonarrSettings();
            break;
          case 'radarr':
            this.loadRadarrSettings();
            break;
          case 'plex':
            this.loadPlexSettings();
            break;
          case 'jellyfin':
            this.loadJellyfinSettings();
            break;
          case 'tautulli':
            this.loadTautulliSettings();
            break;
          case 'ai':
            this.loadAISettings();
            break;
        }
      },
      immediate: true
    },
    // Watch for changes to the defaultActiveTab prop
    defaultActiveTab: {
      handler(newTab) {
        if (newTab) {
          this.activeTab = newTab;
        }
      }
    }
  },
  methods: {
    // Collapsible Panel Methods
    // Collapsible Panel Methods
    toggleConnectionsPanel() {
      this.connectionsCollapsed = !this.connectionsCollapsed;
    },

    // Modal Show/Hide Methods
    showPlexConnectModal() {
      this.showPlexConnect = true;
      document.body.style.overflow = 'hidden'; // Prevent scrolling behind modal
    },
    
    closePlexModal() {
      this.showPlexConnect = false;
      document.body.style.overflow = '';
    },
    
    showJellyfinConnectModal() {
      this.showJellyfinConnect = true;
      document.body.style.overflow = 'hidden';
    },
    
    closeJellyfinModal() {
      this.showJellyfinConnect = false;
      document.body.style.overflow = '';
    },
    
    showSonarrConnectModal() {
      this.showSonarrConnect = true;
      document.body.style.overflow = 'hidden';
    },
    
    closeSonarrModal() {
      this.showSonarrConnect = false;
      document.body.style.overflow = '';
    },
    
    showRadarrConnectModal() {
      this.showRadarrConnect = true;
      document.body.style.overflow = 'hidden';
    },
    
    closeRadarrModal() {
      this.showRadarrConnect = false;
      document.body.style.overflow = '';
    },
    
    showTautulliConnectModal() {
      this.showTautulliConnect = true;
      document.body.style.overflow = 'hidden';
    },
    
    closeTautulliModal() {
      this.showTautulliConnect = false;
      document.body.style.overflow = '';
    },
    
    showTraktConnectModal() {
      this.showTraktConnect = true;
      document.body.style.overflow = 'hidden';
    },
    
    closeTraktModal() {
      this.showTraktConnect = false;
      document.body.style.overflow = '';
    },
    
    // Connection Event Handlers
    handleSonarrConnected() {
      this.$emit('sonarr-settings-updated');
      this.closeSonarrModal();
    },
    
    handleSonarrDisconnected() {
      // Clear Sonarr settings in the form
      this.sonarrSettings.baseUrl = '';
      this.sonarrSettings.apiKey = '';
      this.$emit('sonarr-settings-updated');
      this.closeSonarrModal();
    },
    
    handleRadarrConnected() {
      this.$emit('radarr-settings-updated');
      this.closeRadarrModal();
    },
    
    handleRadarrDisconnected() {
      // Clear Radarr settings in the form
      this.radarrSettings.baseUrl = '';
      this.radarrSettings.apiKey = '';
      this.$emit('radarr-settings-updated');
      this.closeRadarrModal();
    },
    
    handlePlexConnected() {
      this.$emit('plex-settings-updated');
      this.closePlexModal();
    },
    
    handlePlexDisconnected() {
      // Clear Plex settings in the form
      this.plexSettings.baseUrl = '';
      this.plexSettings.token = '';
      this.plexSettings.recentLimit = 10;
      this.$emit('plex-settings-updated');
      this.closePlexModal();
    },
    
    handleJellyfinConnected() {
      this.$emit('jellyfin-settings-updated');
      this.closeJellyfinModal();
    },
    
    handleJellyfinDisconnected() {
      // Clear Jellyfin settings in the form
      this.jellyfinSettings.baseUrl = '';
      this.jellyfinSettings.apiKey = '';
      this.jellyfinSettings.userId = '';
      this.jellyfinSettings.recentLimit = 10;
      this.$emit('jellyfin-settings-updated');
      this.closeJellyfinModal();
    },
    
    handleTautulliConnected() {
      this.$emit('tautulli-settings-updated');
      this.closeTautulliModal();
    },
    
    handleTautulliDisconnected() {
      // Clear Tautulli settings in the form
      this.tautulliSettings.baseUrl = '';
      this.tautulliSettings.apiKey = '';
      this.tautulliSettings.recentLimit = 50;
      
      // Close the modal
      this.closeTautulliModal();
      
      // Notify parent components
      this.$emit('tautulli-disconnected');
      this.$emit('tautulli-settings-updated');
      
      this.saveSuccess = true;
      this.saveMessage = 'Disconnected from Tautulli successfully';
      this.clearSaveMessage();
    },
    
    handleTraktConnected() {
      this.$emit('trakt-settings-updated');
      this.closeTraktModal();
    },
    
    handleTraktDisconnected() {
      // Clear Trakt settings in the form
      this.traktSettings.clientId = '';
      this.traktSettings.accessToken = '';
      this.traktSettings.recentLimit = 50;
      this.$emit('trakt-settings-updated');
      this.closeTraktModal();
    },
    
    handleTraktLimitChanged(limit) {
      this.traktSettings.recentLimit = limit;
    },
    
    async loadAllSettings() {
      // Load all settings from their respective services
      await this.loadAISettings();
      await this.loadSonarrSettings();
      await this.loadRadarrSettings();
      await this.loadPlexSettings();
      await this.loadJellyfinSettings();
      await this.loadTautulliSettings();
      await this.loadTraktSettings();
    },
    
    async loadAISettings() {
      try {
        // First try to get from service directly
        if (openAIService.isConfigured()) {
          this.aiSettings.apiUrl = openAIService.baseUrl;
          this.aiSettings.apiKey = openAIService.apiKey;
          this.aiSettings.selectedModel = openAIService.model;
          this.aiSettings.maxTokens = openAIService.maxTokens;
          this.aiSettings.temperature = openAIService.temperature;
          return;
        }
        
        // If not configured, try to get from server-side storage
        const credentials = await credentialsService.getCredentials('openai');
        if (credentials) {
          this.aiSettings.apiUrl = credentials.apiUrl || 'https://api.openai.com/v1';
          this.aiSettings.apiKey = credentials.apiKey || '';
          this.aiSettings.selectedModel = credentials.model || 'gpt-3.5-turbo';
          this.aiSettings.maxTokens = credentials.maxTokens ? parseInt(credentials.maxTokens) : 4000;
          this.aiSettings.temperature = credentials.temperature ? parseFloat(credentials.temperature) : 0.8;
        }
      } catch (error) {
        console.error('Error loading OpenAI settings:', error);
      }
    },
    
    validateApiKey() {
      this.apiKeyError = null;
      
      // Only validate if using the official OpenAI API
      if (this.aiSettings.apiUrl && this.aiSettings.apiUrl.startsWith('https://api.openai')) {
        // Check if API key is empty or just whitespace
        if (!this.aiSettings.apiKey || this.aiSettings.apiKey.trim() === '') {
          this.apiKeyError = 'OpenAI API requires a valid API key';
          return false;
        }
        
        // Check if it starts with "sk-" for OpenAI keys
        if (!this.aiSettings.apiKey.trim().startsWith('sk-')) {
          this.apiKeyError = 'OpenAI API keys typically start with "sk-"';
          // Don't return false here as some keys might be different
        }
      }
      
      return true;
    },
    
    async loadSonarrSettings() {
      try {
        // First try to get from service directly
        if (sonarrService.isConfigured()) {
          this.sonarrSettings.baseUrl = sonarrService.baseUrl;
          this.sonarrSettings.apiKey = sonarrService.apiKey;
          return;
        }
        
        // If not configured, try to get from server-side storage
        const credentials = await credentialsService.getCredentials('sonarr');
        if (credentials) {
          this.sonarrSettings.baseUrl = credentials.baseUrl || '';
          this.sonarrSettings.apiKey = credentials.apiKey || '';
        }
      } catch (error) {
        console.error('Error loading Sonarr settings:', error);
      }
    },
    
    async loadRadarrSettings() {
      try {
        // First try to get from service directly
        if (radarrService.isConfigured()) {
          this.radarrSettings.baseUrl = radarrService.baseUrl;
          this.radarrSettings.apiKey = radarrService.apiKey;
          return;
        }
        
        // If not configured, try to get from server-side storage
        const credentials = await credentialsService.getCredentials('radarr');
        if (credentials) {
          this.radarrSettings.baseUrl = credentials.baseUrl || '';
          this.radarrSettings.apiKey = credentials.apiKey || '';
        }
      } catch (error) {
        console.error('Error loading Radarr settings:', error);
      }
    },
    
    async loadPlexSettings() {
      try {
        // First try to get from service directly
        if (plexService.isConfigured()) {
          this.plexSettings.baseUrl = plexService.baseUrl;
          this.plexSettings.token = plexService.token;
          this.plexSettings.recentLimit = databaseStorageUtils.getSync('plexRecentLimit');
          return;
        }
        
        // If not configured, try to get from server-side storage
        const credentials = await credentialsService.getCredentials('plex');
        if (credentials) {
          this.plexSettings.token = credentials.token || '';
          this.plexSettings.recentLimit = databaseStorageUtils.getSync('plexRecentLimit');
        }
      } catch (error) {
        console.error('Error loading Plex settings:', error);
      }
    },
    
    async loadJellyfinSettings() {
      try {
        // First try to get from service directly
        if (jellyfinService.isConfigured()) {
          this.jellyfinSettings.baseUrl = jellyfinService.baseUrl;
          this.jellyfinSettings.apiKey = jellyfinService.apiKey;
          this.jellyfinSettings.baseUrl = jellyfinService.baseUrl;
          this.jellyfinSettings.apiKey = jellyfinService.apiKey;
          this.jellyfinSettings.userId = jellyfinService.userId;
          this.jellyfinSettings.username = jellyfinService.username; // Load username directly from service
          this.jellyfinSettings.recentLimit = databaseStorageUtils.getSync('jellyfinRecentLimit');
          return;
        }
        
        // If not configured, try to get from server-side storage
        const credentials = await credentialsService.getCredentials('jellyfin');
        if (credentials) {
          this.jellyfinSettings.baseUrl = credentials.baseUrl || '';
          this.jellyfinSettings.apiKey = credentials.apiKey || '';
          this.jellyfinSettings.username = credentials.username || ''; // Load username from credentials
          this.jellyfinSettings.userId = credentials.userId || ''; // Keep loading userId for potential future use
          this.jellyfinSettings.recentLimit = databaseStorageUtils.getSync('jellyfinRecentLimit');
        }
      } catch (error) {
        console.error('Error loading Jellyfin settings:', error);
      }
    },
    
    async loadTautulliSettings() {
      try {
        // First try to get from service directly
        if (tautulliService.isConfigured()) {
          this.tautulliSettings.baseUrl = tautulliService.baseUrl;
          this.tautulliSettings.apiKey = tautulliService.apiKey;
          this.tautulliSettings.recentLimit = databaseStorageUtils.getSync('tautulliRecentLimit', 50);
          return;
        }
        
        // If not configured, try to get from server-side storage
        const credentials = await credentialsService.getCredentials('tautulli');
        if (credentials) {
          this.tautulliSettings.baseUrl = credentials.baseUrl || '';
          this.tautulliSettings.apiKey = credentials.apiKey || '';
          this.tautulliSettings.recentLimit = databaseStorageUtils.getSync('tautulliRecentLimit', 50);
        }
      } catch (error) {
        console.error('Error loading Tautulli settings:', error);
      }
    },
    
    async loadTraktSettings() {
      try {
        // First try to get from service directly
        if (traktService.isConfigured()) {
          this.traktSettings.clientId = traktService.clientId;
          this.traktSettings.recentLimit = databaseStorageUtils.getSync('traktRecentLimit', 50);
          return;
        }
        
        // If not configured, try to get from server-side storage
        const credentials = await credentialsService.getCredentials('trakt');
        if (credentials) {
          this.traktSettings.clientId = credentials.clientId || '';
          this.traktSettings.recentLimit = databaseStorageUtils.getSync('traktRecentLimit', 50);
        }
      } catch (error) {
        console.error('Error loading Trakt settings:', error);
      }
    },
    
    // AI Service Methods
    async fetchModels() {
      // Normalize the API URL
      if (this.aiSettings.apiUrl) {
        // Ensure URL starts with http:// or https://
        if (!this.aiSettings.apiUrl.match(/^https?:\/\//)) {
          this.aiSettings.apiUrl = 'http://' + this.aiSettings.apiUrl;
        }
        
        // Remove trailing slashes
        this.aiSettings.apiUrl = this.aiSettings.apiUrl.replace(/\/+$/, '');
        
        // Validate URL format
        try {
          new URL(this.aiSettings.apiUrl);
        } catch (e) {
          this.fetchError = 'Invalid API URL format';
          return;
        }
      } else {
        this.fetchError = 'API URL is required';
        return;
      }
      
      this.isLoading = true;
      this.fetchError = null;
      this.models = [];
      
      try {
        // Check if it's an OpenAI official API (requires API key)
        const isOpenAIApi = this.aiSettings.apiUrl.startsWith('https://api.openai');
        
        // Skip API key validation for non-OpenAI endpoints (local servers might not need keys)
        if (isOpenAIApi && (!this.aiSettings.apiKey || this.aiSettings.apiKey.trim() === '')) {
          this.fetchError = 'OpenAI API requires an API key';
          this.isLoading = false;
          return;
        }
        
        // For non-OpenAI endpoints, we proceed even without an API key
        
        // Configure OpenAI service temporarily with the current settings
        await openAIService.configure(
          this.aiSettings.apiKey,
          this.aiSettings.selectedModel || 'gpt-3.5-turbo',
          this.aiSettings.apiUrl,
          this.aiSettings.maxTokens,
          this.aiSettings.temperature,
          null,
          null,
          null,
          null
        );
        
        // Use the service to fetch models (which uses direct or proxy request based on API URL)
        const modelsList = await openAIService.fetchModels();
        
        if (modelsList && modelsList.length > 0) {
          // Store the models
          this.models = modelsList;
          
          // Sort models alphabetically
          this.models.sort((a, b) => a.id.localeCompare(b.id));
          
          // If no model is selected, select the first one
          if (!this.aiSettings.selectedModel && this.models.length > 0) {
            this.aiSettings.selectedModel = this.models[0].id;
          }
          
          // Auto-save settings after successful model fetch
          if (this.models.length > 0) {
            this.saveAISettings();
          }
        } else {
          this.fetchError = 'No models returned from API';
        }
      } catch (error) {
        console.error('Error fetching models:', error);
        
        // Try to extract meaningful error message
        if (error.message) {
          this.fetchError = error.message;
        } else if (error.error?.message) {
          this.fetchError = error.error.message;
        } else if (typeof error === 'string') {
          this.fetchError = error;
        } else {
          this.fetchError = 'Failed to fetch models. Check your API URL and credentials.';
        }
      } finally {
        this.isLoading = false;
      }
    },
    
    async saveAISettings() {
      try {
        // Validate the API URL
        if (this.aiSettings.apiUrl) {
          // Normalize API URL by ensuring it starts with http:// or https://
          if (!this.aiSettings.apiUrl.match(/^https?:\/\//)) {
            this.aiSettings.apiUrl = 'http://' + this.aiSettings.apiUrl;
          }
          
          // Remove trailing slashes
          this.aiSettings.apiUrl = this.aiSettings.apiUrl.replace(/\/+$/, '');
          
          // Basic URL validation
          try {
            new URL(this.aiSettings.apiUrl);
          } catch (e) {
            this.saveSuccess = false;
            this.saveMessage = 'Invalid API URL format';
            this.clearSaveMessage();
            return;
          }
        }
        
        // Check if it's the official OpenAI API, which requires an API key
        const isOpenAIApi = this.aiSettings.apiUrl.startsWith('https://api.openai');
        
        // Validate API key only for OpenAI API
        if (isOpenAIApi && !this.validateApiKey()) {
          this.saveSuccess = false;
          this.saveMessage = this.apiKeyError || 'Invalid API key';
          this.clearSaveMessage();
          return;
        }
        
        // Trim API key to remove any accidental whitespace
        if (this.aiSettings.apiKey) {
          this.aiSettings.apiKey = this.aiSettings.apiKey.trim();
        }
        
        // Update the service (which will store credentials server-side)
        await openAIService.configure(
          this.aiSettings.apiKey, 
          this.aiSettings.selectedModel,
          this.aiSettings.apiUrl,
          this.aiSettings.maxTokens,
          this.aiSettings.temperature,
          null,
          null,
          null,
          null
        );
        
        this.saveSuccess = true;
        this.saveMessage = 'AI settings saved successfully!';
        
        // Emit event to notify parent component
        this.$emit('settings-updated');
        
        // Clear message after a delay
        this.clearSaveMessage();
      } catch (error) {
        console.error('Error saving AI settings:', error);
        this.saveSuccess = false;
        this.saveMessage = 'Failed to save AI settings';
        this.clearSaveMessage();
      }
    },
    
    // Sonarr Service Methods
    async testSonarrConnection() {
      if (!this.sonarrSettings.baseUrl || !this.sonarrSettings.apiKey) {
        this.sonarrConnectionStatus = false;
        this.sonarrConnectionMessage = 'URL and API key are required';
        return;
      }
      
      this.testingSonarr = true;
      this.sonarrConnectionMessage = '';
      
      try {
        // Configure the service with provided details
        await sonarrService.configure(this.sonarrSettings.baseUrl, this.sonarrSettings.apiKey);
        
        // Test the connection
        const success = await sonarrService.testConnection();
        
        // Update status based on response
        this.sonarrConnectionStatus = success;
        this.sonarrConnectionMessage = success 
          ? 'Connected successfully!'
          : 'Connection failed. Please check your URL and API key.';
          
        // If successful, emit event to notify parent component
        if (success) {
          this.$emit('sonarr-settings-updated');
        }
          
      } catch (error) {
        console.error('Error connecting to Sonarr:', error);
        this.sonarrConnectionStatus = false;
        this.sonarrConnectionMessage = 'Connection error. Please check your URL and API key.';
      } finally {
        this.testingSonarr = false;
      }
    },
    
    async saveSonarrSettings() {
      try {
        if (!this.sonarrSettings.baseUrl || !this.sonarrSettings.apiKey) {
          this.saveSuccess = false;
          this.saveMessage = 'Sonarr URL and API key are required';
          this.clearSaveMessage();
          return;
        }
        
        // Configure the service (which will store credentials server-side)
        await sonarrService.configure(this.sonarrSettings.baseUrl, this.sonarrSettings.apiKey);
        
        this.saveSuccess = true;
        this.saveMessage = 'Sonarr settings saved successfully!';
        
        // Emit event to notify parent component that Sonarr settings were updated
        this.$emit('sonarr-settings-updated');
        
        this.clearSaveMessage();
      } catch (error) {
        console.error('Error saving Sonarr settings:', error);
        this.saveSuccess = false;
        this.saveMessage = 'Failed to save Sonarr settings';
        this.clearSaveMessage();
      }
    },
    
    // Radarr Service Methods
    async testRadarrConnection() {
      if (!this.radarrSettings.baseUrl || !this.radarrSettings.apiKey) {
        this.radarrConnectionStatus = false;
        this.radarrConnectionMessage = 'URL and API key are required';
        return;
      }
      
      this.testingRadarr = true;
      this.radarrConnectionMessage = '';
      
      try {
        // Configure the service with provided details
        await radarrService.configure(this.radarrSettings.baseUrl, this.radarrSettings.apiKey);
        
        // Test the connection
        const success = await radarrService.testConnection();
        
        // Update status based on response
        this.radarrConnectionStatus = success;
        this.radarrConnectionMessage = success 
          ? 'Connected successfully!'
          : 'Connection failed. Please check your URL and API key.';
        
        // If successful, emit event to notify parent component
        if (success) {
          this.$emit('radarr-settings-updated');
        }
          
      } catch (error) {
        console.error('Error connecting to Radarr:', error);
        this.radarrConnectionStatus = false;
        this.radarrConnectionMessage = 'Connection error. Please check your URL and API key.';
      } finally {
        this.testingRadarr = false;
      }
    },
    
    async saveRadarrSettings() {
      try {
        if (!this.radarrSettings.baseUrl || !this.radarrSettings.apiKey) {
          this.saveSuccess = false;
          this.saveMessage = 'Radarr URL and API key are required';
          this.clearSaveMessage();
          return;
        }
        
        // Configure the service (which will store credentials server-side)
        await radarrService.configure(this.radarrSettings.baseUrl, this.radarrSettings.apiKey);
        
        this.saveSuccess = true;
        this.saveMessage = 'Radarr settings saved successfully!';
        
        // Emit event to notify parent component that Radarr settings were updated
        this.$emit('radarr-settings-updated');
        
        this.clearSaveMessage();
      } catch (error) {
        console.error('Error saving Radarr settings:', error);
        this.saveSuccess = false;
        this.saveMessage = 'Failed to save Radarr settings';
        this.clearSaveMessage();
      }
    },
    
    // Plex Service Methods
    async testPlexConnection() {
      if (!this.plexSettings.baseUrl || !this.plexSettings.token) {
        this.plexConnectionStatus = false;
        this.plexConnectionMessage = 'URL and Plex token are required';
        return;
      }
      
      this.testingPlex = true;
      this.plexConnectionMessage = '';
      
      try {
        // Configure the service with provided details
        await plexService.configure(this.plexSettings.baseUrl, this.plexSettings.token);
        
        // Store the recent limit in database (server doesn't need this)
        await databaseStorageUtils.set('plexRecentLimit', this.plexSettings.recentLimit);
        
        // Test the connection
        const success = await plexService.testConnection();
        
        // Update status based on response
        this.plexConnectionStatus = success;
        this.plexConnectionMessage = success 
          ? 'Connected successfully!'
          : 'Connection failed. Please check your URL and Plex token.';
        
        // If successful, emit event to notify parent component
        if (success) {
          this.$emit('plex-settings-updated');
        }
          
      } catch (error) {
        console.error('Error connecting to Plex:', error);
        this.plexConnectionStatus = false;
        this.plexConnectionMessage = 'Connection error. Please check your URL and Plex token.';
      } finally {
        this.testingPlex = false;
      }
    },
    
    async savePlexSettings() {
      try {
        if (!this.plexSettings.baseUrl || !this.plexSettings.token) {
          this.saveSuccess = false;
          this.saveMessage = 'Plex URL and token are required';
          this.clearSaveMessage();
          return;
        }
        
        // Configure the service with the recent limit
        await plexService.configure(
          this.plexSettings.baseUrl, 
          this.plexSettings.token,
          this.plexSettings.recentLimit
        );
        
        // Fetch and cache watch history after successful connection
        try {
          
          const movieHistory = await plexService.getRecentlyWatchedMovies(this.plexSettings.recentLimit);
          const showHistory = await plexService.getRecentlyWatchedShows(this.plexSettings.recentLimit);
          
          // Save watch history to server cache
          const apiService = await import('../services/ApiService').then(m => m.default);
          await apiService.saveWatchHistory('movies', movieHistory);
          await apiService.saveWatchHistory('shows', showHistory);
          
        } catch (historyError) {
          console.error('Error fetching and caching Plex watch history:', historyError);
          // Continue with settings save even if history fetch fails
        }
        
        this.saveSuccess = true;
        this.saveMessage = 'Plex settings saved successfully!';
        
        // Emit event to notify parent component that Plex settings were updated
        this.$emit('plex-settings-updated');
        
        this.clearSaveMessage();
      } catch (error) {
        console.error('Error saving Plex settings:', error);
        this.saveSuccess = false;
        this.saveMessage = 'Failed to save Plex settings';
        this.clearSaveMessage();
      }
    },
    
    async savePlexLimit() {
      try {
        // Store the limit in database
        await databaseStorageUtils.set('plexRecentLimit', this.plexSettings.recentLimit);
        
        // Update the server with the new limit
        await plexService.configure(
          plexService.baseUrl,
          plexService.token,
          '', // selectedUserId (empty string)
          this.plexSettings.recentLimit // explicitly pass the limit
        );
        
        // Save to user settings in database
        try {
          const userData = await apiService.getSettings();
          userData.plexRecentLimit = this.plexSettings.recentLimit;
          await apiService.saveSettings(userData);
        } catch (settingsError) {
          console.error('Error saving Plex limit to user settings:', settingsError);
          // Continue even if settings save fails
        }
        
        // Fetch and cache watch history with new limit
        try {
          
          const movieHistory = await plexService.getRecentlyWatchedMovies(this.plexSettings.recentLimit);
          const showHistory = await plexService.getRecentlyWatchedShows(this.plexSettings.recentLimit);
          
          // Save watch history to server cache
          await apiService.saveWatchHistory('movies', movieHistory);
          await apiService.saveWatchHistory('shows', showHistory);
          
        } catch (historyError) {
          console.error('Error fetching and caching Plex watch history with new limit:', historyError);
          // Continue with settings save even if history fetch fails
        }
        
        this.saveSuccess = true;
        this.saveMessage = 'Plex history limit updated successfully!';
        this.$emit('plex-limit-changed', this.plexSettings.recentLimit);
      } catch (error) {
        console.error('Error saving Plex limit:', error);
        this.saveSuccess = false;
        this.saveMessage = 'Failed to save Plex history limit';
      }
      
      this.clearSaveMessage();
    },
    
    // Jellyfin Service Methods
    async testJellyfinConnection() {
      // Validate input
      if (!this.jellyfinSettings.baseUrl || !this.jellyfinSettings.apiKey || !this.jellyfinSettings.username) {
        this.jellyfinConnectionStatus = false;
        this.jellyfinConnectionMessage = 'URL, API key, and Username are required';
        return;
      }
      
      this.testingJellyfin = true;
      this.jellyfinConnectionMessage = '';
      
      try {
        let userId;

        try {
          // First configure with just the URL and API key to be able to call getUserIdByUsername
          await jellyfinService.configure(
            this.jellyfinSettings.baseUrl,
            this.jellyfinSettings.apiKey,
            '' // Temporarily empty userId
          );

          // Try to look up the user ID from the username
          userId = await jellyfinService.getUserIdByUsername(this.jellyfinSettings.username);
          
          if (!userId) {
            this.jellyfinConnectionStatus = false;
            this.jellyfinConnectionMessage = `Could not find a user with the username "${this.jellyfinSettings.username}"`;
            this.testingJellyfin = false;
            return;
          }
          
          // Save the looked-up userId
          this.jellyfinSettings.userId = userId;
        } catch (error) {
          this.jellyfinConnectionStatus = false;
          this.jellyfinConnectionMessage = `Error looking up username: ${error.message || 'Unknown error occurred'}`;
          this.testingJellyfin = false;
          return;
        }
        
        // Configure the service with the looked-up userId and username
        await jellyfinService.configure(
          this.jellyfinSettings.baseUrl, 
          this.jellyfinSettings.apiKey,
          userId,
          this.jellyfinSettings.username // Pass username
        );
        
        // Store the recent limit in database (server doesn't need this)
        await databaseStorageUtils.set('jellyfinRecentLimit', this.jellyfinSettings.recentLimit);
        
        // Test the connection
        const result = await jellyfinService.testConnection();
        
        // Update status based on response
        this.jellyfinConnectionStatus = result.success;
        this.jellyfinConnectionMessage = result.message;
        
        // If successful, emit event to notify parent component
        if (result.success) {
          this.$emit('jellyfin-settings-updated');
        }
          
      } catch (error) {
        console.error('Error connecting to Jellyfin:', error);
        this.jellyfinConnectionStatus = false;
        this.jellyfinConnectionMessage = 'Connection error. Please check your URL and API key.';
      } finally {
        this.testingJellyfin = false;
      }
    },
    
    async saveJellyfinSettings() {
      try {
        // Validate input
        if (!this.jellyfinSettings.baseUrl || !this.jellyfinSettings.apiKey || !this.jellyfinSettings.username) {
          this.saveSuccess = false;
          this.saveMessage = 'Jellyfin URL, API key, and Username are required';
          this.clearSaveMessage();
          return;
        }

        let userId;

        try {
          // First configure with just the URL and API key to be able to call getUserIdByUsername
          await jellyfinService.configure(
            this.jellyfinSettings.baseUrl,
            this.jellyfinSettings.apiKey,
            '' // Temporarily empty userId
          );

          // Try to look up the user ID from the username
          userId = await jellyfinService.getUserIdByUsername(this.jellyfinSettings.username);
          
          if (!userId) {
            this.saveSuccess = false;
            this.saveMessage = `Could not find a user with the username "${this.jellyfinSettings.username}"`;
            this.clearSaveMessage();
            return;
          }
          
          // Save the looked-up userId
          this.jellyfinSettings.userId = userId;
        } catch (error) {
          this.saveSuccess = false;
          this.saveMessage = `Error looking up username: ${error.message || 'Unknown error occurred'}`;
          this.clearSaveMessage();
          return;
        }
        
        // Configure the service with the looked-up userId, username, and recent limit
        await jellyfinService.configure(
          this.jellyfinSettings.baseUrl, 
          this.jellyfinSettings.apiKey,
          userId,
          this.jellyfinSettings.username, // Pass username
          this.jellyfinSettings.recentLimit
        );
        
        // Fetch and cache watch history after successful connection
        try {
          
          const movieHistory = await jellyfinService.getRecentlyWatchedMovies(this.jellyfinSettings.recentLimit);
          const showHistory = await jellyfinService.getRecentlyWatchedShows(this.jellyfinSettings.recentLimit);
          
          // Save watch history to server cache
          const apiService = await import('../services/ApiService').then(m => m.default);
          await apiService.saveWatchHistory('movies', movieHistory);
          await apiService.saveWatchHistory('shows', showHistory);
          
        } catch (historyError) {
          console.error('Error fetching and caching Jellyfin watch history:', historyError);
          // Continue with settings save even if history fetch fails
        }
        
        this.saveSuccess = true;
        this.saveMessage = 'Jellyfin settings saved successfully!';
        
        // Emit event to notify parent component
        this.$emit('jellyfin-settings-updated');
        
        this.clearSaveMessage();
      } catch (error) {
        console.error('Error saving Jellyfin settings:', error);
        this.saveSuccess = false;
        this.saveMessage = 'Failed to save Jellyfin settings';
        this.clearSaveMessage();
      }
    },
    
    async saveJellyfinLimit() {
      try {
        // Store the limit in database
        await databaseStorageUtils.set('jellyfinRecentLimit', this.jellyfinSettings.recentLimit);
        
        // Update the server with the new limit
        await jellyfinService.configure(
          jellyfinService.baseUrl,
          jellyfinService.apiKey,
          jellyfinService.userId,
          this.jellyfinSettings.recentLimit
        );
        
        // Save to user settings in database
        try {
          const userData = await apiService.getSettings();
          userData.jellyfinRecentLimit = this.jellyfinSettings.recentLimit;
          await apiService.saveSettings(userData);
        } catch (settingsError) {
          console.error('Error saving Jellyfin limit to user settings:', settingsError);
          // Continue even if settings save fails
        }
        
        // Fetch and cache watch history with new limit
        try {
          
          const movieHistory = await jellyfinService.getRecentlyWatchedMovies(this.jellyfinSettings.recentLimit);
          const showHistory = await jellyfinService.getRecentlyWatchedShows(this.jellyfinSettings.recentLimit);
          
          // Save watch history to server cache
          await apiService.saveWatchHistory('movies', movieHistory);
          await apiService.saveWatchHistory('shows', showHistory);
          
        } catch (historyError) {
          console.error('Error fetching and caching Jellyfin watch history with new limit:', historyError);
          // Continue with settings save even if history fetch fails
        }
        
        this.saveSuccess = true;
        this.saveMessage = 'Jellyfin history limit updated successfully!';
        this.$emit('jellyfin-limit-changed', this.jellyfinSettings.recentLimit);
      } catch (error) {
        console.error('Error saving Jellyfin limit:', error);
        this.saveSuccess = false;
        this.saveMessage = 'Failed to save Jellyfin history limit';
      }
      
      this.clearSaveMessage();
    },
    
    // Tautulli Service Methods
    async testTautulliConnection() {
      if (!this.tautulliSettings.baseUrl || !this.tautulliSettings.apiKey) {
        this.tautulliConnectionStatus = false;
        this.tautulliConnectionMessage = 'URL and API key are required';
        return;
      }
      
      this.testingTautulli = true;
      this.tautulliConnectionMessage = '';
      
      try {
        // Configure the service with provided details
        await tautulliService.configure(this.tautulliSettings.baseUrl, this.tautulliSettings.apiKey);
        
        // Store the recent limit in database (server doesn't need this)
        await databaseStorageUtils.set('tautulliRecentLimit', this.tautulliSettings.recentLimit);
        
        // Test the connection
        const success = await tautulliService.testConnection();
        
        // Update status based on response
        this.tautulliConnectionStatus = success;
        this.tautulliConnectionMessage = success 
          ? 'Connected successfully!'
          : 'Connection failed. Please check your URL and API key.';
        
        // If successful, emit event to notify parent component
        if (success) {
          this.$emit('tautulli-settings-updated');
        }
          
      } catch (error) {
        console.error('Error connecting to Tautulli:', error);
        this.tautulliConnectionStatus = false;
        this.tautulliConnectionMessage = 'Connection error. Please check your URL and API key.';
      } finally {
        this.testingTautulli = false;
      }
    },
    
    async saveTautulliSettings() {
      try {
        if (!this.tautulliSettings.baseUrl || !this.tautulliSettings.apiKey) {
          this.saveSuccess = false;
          this.saveMessage = 'Tautulli URL and API key are required';
          this.clearSaveMessage();
          return;
        }
        
        // Configure the service with the recent limit
        await tautulliService.configure(
          this.tautulliSettings.baseUrl, 
          this.tautulliSettings.apiKey,
          '', // userId (empty string)
          this.tautulliSettings.recentLimit
        );
        
        // Fetch and cache watch history after successful connection
        try {
          
          const movieHistory = await tautulliService.getRecentlyWatchedMovies(this.tautulliSettings.recentLimit);
          const showHistory = await tautulliService.getRecentlyWatchedShows(this.tautulliSettings.recentLimit);
          
          // Save watch history to server cache
          const apiService = await import('../services/ApiService').then(m => m.default);
          await apiService.saveWatchHistory('movies', movieHistory);
          await apiService.saveWatchHistory('shows', showHistory);
          
        } catch (historyError) {
          console.error('Error fetching and caching Tautulli watch history:', historyError);
          // Continue with settings save even if history fetch fails
        }
        
        this.saveSuccess = true;
        this.saveMessage = 'Tautulli settings saved successfully!';
        
        // Emit event to notify parent component
        this.$emit('tautulli-settings-updated');
        
        this.clearSaveMessage();
      } catch (error) {
        console.error('Error saving Tautulli settings:', error);
        this.saveSuccess = false;
        this.saveMessage = 'Failed to save Tautulli settings';
        this.clearSaveMessage();
      }
    },
    
    async saveTautulliLimit() {
      try {
        // Store the limit in database
        await databaseStorageUtils.set('tautulliRecentLimit', this.tautulliSettings.recentLimit);
        
        // Update the server with the new limit
        await tautulliService.configure(
          tautulliService.baseUrl,
          tautulliService.apiKey,
          '', // userId (empty string)
          this.tautulliSettings.recentLimit
        );
        
        // Save to user settings in database
        try {
          const userData = await apiService.getSettings();
          userData.tautulliRecentLimit = this.tautulliSettings.recentLimit;
          await apiService.saveSettings(userData);
        } catch (settingsError) {
          console.error('Error saving Tautulli limit to user settings:', settingsError);
          // Continue even if settings save fails
        }
        
        // Fetch and cache watch history with new limit
        try {
          
          const movieHistory = await tautulliService.getRecentlyWatchedMovies(this.tautulliSettings.recentLimit);
          const showHistory = await tautulliService.getRecentlyWatchedShows(this.tautulliSettings.recentLimit);
          
          // Save watch history to server cache
          await apiService.saveWatchHistory('movies', movieHistory);
          await apiService.saveWatchHistory('shows', showHistory);
          
        } catch (historyError) {
          console.error('Error fetching and caching Tautulli watch history with new limit:', historyError);
          // Continue with settings save even if history fetch fails
        }
        
        this.saveSuccess = true;
        this.saveMessage = 'Tautulli history limit updated successfully!';
        this.$emit('tautulli-limit-changed', this.tautulliSettings.recentLimit);
      } catch (error) {
        console.error('Error saving Tautulli limit:', error);
        this.saveSuccess = false;
        this.saveMessage = 'Failed to save Tautulli history limit';
      }
      
      this.clearSaveMessage();
    },
    
    // Trakt Service Methods
    openTraktConnectModal() {
      this.showTraktConnect = true;
      document.body.style.overflow = 'hidden'; // Prevent scrolling behind modal
    },
    
    closeTraktConnectModal() {
      this.showTraktConnect = false;
      document.body.style.overflow = ''; // Re-enable scrolling
    },
    
    onTraktConnectionSuccessful() {
      this.closeTraktConnectModal();
      this.loadTraktSettings();
      this.$emit('trakt-settings-updated');
    },
    
    onTraktLimitChange(limit) {
      this.traktSettings.recentLimit = limit;
      databaseStorageUtils.set('traktRecentLimit', limit);
      this.$emit('trakt-limit-changed', limit);
    },
    
    async saveTraktLimit() {
      try {
        // Store the limit in database
        await databaseStorageUtils.set('traktRecentLimit', this.traktSettings.recentLimit);
        
        // Update the server with the new limit
        await traktService.configure(
          traktService.clientId,
          traktService.clientSecret,
          this.traktSettings.recentLimit
        );
        
        // Save to user settings in database
        try {
          const userData = await apiService.getSettings();
          userData.traktRecentLimit = this.traktSettings.recentLimit;
          await apiService.saveSettings(userData);
        } catch (settingsError) {
          console.error('Error saving Trakt limit to user settings:', settingsError);
          // Continue even if settings save fails
        }
        
        // Fetch and cache watch history after successful update
        try {
          
          const movieHistory = await traktService.getRecentlyWatchedMovies(this.traktSettings.recentLimit);
          const showHistory = await traktService.getRecentlyWatchedShows(this.traktSettings.recentLimit);
          
          // Save watch history to server cache
          await apiService.saveWatchHistory('movies', movieHistory);
          await apiService.saveWatchHistory('shows', showHistory);
          
        } catch (historyError) {
          console.error('Error fetching and caching Trakt watch history:', historyError);
          // Continue with settings save even if history fetch fails
        }
        
        this.saveSuccess = true;
        this.saveMessage = 'Trakt history limit updated successfully!';
        this.$emit('trakt-limit-changed', this.traktSettings.recentLimit);
      } catch (error) {
        console.error('Error saving Trakt limit:', error);
        this.saveSuccess = false;
        this.saveMessage = 'Failed to save Trakt history limit';
      }
      
      this.clearSaveMessage();
    },
    
    async reconnectTrakt() {
      this.openTraktConnectModal();
    },
    
    async disconnectTrakt() {
      if (confirm('Are you sure you want to disconnect from Trakt? This will revoke your authorization.')) {
        try {
          // Revoke the access token
          await traktService.revokeAccess();
          
          // Reset Trakt settings
          this.traktSettings = {
            clientId: '',
            accessToken: '',
            recentLimit: 50
          };
          
          // Notify parent component
          this.$emit('trakt-disconnected');
          
          this.saveSuccess = true;
          this.saveMessage = 'Disconnected from Trakt successfully';
          this.clearSaveMessage();
        } catch (error) {
          console.error('Error disconnecting from Trakt:', error);
          this.saveSuccess = false;
          this.saveMessage = 'Failed to disconnect from Trakt';
          this.clearSaveMessage();
        }
      }
    },
    
    // Account Methods
    async changePassword() {
      if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
        this.passwordSuccess = false;
        this.passwordMessage = 'New passwords do not match.';
        return;
      }
      
      this.isChangingPassword = true;
      this.passwordMessage = '';
      
      try {
        const result = await authService.changePassword(
          this.passwordForm.currentPassword,
          this.passwordForm.newPassword
        );
        
        if (result.success) {
          this.passwordSuccess = true;
          this.passwordMessage = 'Password changed successfully.';
          // Clear the form
          this.passwordForm.currentPassword = '';
          this.passwordForm.newPassword = '';
          this.passwordForm.confirmPassword = '';
        } else {
          this.passwordSuccess = false;
          this.passwordMessage = result.message || 'Failed to change password.';
        }
      } catch (error) {
        console.error('Error changing password:', error);
        this.passwordSuccess = false;
        this.passwordMessage = error.message || 'An error occurred while changing password.';
      } finally {
        this.isChangingPassword = false;
        
        // Clear message after a delay
        setTimeout(() => {
          this.passwordMessage = '';
        }, 5000);
      }
    },
    
    // Helper Methods
    clearSaveMessage() {
      // Clear message after a longer delay (matching animation duration)
      setTimeout(() => {
        this.saveMessage = '';
      }, 3500);
    },
    
    async saveOnModelSelect() {
      // Auto-save settings when a model is selected
      await this.saveAISettings();
      
      // Also update the model in the OpenAI service to ensure it's saved in both localStorage and server-side credentials
      try {
        if (this.aiSettings.selectedModel) {
          // Store model in database
          await databaseStorageUtils.set('openaiModel', this.aiSettings.selectedModel);
          
          // Configure the service with the updated model, which will also save to credentials
          await openAIService.configure(
            openAIService.apiKey,
            this.aiSettings.selectedModel,
            openAIService.baseUrl,
            openAIService.maxTokens,
            openAIService.temperature,
            openAIService.useSampledLibrary,
            openAIService.sampleSize
          );
        }
      } catch (error) {
        console.error('Error saving model selection:', error);
      }
    }
  }
};
</script>

<style scoped>
.ai-settings {
  padding: 20px;
  max-width: 650px;
  margin: 0 auto;
}

h2 {
  margin-top: 0;
  margin-bottom: 20px;
  color: var(--header-color);
  text-align: center;
  transition: color var(--transition-speed);
}

/* Tabs Styling */
.settings-tabs {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--border-color);
  transition: border-color var(--transition-speed);
}

.tab-button {
  padding: 10px;
  background: transparent;
  border: none;
  border-bottom: 3px solid transparent;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color);
  transition: all 0.3s ease;
  flex: 1;
  text-align: center;
  white-space: nowrap;
}

@media (min-width: 480px) {
  .tab-button {
    padding: 10px 20px;
    font-size: 16px;
  }
}

.tab-button:hover {
  background-color: var(--nav-hover-bg);
  transition: background-color var(--transition-speed);
}

.tab-button.active {
  color: var(--button-primary-bg);
  border-bottom: 3px solid var(--button-primary-bg);
  transition: color var(--transition-speed), border-color var(--transition-speed);
}

.tab-button.admin-tab {
  background-color: rgba(76, 175, 80, 0.1);
  color: #4CAF50;
  border-left: 3px solid #4CAF50;
}

.tab-button.admin-tab.active {
  background-color: rgba(76, 175, 80, 0.2);
  color: #2E7D32;
  border-bottom: 3px solid #2E7D32;
}

/* Common Settings Section Styling */
.settings-section {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.settings-intro {
  margin-bottom: 20px;
  background-color: var(--card-bg-color);
  padding: 15px 20px;
  border-radius: 8px;
  border-left: 4px solid var(--button-primary-bg);
  box-shadow: var(--card-shadow);
  transition: background-color var(--transition-speed), box-shadow var(--transition-speed);
}

.settings-intro p {
  margin: 8px 0;
  color: var(--text-color);
  transition: color var(--transition-speed);
}

.settings-intro a {
  color: var(--button-primary-bg);
  text-decoration: none;
  font-weight: 500;
  transition: color var(--transition-speed);
}

.settings-intro a:hover {
  text-decoration: underline;
}

.settings-form {
  background-color: var(--card-bg-color);
  border-radius: 8px;
  padding: 20px;
  box-shadow: var(--card-shadow);
  transition: background-color var(--transition-speed), box-shadow var(--transition-speed);
}

.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
  color: var(--text-color);
  transition: color var(--transition-speed);
}

input[type="text"],
input[type="password"] {
  width: 100%;
  padding: 10px;
  border: 1px solid var(--input-border);
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
  background-color: var(--input-bg);
  color: var(--input-text);
  transition: background-color var(--transition-speed), 
              color var(--transition-speed),
              border-color var(--transition-speed);
}

.api-key-input {
  display: flex;
  gap: 10px;
}

.api-key-input input {
  flex: 1;
}

.toggle-button {
  background-color: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0 10px;
  cursor: pointer;
}

/* Button Styles */
.model-actions {
  margin-bottom: 10px;
}

.action-button, .test-button {
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 10px 16px;
  cursor: pointer;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background-color 0.2s;
}

.action-button:hover:not(:disabled),
.test-button:hover:not(:disabled) {
  background-color: #0069d9;
}

.action-button:disabled,
.test-button:disabled {
  background-color: #b0b0b0;
  cursor: not-allowed;
}

.save-button {
  background-color: var(--button-primary-bg);
  color: var(--button-primary-text);
  border: none;
  border-radius: 4px;
  padding: 10px 20px;
  cursor: pointer;
  font-size: 16px;
  margin-left: 10px;
  flex: 1;
  transition: background-color var(--transition-speed), color var(--transition-speed);
}

.save-button:hover:not(:disabled) {
  filter: brightness(1.1);
}

.save-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.button-icon {
  display: inline-flex;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Action Buttons Container */
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

@media (max-width: 480px) {
  .actions {
    flex-direction: column;
  }
  
  .save-button {
    margin-left: 0 !important;
  }
}

/* Models List Styling */
.models-container {
  display: flex;
  flex-direction: column;
  margin-top: 10px;
}

.search-box {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  justify-content: space-between;
}

.model-search {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--input-border);
  border-radius: 4px;
  font-size: 14px;
  background-color: var(--input-bg);
  color: var(--input-text);
  transition: background-color var(--transition-speed), 
              border-color var(--transition-speed),
              color var(--transition-speed);
}

.model-count {
  margin-left: 10px;
  font-size: 13px;
  color: var(--text-color);
  background-color: var(--bg-color);
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color var(--transition-speed), color var(--transition-speed);
}

.models-list {
  max-height: 250px;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 10px;
  background-color: var(--card-bg-color);
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 5px;
  scrollbar-width: thin;
  transition: background-color var(--transition-speed), 
              border-color var(--transition-speed);
}

.models-list::-webkit-scrollbar {
  width: 8px;
}

.models-list::-webkit-scrollbar-track {
  background: var(--bg-color);
  border-radius: 4px;
  transition: background-color var(--transition-speed);
}

.models-list::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 4px;
  transition: background-color var(--transition-speed);
}

.models-list::-webkit-scrollbar-thumb:hover {
  background: var(--nav-text-color);
}

.model-option {
  padding: 5px;
  display: flex;
  align-items: center;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.model-option:hover {
  background-color: var(--nav-hover-bg);
  transition: background-color var(--transition-speed);
}

.model-option input[type="radio"] {
  margin: 0;
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.model-option label {
  font-weight: normal;
  margin-left: 10px;
  cursor: pointer;
  display: inline-block;
  padding: 2px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

/* Slider Styling */
.slider-container {
  display: flex;
  align-items: center;
  gap: 10px;
}

.slider-container input {
  flex: 1;
}

.slider-value {
  min-width: 40px;
  text-align: center;
}

/* Message Styling */
.no-models, .error-message, .no-results {
  padding: 15px;
  border-radius: 4px;
  margin-top: 10px;
}

.no-models, .no-results {
  background-color: #f8f9fa;
  color: #6c757d;
  text-align: center;
}

.no-results {
  grid-column: 1 / -1; /* Span all columns */
  margin-top: 0;
  padding: 20px;
  background-color: rgba(248, 249, 250, 0.7);
}

/* Connected service styling */
.connected-service {
  background-color: var(--card-bg-color);
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border-color);
  margin-bottom: 20px;
  padding: 20px;
  transition: background-color var(--transition-speed), 
              border-color var(--transition-speed);
}

.service-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.service-name {
  display: flex;
  align-items: center;
  gap: 10px;
}

.connection-icon {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.connection-icon.trakt {
  background-color: #ED1C24;
  color: white;
}

.connection-badge {
  display: flex;
  align-items: center;
  font-size: 14px;
  padding: 4px 10px;
  border-radius: 12px;
  gap: 5px;
}

.connection-badge.connected {
  background-color: rgba(76, 175, 80, 0.15);
  color: #4CAF50;
}

.badge-icon {
  font-size: 12px;
}

.service-details {
  background-color: var(--bg-color);
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 20px;
}

.detail-row {
  display: flex;
  margin-bottom: 8px;
}

.detail-row:last-child {
  margin-bottom: 0;
}

.detail-label {
  width: 140px;
  font-weight: 500;
}

.reconnect-button {
  background-color: #2563eb;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  margin-right: 10px;
}

.disconnect-button {
  background-color: rgba(255, 59, 48, 0.1);
  color: #FF3B30;
  border: 1px solid #FF3B30;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
}

.error-message {
  background-color: #f8d7da;
  color: #721c24;
}

.save-notification {
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 20px;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 8;
  min-width: 280px;
  max-width: 400px;
  animation: slideUp 0.3s ease, pulse 0.5s ease 1s, fadeOut 0.5s ease 3s forwards;
}

.notification-content {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  font-weight: 500;
}

.notification-icon {
  margin-right: 10px;
  display: flex;
  align-items: center;
}

@keyframes slideUp {
  from { transform: translate(-50%, 20px); opacity: 0; }
  to { transform: translate(-50%, 0); opacity: 1; }
}

@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}

@keyframes pulse {
  0% { transform: translate(-50%, 0) scale(1); }
  50% { transform: translate(-50%, 0) scale(1.05); }
  100% { transform: translate(-50%, 0) scale(1); }
}

.connection-message {
  margin-top: 15px;
  padding: 12px;
  border-radius: 8px;
  text-align: center;
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  animation: scaleIn 0.3s ease-out;
}

@keyframes scaleIn {
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.success {
  background-color: #4caf50;
  color: white;
}

.error {
  background-color: #f44336;
  color: white;
}

/* Help Section */
.settings-help {
  margin-top: 30px;
  padding: 15px;
  border-top: 1px solid var(--border-color);
  transition: border-color var(--transition-speed);
}

.settings-help h3 {
  font-size: 16px;
  color: var(--header-color);
  margin-top: 0;
  margin-bottom: 10px;
  transition: color var(--transition-speed);
}

.settings-help p {
  margin: 8px 0;
  color: var(--text-color);
  font-size: 14px;
  transition: color var(--transition-speed);
}

.settings-help ul {
  padding-left: 20px;
  margin: 10px 0;
}

.settings-help li {
  margin-bottom: 8px;
  color: var(--text-color);
  font-size: 14px;
  transition: color var(--transition-speed);
}

.settings-help strong {
  color: var(--header-color);
  transition: color var(--transition-speed);
}

.settings-help a {
  color: var(--button-primary-bg);
  text-decoration: none;
  transition: color var(--transition-speed);
}

.settings-help a:hover {
  text-decoration: underline;
}

.api-note {
  font-style: italic;
  opacity: 0.8;
  font-size: 13px !important;
  margin-top: 15px !important;
}

/* Account Settings Styles */
.account-info {
  background-color: var(--bg-color);
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 25px;
}

.info-row {
  display: flex;
  margin-bottom: 10px;
}

.info-label {
  min-width: 120px;
  font-weight: 500;
  color: var(--text-color);
}

.info-value {
  color: var(--header-color);
  font-weight: 500;
}

.password-change-section {
  margin-top: 20px;
  border-top: 1px solid var(--border-color);
  padding-top: 20px;
}

.password-message {
  margin-top: 15px;
  padding: 12px;
  border-radius: 6px;
  font-weight: 500;
}

.password-message.success {
  background-color: rgba(76, 175, 80, 0.1);
  color: #4CAF50;
  border-left: 3px solid #4CAF50;
}

.password-message.error {
  background-color: rgba(244, 67, 54, 0.1);
  color: #F44336;
  border-left: 3px solid #F44336;
}

.model-warning {
  background-color: #fff3cd;
  color: #856404;
  border-radius: 4px;
  padding: 10px 15px;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  border-left: 4px solid #ffc107;
}

.warning-icon {
  font-size: 16px;
}

/* Dark theme support */
body.dark-theme .model-warning {
  background-color: rgba(255, 193, 7, 0.15);
  color: #ffe083;
  border-left-color: #ffc107;
}

.field-hint {
  font-size: 12px;
  color: var(--text-color);
  opacity: 0.7;
  margin-top: 4px;
  transition: color var(--transition-speed);
}

.field-error {
  font-size: 12px;
  color: #f44336;
  margin-top: 4px;
  font-weight: 500;
  transition: color var(--transition-speed);
}

/* Section Card Styling */
.section-card {
  margin-bottom: 30px;
  background-color: var(--card-bg-color);
  border-radius: 8px;
  padding: 20px;
  box-shadow: var(--card-shadow);
  transition: background-color var(--transition-speed), box-shadow var(--transition-speed);
}

.section-card h3 {
  margin-top: 0;
  margin-bottom: 8px;
  color: var(--header-color);
  font-size: 20px;
  transition: color var(--transition-speed);
}

.section-description {
  color: var(--text-color);
  opacity: 0.8;
  margin-bottom: 15px;
  font-size: 14px;
}

/* Connected Services Styling */
.connected-services-wrapper {
  border-left: 4px solid var(--button-primary-bg);
}

.collapsible-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  cursor: pointer;
  padding-bottom: 8px;
  gap: 10px;
}

.collapsible-header .header-content {
  flex: 1;
}

.collapsible-header:hover h3 {
  color: var(--button-primary-bg);
}

.collapse-toggle {
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-color);
  opacity: 0.7;
  padding: 5px;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.collapse-toggle:hover {
  background-color: var(--nav-hover-bg);
  opacity: 1;
}

.collapse-toggle svg {
  transition: transform 0.3s ease;
}

.collapse-toggle svg.rotate {
  transform: rotate(180deg);
}

.collapsible-content {
  animation: slideDown 0.3s ease-out;
  transform-origin: top;
  overflow: hidden;
  padding-top: 8px;
}

@keyframes slideDown {
  from { 
    opacity: 0;
    transform: scaleY(0);
    max-height: 0;
  }
  to { 
    opacity: 1;
    transform: scaleY(1);
    max-height: 1000px;
  }
}

.connected-services {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
}

.connection-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10px;
  border-radius: 8px;
  border: 2px solid var(--border-color);
  background-color: var(--card-bg-color);
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
  height: 80px;
}

.connection-button:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

.connection-name {
  font-weight: bold;
  font-size: 16px;
  margin-bottom: 8px;
}

.connection-action {
  font-size: 12px;
  opacity: 0.7;
  font-weight: 500;
}

.plex-button {
  border-color: #CC7B19;
  color: #CC7B19;
}

.plex-button:hover {
  background-color: rgba(204, 123, 25, 0.08);
}

.jellyfin-button {
  border-color: #AA5CC3;
  color: #AA5CC3;
}

.jellyfin-button:hover {
  background-color: rgba(170, 92, 195, 0.08);
}

.tautulli-button {
  border-color: #7c3aed; /* Tautulli purple color */
  color: #7c3aed;
}

.tautulli-button:hover {
  background-color: rgba(124, 58, 237, 0.08);
}

.sonarr-button {
  border-color: #35c5f4;
  color: #35c5f4;
}

.sonarr-button:hover {
  background-color: rgba(53, 197, 244, 0.08);
}

.radarr-button {
  border-color: #f93a2f;
  color: #f93a2f;
}

.radarr-button:hover {
  background-color: rgba(249, 58, 47, 0.08);
}

.trakt-button {
  border-color: #ED1C24; /* Trakt red color */
  color: #ED1C24;
}

.trakt-button:hover {
  background-color: rgba(237, 28, 36, 0.08);
}

/* Connection Modal Styling */
.connection-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(2px);
  z-index: 9;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.connection-modal {
  background-color: var(--card-bg-color);
  border-radius: 10px;
  max-width: 550px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.3);
  animation: modalFadeIn 0.3s ease-out;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  color: var(--header-color);
}

.modal-close-x {
  background: none;
  border: none;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  color: var(--text-color);
  opacity: 0.5;
  transition: opacity 0.2s;
}

.modal-close-x:hover {
  opacity: 1;
}

.modal-body {
  padding: 0;
}

.modal-footer {
  padding: 15px 20px;
  border-top: 1px solid var(--border-color);
  text-align: right;
}

.modal-close-button {
  padding: 8px 20px;
  background-color: var(--button-secondary-bg);
  color: var(--button-secondary-text);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.modal-close-button:hover {
  background-color: var(--button-primary-bg);
  color: var(--button-primary-text);
  border-color: var(--button-primary-bg);
}

@keyframes modalFadeIn {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
