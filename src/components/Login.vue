<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <img src="../assets/logo.png" alt="Logo" class="login-logo">
        <h1>Login to Recommendarr</h1>
        <p>Please sign in to access your recommendations</p>
      </div>
      
      <div v-if="error" class="login-error">
        {{ error }}
      </div>

      <!-- OAuth providers -->
      <div v-if="providers.length > 0" class="oauth-providers">
        <button 
          v-for="provider in providers" 
          :key="provider"
          :class="`oauth-button oauth-${provider}`"
          @click="handleOAuthLogin(provider)"
          :disabled="loading"
        >
          <span class="oauth-icon">
            <i v-if="provider === 'google'" class="fab fa-google"></i>
            <i v-else-if="provider === 'github'" class="fab fa-github"></i>
            <i v-else class="fas fa-user"></i>
          </span>
          <span v-if="provider === 'custom'">Login with OAuth2</span>
          <span v-else>Continue with {{ capitalizeProvider(provider) }}</span>
        </button>
      </div>

      <div v-if="providers.length > 0 && localAuth" class="divider">
        <span>or</span>
      </div>
      
      <form v-if="localAuth" @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label for="username">Username</label>
          <input 
            type="text" 
            id="username" 
            v-model="username" 
            placeholder="Enter your username" 
            required
            autofocus
            :disabled="loading"
          >
        </div>
        
        <div class="form-group">
          <label for="password">Password</label>
          <input 
            type="password" 
            id="password" 
            v-model="password" 
            placeholder="Enter your password" 
            required
            :disabled="loading"
            autocomplete="current-password"
          >
        </div>
        
        <div class="form-actions">
          <button 
            type="submit" 
            class="login-button" 
            :disabled="loading"
          >
            <span v-if="loading">Logging in...</span>
            <span v-else>Login</span>
          </button>
        </div>
      </form>

    </div>
    
  </div>
</template>

<script>
import AuthService from '../services/AuthService';

export default {
  name: 'LoginForm',
  data() {
    return {
      username: '',
      password: '',
      loading: false,
      error: null,
      showRegister: false,
      registerUsername: '',
      registerPassword: '',
      confirmPassword: '',
      registerLoading: false,
      registerError: null,
      registerSuccess: null,
      providers: [],
      localAuth: true
    };
  },
  async mounted() {
    try {
      // Get URL parameters first before cleaning them
      const urlParams = new URLSearchParams(window.location.search);
      const codeParam = urlParams.get('code');
      const errorParam = urlParams.get('error');
      const logoutParam = urlParams.get('logout');
      
      // If logout parameter is present, clear local authentication data
      if (logoutParam === 'true') {
        console.log('Logout parameter detected, ensuring user is fully logged out');
        AuthService.clearLocalAuth();
        // Clean up URL to remove logout parameter
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      
      // Simple check if user is already authenticated in localStorage
      if (AuthService.isAuthenticated()) {
        console.log('User appears authenticated in localStorage, verifying with server...');
        // Verify the session with the server before proceeding
        const isSessionValid = await AuthService.verifySession();
        
        if (isSessionValid) {
          console.log('Server verified session is valid');
          // Only clean URL and emit authenticated if not coming from OAuth callback
          if (!codeParam) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
          this.$emit('authenticated');
          return;
        } else {
          console.log('Server rejected session, clearing local auth data');
          // If server says session is invalid but we have local data, clear it
          AuthService.clearLocalAuth();
        }
      } else {
        console.log('No local authentication data found');
      }
      
      // First verify session with server immediately
      let isAuthenticated = await AuthService.verifySession();
      if (isAuthenticated) {
        console.log('Session verified with server on first attempt');
        this.$emit('authenticated');
        return;
      }

      // If we're returning from OAuth callback (has code param but no error)
      if (codeParam && !errorParam) {
        console.log('OAuth callback detected, waiting for authentication to complete');
        // Show loading state
        this.loading = true;
        
        // Verify session with increasing delays to account for cookie setting
        isAuthenticated = false;
        for (let i = 0; i < 5; i++) {  // Increased from 3 to 5 attempts
          const delay = 300 * (i + 1);  // Progressive delay: 300ms, 600ms, 900ms, 1200ms, 1500ms
          console.log(`Waiting ${delay}ms before verification attempt ${i + 1}`);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          isAuthenticated = await AuthService.verifySession();
          console.log(`Verification attempt ${i + 1}: ${isAuthenticated ? 'Success' : 'Failed'}`);
          
          if (isAuthenticated) break;
        }
        
        if (isAuthenticated) {
          console.log('OAuth login successful');
          // Clean up URL and emit authenticated event
          window.history.replaceState({}, document.title, window.location.pathname);
          this.$emit('authenticated');
          return;
        } else {
          console.log('OAuth login failed after multiple attempts');
          this.error = 'OAuth login failed. Please try again.';
          // Clean up URL even if authentication fails to prevent reload loops
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    } catch (error) {
      console.error('Error verifying session:', error);
      this.error = 'Failed to verify authentication. Please try again.';
    } finally {
      this.loading = false;
    }
    
    // Get enabled authentication providers
    this.getProviders();
  },
  methods: {
    async getProviders() {
      try {
        const providersData = await AuthService.getEnabledProviders();
        this.providers = providersData.providers || [];
        this.localAuth = providersData.localAuth !== false;
      } catch (err) {
        console.error('Error fetching auth providers:', err);
        this.providers = [];
        this.localAuth = true;
      }
    },
    
    async handleLogin() {
      this.loading = true;
      this.error = null;
      
      try {
        // Attempt login
        await AuthService.login(this.username, this.password);
        
        // On success, emit the authenticated event
        this.$emit('authenticated');
      } catch (error) {
        this.error = error || 'Authentication failed. Please check your credentials.';
      } finally {
        this.loading = false;
      }
    },
    
    async handleRegister() {
      if (this.registerPassword !== this.confirmPassword) {
        return;
      }
      
      this.registerLoading = true;
      this.registerError = null;
      this.registerSuccess = null;
      
      try {
        // Attempt to create account
        await AuthService.register(this.registerUsername, this.registerPassword);
        
        // On success, show success message
        this.registerSuccess = 'Account created successfully! You can now login.';
        
        // Clear registration form
        this.registerUsername = '';
        this.registerPassword = '';
        this.confirmPassword = '';
      } catch (error) {
        this.registerError = error || 'Registration failed. Please try again.';
      } finally {
        this.registerLoading = false;
      }
    },

    handleOAuthLogin(provider) {
      this.loading = true;
      this.error = null;
      
      try {
        // Redirect to OAuth provider
        AuthService.oauthLogin(provider);
      } catch (error) {
        this.error = error || 'OAuth login failed. Please try again.';
        this.loading = false;
      }
    },

    capitalizeProvider(provider) {
      return provider.charAt(0).toUpperCase() + provider.slice(1);
    }
  }
};
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  width: 100%;
  padding: 20px;
  box-sizing: border-box;
}

.login-card {
  background-color: var(--card-bg-color);
  border-radius: var(--border-radius-md);
  box-shadow: var(--card-shadow);
  width: 100%;
  max-width: 400px;
  padding: 30px;
  transition: all 0.2s ease;
}

.login-header {
  text-align: center;
  margin-bottom: 24px;
}

.login-logo {
  height: 90px;
  margin-bottom: 16px;
  transition: filter 0.3s ease, box-shadow 0.3s ease, transform 0.3s ease;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.login-header:hover .login-logo {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

body.dark-theme .login-logo {
  filter: brightness(1.8) contrast(1.1);
  box-shadow: 0 0 15px rgba(255, 255, 255, 0.2);
  border-radius: 8px;
}

.login-header h1 {
  margin: 0 0 8px 0;
  font-size: 24px;
  color: var(--header-color);
}

.login-header p {
  margin: 0;
  color: var(--text-color);
  opacity: 0.8;
  font-size: 14px;
}

.login-error {
  background-color: rgba(255, 0, 0, 0.1);
  border-left: 3px solid #ff3b30;
  color: #ff3b30;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 16px;
  font-size: 14px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 14px;
  color: var(--text-color);
  font-weight: 500;
}

.form-group input {
  padding: 10px 12px;
  background-color: var(--input-bg);
  color: var(--input-text);
  border: 1px solid var(--input-border);
  border-radius: var(--border-radius-sm);
  font-size: 15px;
  transition: all 0.2s ease;
}

.form-group input:focus {
  border-color: var(--button-primary-bg);
  outline: none;
  box-shadow: 0 0 0 1px rgba(67, 97, 238, 0.15);
}

.form-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 8px;
}

.login-button {
  padding: 10px 12px;
  background-color: var(--button-primary-bg);
  color: var(--button-primary-text);
  border: none;
  border-radius: var(--border-radius-sm);
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0.3px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.login-button:hover:not(:disabled) {
  filter: brightness(1.1);
}

.login-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.register-section {
  margin-top: 24px;
  text-align: center;
}

.register-section p {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: var(--text-color);
  opacity: 0.8;
}

.register-link {
  background: none;
  border: none;
  color: var(--button-primary-bg);
  font-size: 14px;
  cursor: pointer;
  text-align: center;
}

.register-link:hover:not(:disabled) {
  text-decoration: underline;
}

.register-link:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 7;
  backdrop-filter: blur(2px);
}

.register-modal {
  background-color: var(--card-bg-color);
  border-radius: var(--border-radius-md);
  box-shadow: var(--card-shadow);
  width: 90%;
  max-width: 450px;
  display: flex;
  flex-direction: column;
  padding: 24px;
  transition: all 0.2s ease;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.modal-header h2 {
  margin: 0;
  font-size: 20px;
  color: var(--header-color);
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--text-color);
}

.register-error {
  background-color: rgba(255, 0, 0, 0.1);
  border-left: 3px solid #ff3b30;
  color: #ff3b30;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 16px;
  font-size: 14px;
}

.register-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.register-button {
  padding: 10px 12px;
  background-color: var(--button-primary-bg);
  color: var(--button-primary-text);
  border: none;
  border-radius: var(--border-radius-sm);
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0.3px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.register-button:hover:not(:disabled) {
  filter: brightness(1.1);
}

.register-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.cancel-button {
  padding: 10px 12px;
  background-color: var(--button-secondary-bg);
  color: var(--button-secondary-text);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  font-size: 15px;
  font-weight: 400;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cancel-button:hover:not(:disabled) {
  background-color: rgba(0, 0, 0, 0.03);
}

.cancel-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.password-mismatch {
  color: #ff3b30;
  font-size: 14px;
  margin-top: 8px;
  text-align: center;
}

.register-success {
  background-color: rgba(76, 175, 80, 0.1);
  border-left: 3px solid var(--button-primary-bg);
  padding: 16px;
  border-radius: 4px;
  color: var(--text-color);
  text-align: center;
}

.login-now {
  background-color: var(--button-primary-bg);
  color: var(--button-primary-text);
  border: none;
  border-radius: var(--border-radius-sm);
  padding: 8px 16px;
  margin-top: 12px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.3px;
  transition: all 0.2s ease;
}

.login-now:hover {
  filter: brightness(1.1);
}

/* OAuth Styles */
.oauth-providers {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.oauth-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  background-color: var(--input-bg);
  color: var(--text-color);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.oauth-button:hover:not(:disabled) {
  background-color: rgba(0, 0, 0, 0.03);
}

.oauth-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.oauth-icon {
  position: absolute;
  left: 12px;
  font-size: 18px;
}

.oauth-google {
  border-color: #4285F4;
  color: #4285F4;
}

.oauth-github {
  border-color: #24292E;
  color: #24292E;
}

body.dark-theme .oauth-github {
  border-color: #f5f5f5;
  color: #f5f5f5;
}

.divider {
  display: flex;
  align-items: center;
  text-align: center;
  margin: 20px 0;
  color: var(--text-color);
  opacity: 0.5;
}

.divider::before,
.divider::after {
  content: "";
  flex: 1;
  border-bottom: 1px solid var(--border-color);
}

.divider span {
  padding: 0 10px;
  font-size: 14px;
}
</style>
