import apiService from './ApiService';

/**
 * Service for managing API credentials (stored server-side)
 */
class CredentialsService {
  constructor() {
    this.baseUrl = apiService.baseUrl;
    // Used for migration from localStorage
    this.migrated = {};
    // Cache for storing credentials to avoid repeated API calls
    this.credentialsCache = {};
  }
  
  /**
   * Migrate credentials from localStorage to server storage
   * Only runs when user is authenticated
   * 
   * @param {string} serviceName - Name of the service
   * @returns {Promise<Object|null>} - Migrated credentials or null
   */
  async migrateFromLocalStorage(serviceName) {
    // Check if user is authenticated before attempting migration
    if (!apiService.getCurrentUser()) {
      
      return null;
    }
    
    // Check if we've already tried to migrate this service
    if (this.migrated[serviceName]) {
      return null;
    }
    
    // Mark as migrated to avoid repeated attempts
    this.migrated[serviceName] = true;
    
    try {
      
      
      // Try to get legacy credentials from localStorage
      const legacyKey = `${serviceName}_credentials`;
      const legacyCredentials = localStorage.getItem(legacyKey);
      
      if (!legacyCredentials) {
        
        return null;
      }
      
      // Parse the credentials
      const credentials = JSON.parse(legacyCredentials);
      
      // Store them server-side
      const success = await this.storeCredentials(serviceName, credentials);
      
      if (success) {
        
        
        // Migration is no longer needed
        
        
        return credentials;
      } else {
        console.error(`Failed to migrate ${serviceName} credentials to server storage`);
        return null;
      }
    } catch (error) {
      console.error(`Error migrating ${serviceName} credentials:`, error);
      return null;
    }
  }
  
  /**
   * Reset all user data on the server except auth data
   * 
   * @returns {Promise<boolean>} - Success status
   */
  async resetUserData() {
    try {
      
      
      // Use ApiService for proper auth header
      const response = await apiService.post('/reset');
      
      
      // Verify the reset was successful
      if (response.data && response.data.success) {
        
        
        // Clear the credentials cache since all user data was reset
        this.credentialsCache = {};
        
        
        return true;
      } else {
        console.error('Server returned success=false for reset operation');
        return false;
      }
    } catch (error) {
      console.error('Error resetting user data:', error);
      console.error('Error details:', error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
      return false;
    }
  }

  /**
   * Store credentials for a specific service
   * 
   * @param {string} serviceName - Name of the service (sonarr, radarr, etc)
   * @param {Object} credentials - Credentials object to store
   * @returns {Promise<boolean>} - Success status
   */
  async storeCredentials(serviceName, credentials) {
    try {
      // Check if user is authenticated before making the request
      if (!apiService.getCurrentUser()) {
        
        return false;
      }
      
      
      // Send credentials to server using ApiService with auth header
      const response = await apiService.post(`/credentials/${serviceName}`, credentials);
      
      
      // Update cache on successful store
      if (response.data.success) {
        this.credentialsCache[serviceName] = credentials;
      }
      
      return response.data.success;
    } catch (error) {
      console.error(`Error storing credentials for ${serviceName}:`, error);
      return false;
    }
  }

  /**
   * Retrieve credentials for a specific service
   * 
   * @param {string} serviceName - Name of the service
   * @returns {Promise<Object|null>} - Credentials object or null if not found
   */
  async getCredentials(serviceName) {
    // Check if we have cached credentials
    if (this.credentialsCache[serviceName]) {
      
      return this.credentialsCache[serviceName];
    }
    
    try {
      
      // Use ApiService's axios instance which has the auth header properly setup
      const response = await apiService.get(`/credentials/${serviceName}`);
      
      
      // Store in cache
      this.credentialsCache[serviceName] = response.data;
      
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        
        // Service not found - try migrating from localStorage
        const migratedCredentials = await this.migrateFromLocalStorage(serviceName);
        
        // If migration successful, cache the credentials
        if (migratedCredentials) {
          this.credentialsCache[serviceName] = migratedCredentials;
        }
        
        return migratedCredentials;
      }
      console.error(`Error retrieving credentials for ${serviceName}:`, error);
      return null;
    }
  }

  /**
   * Delete credentials for a specific service
   * 
   * @param {string} serviceName - Name of the service
   * @returns {Promise<boolean>} - Success status
   */
  async deleteCredentials(serviceName) {
    try {
      // Use ApiService's axios instance which has the auth header properly setup
      const response = await apiService.delete(`/credentials/${serviceName}`);
      
      // Remove from cache on successful delete
      if (response.data.success) {
        delete this.credentialsCache[serviceName];
      }
      
      return response.data.success;
    } catch (error) {
      console.error(`Error deleting credentials for ${serviceName}:`, error);
      return false;
    }
  }

  /**
   * Check if credentials exist for a service
   * 
   * @param {string} serviceName - Name of the service
   * @returns {Promise<boolean>} - Whether credentials exist
   */
  async hasCredentials(serviceName) {
    // Check cache first
    if (this.credentialsCache[serviceName]) {
      
      return true;
    }
    
    try {
      
      
      // Use ApiService's axios instance which has the auth header properly setup
      const response = await apiService.get('/credentials');
      
      const hasService = !!response.data.services[serviceName];
      
      
      return hasService;
    } catch (error) {
      console.error(`Error checking credentials for ${serviceName}:`, error);
      return false;
    }
  }
  
  /**
   * Load all credentials at once to populate the cache
   * This should be called during app initialization before any service tries to access credentials
   * 
   * @returns {Promise<Object>} - Object containing all credentials by service name
   */
  async loadAllCredentials() {
    try {
      
      
      // Use ApiService's axios instance which has the auth header properly setup
      const response = await apiService.get('/credentials');
      
      if (response.data && response.data.services) {
        const services = response.data.services;
        const serviceNames = Object.keys(services);
        
        
        
        // Load each service's credentials into cache
        const loadPromises = serviceNames.map(async (serviceName) => {
          if (services[serviceName]) {
            try {
              // Get the full credentials for this service
              const credentials = await this.getCredentials(serviceName);
              if (credentials) {
                
                // The getCredentials method already updates the cache
              }
              return { serviceName, credentials };
            } catch (error) {
              console.error(`Error loading credentials for ${serviceName}:`, error);
              return { serviceName, credentials: null };
            }
          }
          return { serviceName, credentials: null };
        });
        
        // Wait for all credentials to be loaded
        const results = await Promise.all(loadPromises);
        
        // Convert results array to object
        const credentialsMap = {};
        results.forEach(result => {
          if (result.credentials) {
            credentialsMap[result.serviceName] = result.credentials;
          }
        });
        
        
        return credentialsMap;
      }
      
      
      return {};
    } catch (error) {
      console.error('Error loading all credentials:', error);
      return {};
    }
  }
}

// Create singleton instance
const credentialsService = new CredentialsService();

export default credentialsService;
