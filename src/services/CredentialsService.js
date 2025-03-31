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
  }
  
  /**
   * Migrate credentials from localStorage to server storage
   * 
   * @param {string} serviceName - Name of the service
   * @returns {Promise<Object|null>} - Migrated credentials or null
   */
  async migrateFromLocalStorage(serviceName) {
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
        
        // Run the general migration to ensure other settings are migrated too
        await migrateKnownKeys();
        
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
      console.log(`Storing credentials for ${serviceName}`);
      // Send credentials to server using ApiService with auth header
      const response = await apiService.post(`/credentials/${serviceName}`, credentials);
      console.log(`Credentials for ${serviceName} stored successfully`);
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
    try {
      console.log(`Getting credentials for ${serviceName}`);
      // Use ApiService's axios instance which has the auth header properly setup
      const response = await apiService.get(`/credentials/${serviceName}`);
      console.log(`Retrieved credentials for ${serviceName} successfully`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        console.log(`${serviceName} credentials not found, trying localStorage migration`);
        // Service not found - try migrating from localStorage
        return this.migrateFromLocalStorage(serviceName);
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
}

// Create singleton instance
const credentialsService = new CredentialsService();

export default credentialsService;
