<template>
  <div class="ai-settings">
    <h2>AI Service Settings</h2>
    
    <div class="settings-form">
      <div class="form-group">
        <label for="apiUrl">API URL:</label>
        <input 
          id="apiUrl" 
          v-model="apiUrl" 
          type="text" 
          placeholder="https://api.openai.com/v1"
          required
        />
      </div>
      
      <div class="form-group">
        <label for="apiKey">API Key:</label>
        <div class="api-key-input">
          <input 
            id="apiKey" 
            v-model="apiKey" 
            :type="showApiKey ? 'text' : 'password'" 
            placeholder="Your API key"
            required
          />
          <button type="button" class="toggle-button" @click="showApiKey = !showApiKey">
            {{ showApiKey ? 'Hide' : 'Show' }}
          </button>
        </div>
      </div>
      
      <div class="form-group">
        <label>Available Models:</label>
        <div class="model-actions">
          <button 
            type="button" 
            @click="fetchModels" 
            :disabled="!apiKey || isLoading"
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
                v-model="selectedModel" 
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
            v-model.number="maxTokens" 
            type="range" 
            min="100" 
            max="4000" 
            step="100" 
          />
          <span class="slider-value">{{ maxTokens }}</span>
        </div>
      </div>
      
      <div class="form-group">
        <label for="temperature">Temperature:</label>
        <div class="slider-container">
          <input 
            id="temperature" 
            v-model.number="temperature" 
            type="range" 
            min="0" 
            max="1" 
            step="0.1" 
          />
          <span class="slider-value">{{ temperature }}</span>
        </div>
      </div>
      
      <div class="actions">
        <button type="button" @click="saveSettings" class="save-button">
          Save Settings
        </button>
      </div>
      
      <div v-if="saveMessage" class="save-message" :class="{ 'success': saveSuccess, 'error': !saveSuccess }">
        {{ saveMessage }}
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import openAIService from '../services/OpenAIService';

export default {
  name: 'AIServiceSettings',
  data() {
    return {
      apiUrl: '',
      apiKey: '',
      selectedModel: '',
      models: [],
      modelSearch: '',
      showApiKey: false,
      isLoading: false,
      fetchError: null,
      saveMessage: '',
      saveSuccess: false,
      maxTokens: 800,
      temperature: 0.5
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
    this.loadSettings();
  },
  methods: {
    loadSettings() {
      this.apiUrl = localStorage.getItem('aiApiUrl') || 'https://api.openai.com/v1';
      this.apiKey = localStorage.getItem('openaiApiKey') || '';
      this.selectedModel = localStorage.getItem('openaiModel') || 'gpt-3.5-turbo';
      this.maxTokens = parseInt(localStorage.getItem('aiMaxTokens') || '800');
      this.temperature = parseFloat(localStorage.getItem('aiTemperature') || '0.5');
    },
    async fetchModels() {
      if (!this.apiKey) {
        this.fetchError = 'API key is required to fetch models';
        return;
      }
      
      this.isLoading = true;
      this.fetchError = null;
      this.models = [];
      
      try {
        // Determine the correct endpoint for models based on API URL
        const modelsEndpoint = this.apiUrl.endsWith('/') 
          ? `${this.apiUrl}models` 
          : `${this.apiUrl}/models`;
          
        const response = await axios.get(modelsEndpoint, {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
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
          if (!this.selectedModel && this.models.length > 0) {
            this.selectedModel = this.models[0].id;
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
    saveSettings() {
      try {
        // Save to localStorage
        localStorage.setItem('aiApiUrl', this.apiUrl);
        localStorage.setItem('openaiApiKey', this.apiKey);
        localStorage.setItem('openaiModel', this.selectedModel);
        localStorage.setItem('aiMaxTokens', this.maxTokens.toString());
        localStorage.setItem('aiTemperature', this.temperature.toString());
        
        // Update the service
        openAIService.configure(
          this.apiKey, 
          this.selectedModel,
          this.apiUrl,
          this.maxTokens,
          this.temperature
        );
        
        this.saveSuccess = true;
        this.saveMessage = 'Settings saved successfully!';
        
        // Emit event to notify parent component
        this.$emit('settings-updated');
        
        // Clear message after a delay
        setTimeout(() => {
          this.saveMessage = '';
        }, 3000);
      } catch (error) {
        console.error('Error saving settings:', error);
        this.saveSuccess = false;
        this.saveMessage = 'Failed to save settings';
      }
    }
  }
};
</script>

<style scoped>
.ai-settings {
  padding: 20px;
  max-width: 600px;
  margin: 0 auto;
}

h2 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #2c3e50;
  text-align: center;
}

.settings-form {
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
  color: #333;
}

input[type="text"],
input[type="password"] {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
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

.model-actions {
  margin-bottom: 10px;
}

.action-button {
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

.action-button:hover:not(:disabled) {
  background-color: #0069d9;
}

.action-button:disabled {
  background-color: #b0b0b0;
  cursor: not-allowed;
}

.button-icon {
  display: inline-flex;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

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
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background-color: white;
}

.model-count {
  margin-left: 10px;
  font-size: 13px;
  color: #666;
  background-color: #f0f0f0;
  padding: 4px 8px;
  border-radius: 4px;
}

.models-list {
  max-height: 250px;
  overflow-y: auto;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 10px;
  background-color: white;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 5px;
  scrollbar-width: thin;
}

.models-list::-webkit-scrollbar {
  width: 8px;
}

.models-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.models-list::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.models-list::-webkit-scrollbar-thumb:hover {
  background: #a1a1a1;
}

.model-option {
  padding: 5px;
  display: flex;
  align-items: center;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.model-option:hover {
  background-color: #f0f0f0;
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

.save-button {
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 10px 20px;
  cursor: pointer;
  font-size: 16px;
  width: 100%;
}

.save-message {
  margin-top: 10px;
  padding: 10px;
  border-radius: 4px;
  text-align: center;
}

.success {
  background-color: #d4edda;
  color: #155724;
}

.error {
  background-color: #f8d7da;
  color: #721c24;
}
</style>