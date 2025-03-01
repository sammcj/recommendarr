<template>
  <div class="ai-settings">
    <h2>Settings</h2>
    
    <!-- Settings Tabs -->
    <div class="settings-tabs">
      <button 
        @click="activeTab = 'ai'" 
        :class="{ active: activeTab === 'ai' }" 
        class="tab-button"
      >
        AI Service
      </button>
      <button 
        @click="activeTab = 'sonarr'" 
        :class="{ active: activeTab === 'sonarr' }" 
        class="tab-button"
      >
        Sonarr
      </button>
      <button 
        @click="activeTab = 'radarr'" 
        :class="{ active: activeTab === 'radarr' }" 
        class="tab-button"
      >
        Radarr
      </button>
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
              placeholder="Your API key"
              required
            />
            <button type="button" class="toggle-button" @click="showApiKey = !showApiKey">
              {{ showApiKey ? 'Hide' : 'Show' }}
            </button>
          </div>
          <div class="field-hint">The API key for authentication (not needed for some local servers)</div>
        </div>
        
        <div class="form-group">
          <label>Available Models:</label>
          <div class="model-actions">
            <button 
              type="button" 
              @click="fetchModels" 
              :disabled="!aiSettings.apiKey || isLoading"
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
          {{ sonarrConnectionMessage }}
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
          {{ radarrConnectionMessage }}
        </div>
      </div>
    </div>
    
    <!-- Common Save Message -->
    <div v-if="saveMessage" class="save-message" :class="{ 'success': saveSuccess, 'error': !saveSuccess }">
      {{ saveMessage }}
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import openAIService from '../services/OpenAIService';
import sonarrService from '../services/SonarrService';
import radarrService from '../services/RadarrService';

export default {
  name: 'AIServiceSettings',
  data() {
    return {
      activeTab: 'ai',
      
      // AI Settings
      aiSettings: {
        apiUrl: '',
        apiKey: '',
        selectedModel: '',
        maxTokens: 800,
        temperature: 0.5
      },
      models: [],
      modelSearch: '',
      showApiKey: false,
      isLoading: false,
      fetchError: null,
      
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
    }
  },
  created() {
    // Load saved settings
    this.loadAllSettings();
  },
  methods: {
    loadAllSettings() {
      // Load AI Settings
      this.aiSettings.apiUrl = localStorage.getItem('aiApiUrl') || 'https://api.openai.com/v1';
      this.aiSettings.apiKey = localStorage.getItem('openaiApiKey') || '';
      this.aiSettings.selectedModel = localStorage.getItem('openaiModel') || 'gpt-3.5-turbo';
      this.aiSettings.maxTokens = parseInt(localStorage.getItem('aiMaxTokens') || '800');
      this.aiSettings.temperature = parseFloat(localStorage.getItem('aiTemperature') || '0.5');
      
      // Load Sonarr Settings
      this.sonarrSettings.baseUrl = localStorage.getItem('sonarrBaseUrl') || '';
      this.sonarrSettings.apiKey = localStorage.getItem('sonarrApiKey') || '';
      
      // Load Radarr Settings
      this.radarrSettings.baseUrl = localStorage.getItem('radarrBaseUrl') || '';
      this.radarrSettings.apiKey = localStorage.getItem('radarrApiKey') || '';
    },
    
    // AI Service Methods
    async fetchModels() {
      if (!this.aiSettings.apiKey) {
        this.fetchError = 'API key is required to fetch models';
        return;
      }
      
      this.isLoading = true;
      this.fetchError = null;
      this.models = [];
      
      try {
        // Determine the correct endpoint for models based on API URL
        const modelsEndpoint = this.aiSettings.apiUrl.endsWith('/') 
          ? `${this.aiSettings.apiUrl}models` 
          : `${this.aiSettings.apiUrl}/models`;
          
        const response = await axios.get(modelsEndpoint, {
          headers: {
            'Authorization': `Bearer ${this.aiSettings.apiKey}`
          }
        });
        
        if (response.data && response.data.data) {
          // Filter for chat models
          this.models = response.data.data.filter(model => 
            model.id.includes('gpt') || 
            model.id.includes('claude') || 
            model.id.includes('llama') ||
            model.id.includes('chat')
          );
          
          // Sort models alphabetically
          this.models.sort((a, b) => a.id.localeCompare(b.id));
          
          // If no model is selected, select the first one
          if (!this.aiSettings.selectedModel && this.models.length > 0) {
            this.aiSettings.selectedModel = this.models[0].id;
          }
        } else {
          this.fetchError = 'Invalid response format from API';
        }
      } catch (error) {
        console.error('Error fetching models:', error);
        this.fetchError = error.response?.data?.error?.message || 
                         'Failed to fetch models. Check your API key and URL.';
      } finally {
        this.isLoading = false;
      }
    },
    
    saveAISettings() {
      try {
        // Save to localStorage
        localStorage.setItem('aiApiUrl', this.aiSettings.apiUrl);
        localStorage.setItem('openaiApiKey', this.aiSettings.apiKey);
        localStorage.setItem('openaiModel', this.aiSettings.selectedModel);
        localStorage.setItem('aiMaxTokens', this.aiSettings.maxTokens.toString());
        localStorage.setItem('aiTemperature', this.aiSettings.temperature.toString());
        
        // Update the service
        openAIService.configure(
          this.aiSettings.apiKey, 
          this.aiSettings.selectedModel,
          this.aiSettings.apiUrl,
          this.aiSettings.maxTokens,
          this.aiSettings.temperature
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
        sonarrService.configure(this.sonarrSettings.baseUrl, this.sonarrSettings.apiKey);
        
        // Test the connection
        const success = await sonarrService.testConnection();
        
        // Update status based on response
        this.sonarrConnectionStatus = success;
        this.sonarrConnectionMessage = success 
          ? 'Connected successfully!'
          : 'Connection failed. Please check your URL and API key.';
          
        // If successful, save the settings
        if (success) {
          // Save to localStorage
          localStorage.setItem('sonarrBaseUrl', this.sonarrSettings.baseUrl);
          localStorage.setItem('sonarrApiKey', this.sonarrSettings.apiKey);
          
          // Emit event to notify parent component that Sonarr settings were updated
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
    
    saveSonarrSettings() {
      try {
        if (!this.sonarrSettings.baseUrl || !this.sonarrSettings.apiKey) {
          this.saveSuccess = false;
          this.saveMessage = 'Sonarr URL and API key are required';
          this.clearSaveMessage();
          return;
        }
        
        // Save to localStorage
        localStorage.setItem('sonarrBaseUrl', this.sonarrSettings.baseUrl);
        localStorage.setItem('sonarrApiKey', this.sonarrSettings.apiKey);
        
        // Configure the service
        sonarrService.configure(this.sonarrSettings.baseUrl, this.sonarrSettings.apiKey);
        
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
        radarrService.configure(this.radarrSettings.baseUrl, this.radarrSettings.apiKey);
        
        // Test the connection
        const success = await radarrService.testConnection();
        
        // Update status based on response
        this.radarrConnectionStatus = success;
        this.radarrConnectionMessage = success 
          ? 'Connected successfully!'
          : 'Connection failed. Please check your URL and API key.';
        
        // If successful, save the settings
        if (success) {
          // Save to localStorage
          localStorage.setItem('radarrBaseUrl', this.radarrSettings.baseUrl);
          localStorage.setItem('radarrApiKey', this.radarrSettings.apiKey);
          
          // Emit event to notify parent component that Radarr settings were updated
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
    
    saveRadarrSettings() {
      try {
        if (!this.radarrSettings.baseUrl || !this.radarrSettings.apiKey) {
          this.saveSuccess = false;
          this.saveMessage = 'Radarr URL and API key are required';
          this.clearSaveMessage();
          return;
        }
        
        // Save to localStorage
        localStorage.setItem('radarrBaseUrl', this.radarrSettings.baseUrl);
        localStorage.setItem('radarrApiKey', this.radarrSettings.apiKey);
        
        // Configure the service
        radarrService.configure(this.radarrSettings.baseUrl, this.radarrSettings.apiKey);
        
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
    
    // Helper Methods
    clearSaveMessage() {
      // Clear message after a delay
      setTimeout(() => {
        this.saveMessage = '';
      }, 3000);
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

.error-message {
  background-color: #f8d7da;
  color: #721c24;
}

.save-message {
  margin-top: 20px;
  padding: 10px;
  border-radius: 4px;
  text-align: center;
}

.connection-message {
  margin-top: 15px;
  padding: 10px;
  border-radius: 4px;
  text-align: center;
}

.success {
  background-color: rgba(76, 175, 80, 0.2);
  color: var(--button-primary-bg);
  transition: background-color var(--transition-speed), color var(--transition-speed);
}

.error {
  background-color: rgba(244, 67, 54, 0.1);
  color: #f44336;
  transition: background-color var(--transition-speed), color var(--transition-speed);
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

.field-hint {
  font-size: 12px;
  color: var(--text-color);
  opacity: 0.7;
  margin-top: 4px;
  transition: color var(--transition-speed);
}
</style>