<template>
  <div class="app-config-setup">
    <div class="setup-intro">
      <h2>App Configuration</h2>
      <p>Configure essential URL settings for your Recommendarr instance</p>
    </div>

    <div class="setup-form">
      <div class="form-group">
        <label for="publicUrl">Public URL:</label>
        <input 
          id="publicUrl" 
          v-model="settings.publicUrl" 
          placeholder="https://recommendarr.example.com" 
          class="form-control"
        />
        <small class="help-text">
          The public URL where users will access your Recommendarr instance (for reverse proxy setups)
        </small>
      </div>

      <div class="form-group">
        <label for="apiUrl">API URL:</label>
        <input 
          id="apiUrl" 
          v-model="settings.apiUrl" 
          placeholder="https://api.example.com" 
          class="form-control"
        />
        <small class="help-text">
          The URL for the API server. Leave blank to auto-detect
        </small>
      </div>

      <div class="form-group">
        <label for="baseUrl">Base URL:</label>
        <input 
          id="baseUrl" 
          v-model="settings.baseUrl" 
          placeholder="/" 
          class="form-control"
        />
        <small class="help-text">
          The base path for the application. Use this if your app is hosted at a sub-path
        </small>
      </div>

      <div class="actions">
        <button @click="saveAppConfig" class="config-button">
          <span v-if="saving">Saving...</span>
          <span v-else>Save Configuration</span>
        </button>
        <button @click="skipConfig" class="skip-button">
          Use Default Settings
        </button>
      </div>

      <div v-if="message" :class="['message', messageType]">
        {{ message }}
      </div>
    </div>
  </div>
</template>

<script>
import CredentialsService from '../services/CredentialsService';

export default {
  name: 'AppConfigSetup',
  data() {
    return {
      settings: {
        publicUrl: '',
        apiUrl: '',
        baseUrl: '/'
      },
      saving: false,
      message: '',
      messageType: 'success'
    };
  },
  methods: {
    async saveAppConfig() {
      this.saving = true;
      this.message = '';
      
      try {
        // Store the configuration server-side
        await CredentialsService.storeCredentials('app-config', this.settings);
        
        this.message = 'App configuration saved successfully!';
        this.messageType = 'success';
        
        // Emit event for parent to handle
        this.$emit('config-saved');
        
        // Give user time to see success message before proceeding
        setTimeout(() => {
          this.$emit('completed');
        }, 1000);
      } catch (error) {
        this.message = `Error saving configuration: ${error.message || 'Unknown error'}`;
        this.messageType = 'error';
        console.error('Failed to save app configuration:', error);
      } finally {
        this.saving = false;
      }
    },
    
    async skipConfig() {
      // Save default/empty values instead of just skipping
      this.settings = {
        publicUrl: '',
        apiUrl: '',
        baseUrl: '/'
      };
      
      try {
        // Store these default values in the credentials storage
        await CredentialsService.storeCredentials('app-config', this.settings);
        
        this.message = 'Default settings saved successfully!';
        this.messageType = 'success';
        
        // Emit events for parent to handle
        this.$emit('config-saved');
        
        // Brief delay to show success message
        setTimeout(() => {
          this.$emit('completed');
        }, 800);
      } catch (error) {
        console.error('Error saving default configuration:', error);
        // Still complete setup even if save fails
        this.$emit('completed');
      }
    }
  }
};
</script>

<style scoped>
.app-config-setup {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.setup-intro {
  margin-bottom: 20px;
  text-align: center;
}

.setup-intro h2 {
  margin-top: 0;
  color: var(--header-color);
  font-size: 24px;
}

.setup-intro p {
  color: var(--text-color);
  opacity: 0.8;
}

.setup-form {
  background-color: var(--card-bg-color);
  border-radius: 8px;
  padding: 20px;
  box-shadow: var(--card-shadow);
}

.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 6px;
  font-weight: 600;
  color: var(--text-color);
}

.form-control {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--input-bg);
  color: var(--input-text);
  box-sizing: border-box;
  font-size: 16px;
}

.help-text {
  display: block;
  margin-top: 6px;
  color: var(--text-color);
  opacity: 0.7;
  font-size: 0.85em;
}

.actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
  flex-wrap: wrap;
}

.config-button, .skip-button {
  padding: 12px 16px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-weight: 500;
  font-size: 16px;
  flex: 1;
  min-width: 150px;
}

.config-button {
  background-color: var(--button-primary-bg);
  color: white;
}

.config-button:hover {
  filter: brightness(1.1);
}

.skip-button {
  background-color: var(--button-secondary-bg);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.config-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.message {
  margin-top: 20px;
  padding: 10px;
  border-radius: 4px;
}

.success {
  background-color: rgba(40, 167, 69, 0.2);
  border-left: 4px solid #28a745;
  color: #28a745;
}

.error {
  background-color: rgba(220, 53, 69, 0.2);
  border-left: 4px solid #dc3545;
  color: #dc3545;
}

@media (max-width: 480px) {
  .actions {
    flex-direction: column;
  }
  
  .config-button, .skip-button {
    width: 100%;
  }
}
</style>