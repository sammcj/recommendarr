import apiService from './ApiService';
import { migrateKnownKeys } from '../utils/MigrationUtils';

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
      console.log(`Not migrating ${serviceName} credentials - user is not authenticated`);
      return null;
    }
    
    // Check if we've already tried to migrate this service
    if (this.migrated[serviceName]) {
      return null;
    }
    
    // Mark as migrated to avoid repeated attempts
    this.migrated[serviceName] = true;
    
    try {
      console.log(`Attempting to migrate ${serviceName} credentials from localStorage`);
      
      // Try to get legacy credentials from localStorage
      const legacyKey = `${serviceName}_credentials`;
      const legacyCredentials = localStorage.getItem(legacyKey);
      
      if (!legacyCredentials) {
        console.log(`No legacy ${serviceName} credentials found in localStorage`);
        return null;
      }
      
      // Parse the credentials
      const credentials = JSON.parse(legacyCredentials);
      
      // Store them server-side
      const success = await this.storeCredentials(serviceName, credentials);
      
      if (success) {
        console.log(`Successfully migrated ${serviceName} credentials to server storage`);
        
        // Only run general migration if user is authenticated
        if (apiService.getCurrentUser()) {
          // Run the general migration to ensure other settings are migrated too
          await migrateKnownKeys();
        } else {
          console.log('Skipping general migration - user is not authenticated');
        }
        
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
      console.log('Calling reset endpoint to reset user data');
      
      // Use ApiService for proper auth header
      const response = await apiService.post('/reset');
      console.log('Reset response:', response.data);
      
      // Verify the reset was successful
      if (response.data && response.data.success) {
        console.log('✓ Server confirmed user_data.json was reset successfully');
        
        // Clear the credentials cache since all user data was reset
        this.credentialsCache = {};
        console.log('Credentials cache cleared after user data reset');
        
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
        console.log(`Not storing credentials for ${serviceName} - user is not authenticated`);
        return false;
      }
      
      console.log(`Storing credentials for ${serviceName}`);
      // Send credentials to server using ApiService with auth header
      const response = await apiService.post(`/credentials/${serviceName}`, credentials);
      console.log(`Credentials for ${serviceName} stored successfully`);
      
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
      console.log(`Using cached credentials for ${serviceName}`);
      return this.credentialsCache[serviceName];
    }
    
    try {
      console.log(`Getting credentials for ${serviceName}`);
      // Use ApiService's axios instance which has the auth header properly setup
      const response = await apiService.get(`/credentials/${serviceName}`);
      console.log(`Retrieved credentials for ${serviceName} successfully`);
      
      // Store in cache
      this.credentialsCache[serviceName] = response.data;
      
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        console.log(`${serviceName} credentials not found, trying localStorage migration`);
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
      console.log(`Credentials for ${serviceName} found in cache`);
      return true;
    }
    
    try {
      console.log(`Checking if credentials exist for ${serviceName}`);
      
      // Use ApiService's axios instance which has the auth header properly setup
      const response = await apiService.get('/credentials');
      
      const hasService = !!response.data.services[serviceName];
      console.log(`Credentials for ${serviceName}: ${hasService ? 'FOUND' : 'NOT FOUND'}`);
      
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
      console.log('Loading all credentials at once');
      
      // Use ApiService's axios instance which has the auth header properly setup
      const response = await apiService.get('/credentials');
      
      if (response.data && response.data.services) {
        const services = response.data.services;
        const serviceNames = Object.keys(services);
        
        console.log(`Found ${serviceNames.length} services with credentials`);
        
        // Load each service's credentials into cache
        const loadPromises = serviceNames.map(async (serviceName) => {
          if (services[serviceName]) {
            try {
              // Get the full credentials for this service
              const credentials = await this.getCredentials(serviceName);
              if (credentials) {
                console.log(`Loaded credentials for ${serviceName} into cache`);
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
        
        console.log('All credentials loaded into cache');
        return credentialsMap;
      }
      
      console.log('No credentials found');
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
