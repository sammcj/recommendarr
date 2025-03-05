<template>
  <div class="app-settings">
    <h2>App Configuration</h2>
    <p class="description">
      Configure the URL settings for the application. These settings allow you to customize the app for
      reverse proxy setups or specific network configurations.
    </p>

    <div class="warning-box" v-if="showRestartWarning">
      <i class="fa fa-exclamation-triangle"></i>
      <span>Changes to these settings will require a container restart to take full effect.</span>
    </div>

    <div class="settings-form">
      <div class="form-group">
        <label for="publicUrl">Public URL:</label>
        <input 
          id="publicUrl" 
          v-model="settings.publicUrl" 
          placeholder="https://recommendarr.example.com" 
          class="form-control"
        />
        <small class="help-text">
          The public URL where users will access your Recommendarr instance (for reverse proxy setups).
          This is used at runtime.
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
          The URL for the API server. Leave blank to auto-detect.
          Current API URL: {{ currentApiUrl }}
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
          The base path for the application. Use this if your app is hosted at a sub-path.
          Example: "/recommendarr" if accessed via example.com/recommendarr
        </small>
      </div>

      <div class="buttons-container">
        <button @click="saveSettings" class="save-button" :disabled="saving">
          <span v-if="saving">Saving...</span>
          <span v-else>Save Settings</span>
        </button>
        <button @click="resetSettings" class="reset-button">Reset to Defaults</button>
      </div>

      <div v-if="message" :class="['message', messageType]">
        {{ message }}
      </div>
    </div>
  </div>
</template>

<script>
import CredentialsService from '../services/CredentialsService';
import ApiService from '../services/ApiService';

export default {
  name: 'AppSettings',
  data() {
    return {
      settings: {
        publicUrl: '',
        apiUrl: '',
        baseUrl: ''
      },
      currentApiUrl: ApiService.baseUrl,
      originalSettings: {},
      saving: false,
      message: '',
      messageType: 'success',
      showRestartWarning: false
    };
  },
  async created() {
    await this.loadSettings();
  },
  watch: {
    'settings.apiUrl'() {
      this.showRestartWarning = true;
    },
    'settings.baseUrl'() {
      this.showRestartWarning = true;
    }
  },
  methods: {
    async loadSettings() {
      try {
        const appSettings = await CredentialsService.getCredentials('app-config');
        if (appSettings) {
          this.settings = {
            publicUrl: appSettings.publicUrl || '',
            apiUrl: appSettings.apiUrl || '',
            baseUrl: appSettings.baseUrl || ''
          };
          this.originalSettings = {...this.settings};
        }
      } catch (error) {
        console.log('No app settings found, using defaults');
      }
    },
    async saveSettings() {
      this.saving = true;
      this.message = '';
      
      try {
        await CredentialsService.storeCredentials('app-config', this.settings);
        
        // Update current API URL display if it changed
        if (this.settings.apiUrl && this.settings.apiUrl !== this.originalSettings.apiUrl) {
          // Note: This won't take effect until page reload, but we show updated value
          this.currentApiUrl = this.settings.apiUrl.endsWith('/api') 
            ? this.settings.apiUrl 
            : `${this.settings.apiUrl.endsWith('/') ? this.settings.apiUrl.slice(0, -1) : this.settings.apiUrl}/api`;
        }
        
        this.message = 'Settings saved successfully.';
        this.messageType = 'success';
        this.originalSettings = {...this.settings};
        
        if (this.showRestartWarning) {
          this.message += ' Some changes will require restarting the container to take full effect.';
        } else {
          // Apply public URL changes immediately - this doesn't require restart
          if (this.settings.publicUrl !== this.originalSettings.publicUrl) {
            // Logic for applying public URL changes would go here
            // This is a runtime setting that doesn't require container restart
          }
        }
      } catch (error) {
        this.message = `Error saving settings: ${error.message || 'Unknown error'}`;
        this.messageType = 'error';
        console.error('Failed to save app settings:', error);
      } finally {
        this.saving = false;
      }
    },
    resetSettings() {
      // Reset to default values instead of the previous values
      this.settings = {
        publicUrl: '',
        apiUrl: '',
        baseUrl: '/'
      };
      this.showRestartWarning = true;
      this.message = 'Reset to default values. Click Save Settings to apply.';
      this.messageType = 'info';
    }
  }
};
</script>

<style scoped>
.app-settings {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.description {
  margin-bottom: 20px;
  color: var(--text-secondary);
}

.warning-box {
  background-color: rgba(255, 193, 7, 0.2);
  border-left: 4px solid #ffc107;
  padding: 12px 16px;
  margin-bottom: 20px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 6px;
  font-weight: 600;
}

.form-control {
  width: 100%;
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--input-bg);
  color: var(--text-primary);
}

.help-text {
  display: block;
  margin-top: 6px;
  color: var(--text-secondary);
  font-size: 0.85em;
}

.buttons-container {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.save-button, .reset-button {
  padding: 10px 16px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-weight: 500;
}

.save-button {
  background-color: var(--primary-color);
  color: white;
}

.save-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.reset-button {
  background-color: var(--secondary-bg);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
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

.info {
  background-color: rgba(13, 202, 240, 0.2);
  border-left: 4px solid #0dcaf0;
  color: #0dcaf0;
}
</style>