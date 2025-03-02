<template>
  <div class="container">
    <div class="card">
      <div class="card-header bg-secondary text-white d-flex justify-content-between align-items-center">
        <h5 class="mb-0">Jellyfin Connection</h5>
        <span
          v-if="jellyfinConnected"
          class="badge badge-success p-2"
        >
          Connected
        </span>
        <span
          v-else
          class="badge badge-danger p-2"
        >
          Not Connected
        </span>
      </div>
      <div class="card-body">
        <div class="form-group">
          <label for="jellyfinUrl">Jellyfin URL</label>
          <div class="input-group">
            <input
              id="jellyfinUrl"
              v-model="jellyfinUrl"
              type="text"
              class="form-control"
              placeholder="http://your-jellyfin-server:8096"
              :disabled="loading"
            >
          </div>
          <small class="form-text text-muted">Example: http://192.168.1.100:8096 or http://jellyfin.local:8096</small>
        </div>
        <div class="form-group">
          <label for="jellyfinApiKey">API Key</label>
          <div class="input-group">
            <input
              id="jellyfinApiKey"
              v-model="jellyfinApiKey"
              type="password"
              class="form-control"
              placeholder="Your Jellyfin API Key"
              :disabled="loading"
            >
          </div>
          <small class="form-text text-muted">
            You can generate an API key in Jellyfin under your profile → Advanced → API Keys
          </small>
        </div>
        <div class="form-group">
          <label for="jellyfinUserId">User ID</label>
          <div class="input-group">
            <input
              id="jellyfinUserId"
              v-model="jellyfinUserId"
              type="text"
              class="form-control"
              placeholder="Your Jellyfin User ID"
              :disabled="loading"
            >
          </div>
          <small class="form-text text-muted">
            Your User ID can be found in your profile settings under "Profile Information"
          </small>
        </div>
        <div class="d-flex justify-content-between align-items-center form-group">
          <div>
            <label for="jellyfinHistoryLimit">History Limit</label>
            <div class="input-group w-auto">
              <input
                id="jellyfinHistoryLimit"
                v-model.number="jellyfinHistoryLimit"
                type="number"
                class="form-control"
                min="1"
                max="500"
                :disabled="loading"
              >
            </div>
            <small class="form-text text-muted">Number of recently watched items to fetch</small>
          </div>
          <div class="text-right">
            <button
              class="btn btn-primary"
              @click="saveSettings"
              :disabled="loading"
            >
              <span
                v-if="loading"
                class="spinner-border spinner-border-sm mr-2"
                role="status"
                aria-hidden="true"
              ></span>
              Save & Test Connection
            </button>
          </div>
        </div>
        <div
          v-if="message"
          class="alert"
          :class="messageSuccess ? 'alert-success' : 'alert-danger'"
        >
          {{ message }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import JellyfinService from '@/services/JellyfinService.js';

export default {
  name: 'JellyfinConnection',
  props: {
    connected: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      jellyfinUrl: localStorage.getItem('jellyfinBaseUrl') || '',
      jellyfinApiKey: localStorage.getItem('jellyfinApiKey') || '',
      jellyfinUserId: localStorage.getItem('jellyfinUserId') || '',
      jellyfinHistoryLimit: parseInt(localStorage.getItem('jellyfinHistoryLimit') || '50'),
      loading: false,
      message: '',
      messageSuccess: false,
      jellyfinConnected: this.connected
    };
  },
  watch: {
    connected(newVal) {
      this.jellyfinConnected = newVal;
    }
  },
  methods: {
    async saveSettings() {
      this.loading = true;
      this.message = '';

      // Validate input
      if (!this.jellyfinUrl || !this.jellyfinApiKey || !this.jellyfinUserId) {
        this.message = 'Please enter all required fields';
        this.messageSuccess = false;
        this.loading = false;
        return;
      }

      // Save the history limit
      localStorage.setItem('jellyfinHistoryLimit', this.jellyfinHistoryLimit.toString());
      this.$emit('limitChanged', this.jellyfinHistoryLimit);

      // Configure the Jellyfin service
      JellyfinService.configure(
        this.jellyfinUrl,
        this.jellyfinApiKey,
        this.jellyfinUserId
      );

      // Test the connection
      try {
        const result = await JellyfinService.testConnection();
        this.message = result.message;
        this.messageSuccess = result.success;
        
        if (result.success) {
          this.jellyfinConnected = true;
          this.$emit('connected', true);
        } else {
          this.jellyfinConnected = false;
          this.$emit('connected', false);
        }
      } catch (error) {
        this.message = `Error: ${error.message || 'Unknown error occurred'}`;
        this.messageSuccess = false;
        this.jellyfinConnected = false;
        this.$emit('connected', false);
      }

      this.loading = false;
    }
  }
};
</script>

<style scoped>
.card {
  margin-bottom: 20px;
}
.input-group {
  margin-bottom: 10px;
}
</style>