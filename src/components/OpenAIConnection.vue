<template>
  <div class="openai-connection">
    <h2>Connect to OpenAI</h2>
    
    <form @submit.prevent="connect">
      <div class="form-group">
        <label for="apiKey">OpenAI API Key:</label>
        <input 
          id="apiKey" 
          v-model="apiKey" 
          type="password" 
          placeholder="Your OpenAI API key"
          required
        />
      </div>
      
      <div class="form-group">
        <label for="model">Model:</label>
        <select id="model" v-model="model">
          <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
          <option value="gpt-4">GPT-4</option>
          <option value="gpt-4-turbo">GPT-4 Turbo</option>
        </select>
      </div>
      
      <button type="submit" :disabled="connecting">
        {{ connecting ? 'Connecting...' : 'Connect' }}
      </button>
    </form>
    
    <div v-if="connectionStatus" class="connection-status">
      <p v-if="connectionStatus === 'success'" class="success">
        OpenAI configured successfully!
      </p>
      <p v-else-if="connectionStatus === 'error'" class="error">
        Configuration failed. Please check your API key.
      </p>
    </div>
  </div>
</template>

<script>
import openAIService from '../services/OpenAIService';

export default {
  name: 'OpenAIConnection',
  data() {
    return {
      apiKey: '',
      model: 'gpt-3.5-turbo',
      connectionStatus: null,
      connecting: false
    };
  },
  created() {
    // Load saved credentials if they exist
    const savedApiKey = localStorage.getItem('openaiApiKey');
    const savedModel = localStorage.getItem('openaiModel');
    
    if (savedApiKey) {
      this.apiKey = savedApiKey;
      if (savedModel) {
        this.model = savedModel;
      }
      // Try to automatically configure with saved credentials
      this.autoConnect();
    }
  },
  methods: {
    autoConnect() {
      try {
        // Configure the service with saved details
        openAIService.configure(this.apiKey, this.model);
        
        // Emit event for successful configuration
        this.$emit('configured');
      } catch (error) {
        console.error('Error auto-configuring OpenAI service:', error);
        // Clear invalid credentials
        this.clearStoredCredentials();
      }
    },
    connect() {
      this.connecting = true;
      this.connectionStatus = null;
      
      try {
        // Configure the service with provided details
        openAIService.configure(this.apiKey, this.model);
        
        // Set status to success (no direct API test for API key validity)
        this.connectionStatus = 'success';
        
        // Save credentials
        this.saveCredentials();
        
        // Emit event for successful configuration
        this.$emit('configured');
      } catch (error) {
        console.error('Error configuring OpenAI service:', error);
        this.connectionStatus = 'error';
      } finally {
        this.connecting = false;
      }
    },
    saveCredentials() {
      localStorage.setItem('openaiApiKey', this.apiKey);
      localStorage.setItem('openaiModel', this.model);
    },
    clearStoredCredentials() {
      localStorage.removeItem('openaiApiKey');
      localStorage.removeItem('openaiModel');
    }
  }
};
</script>

<style scoped>
.openai-connection {
  max-width: 500px;
  margin: 0 auto;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background-color: #f9f9f9;
}

h2 {
  margin-top: 0;
  color: #2c3e50;
}

.form-group {
  margin-bottom: 15px;
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

input, select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
}

button {
  background-color: #4CAF50;
  color: white;
  padding: 10px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
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
  color: #4CAF50;
}

.error {
  color: #f44336;
}
</style>