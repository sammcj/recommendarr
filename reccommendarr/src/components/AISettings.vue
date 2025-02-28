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
            {{ isLoading ? 'Loading...' : 'Fetch Models' }}
          </button>
        </div>
        
        <div v-if="fetchError" class="error-message">
          {{ fetchError }}
        </div>
        
        <div v-if="models.length > 0" class="models-list">
          <div v-for="model in models" :key="model.id" class="model-option">
            <input 
              type="radio" 
              :id="model.id" 
              :value="model.id" 
              v-model="selectedModel" 
              name="model" 
            />
            <label :for="model.id">{{ model.id }}</label>
          </div>
        </div>
        
        <div v-else-if="!fetchError && !isLoading" class="no-models">
          <p>Click "Fetch Models" to load available models</p>
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
      showApiKey: false,
      isLoading: false,
      fetchError: null,
      saveMessage: '',
      saveSuccess: false,
      maxTokens: 800,
      temperature: 0.5
    };
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

.action-button {
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
}

.action-button:disabled {
  background-color: #b0b0b0;
  cursor: not-allowed;
}

.models-list {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 10px;
  margin-top: 10px;
  background-color: white;
}

.model-option {
  margin-bottom: 8px;
}

.model-option label {
  font-weight: normal;
  margin-left: 8px;
  cursor: pointer;
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

.no-models, .error-message {
  padding: 15px;
  border-radius: 4px;
  margin-top: 10px;
}

.no-models {
  background-color: #f8f9fa;
  color: #6c757d;
  text-align: center;
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