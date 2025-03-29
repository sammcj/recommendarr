import AuthService from '../services/AuthService';

/**
 * StorageUtils - A utility for managing localStorage with user-specific isolation
 * 
 * This utility ensures that each user's data is stored with a user-specific prefix
 * to prevent data leakage between users in multi-user environments.
 * 
 * It also provides backward compatibility for legacy keys and handles common
 * JSON parsing/stringifying operations.
 */
class StorageUtils {
  /**
   * Get the current user ID or fall back to 'guest'
   * @returns {string} User ID or 'guest'
   */
  getUserId() {
    const user = AuthService.getUser();
    return user?.userId || 'guest';
  }

  /**
   * Generate a user-specific key
   * @param {string} key - The original storage key
   * @returns {string} User-prefixed key
   */
  getUserKey(key) {
    const userId = this.getUserId();
    return `user_${userId}_${key}`;
  }

  /**
   * Get item from localStorage with user isolation
   * 
   * @param {string} key - Base key without user prefix
   * @param {*} defaultValue - Default value if not found
   * @param {boolean} fallbackToLegacy - Whether to check legacy key if user key not found
   * @returns {*} - The stored value or defaultValue if not found
   */
  get(key, defaultValue = null, fallbackToLegacy = true) {
    const userKey = this.getUserKey(key);
    
    try {
      // First try user-specific key
      const userValue = localStorage.getItem(userKey);
      if (userValue !== null) {
        // Handle boolean values stored as strings
        if (userValue === 'true') return true;
        if (userValue === 'false') return false;
        
        // Handle numeric values
        if (!isNaN(userValue) && userValue.trim() !== '') {
          const num = Number(userValue);
          return num;
        }
        
        return userValue;
      }
      
      // Fall back to legacy key if enabled
      if (fallbackToLegacy && this.getUserId() !== 'guest') {
        const legacyValue = localStorage.getItem(key);
        if (legacyValue !== null) {
          // Auto-migrate to user-specific key
          this.set(key, legacyValue);
          
          // Parse the value as above
          if (legacyValue === 'true') return true;
          if (legacyValue === 'false') return false;
          
          if (!isNaN(legacyValue) && legacyValue.trim() !== '') {
            const num = Number(legacyValue);
            return num;
          }
          
          return legacyValue;
        }
      }
      
      // Return default value if nothing found
      return defaultValue;
    } catch (error) {
      console.error(`Error getting ${key} from localStorage:`, error);
      return defaultValue;
    }
  }

  /**
   * Set item in localStorage with user isolation
   * 
   * @param {string} key - Base key without user prefix
   * @param {*} value - Value to store
   * @returns {boolean} Success status
   */
  set(key, value) {
    const userKey = this.getUserKey(key);
    
    try {
      // Handle special types
      let valueToStore = value;
      
      // Convert objects/arrays to JSON strings
      if (typeof value === 'object' && value !== null) {
        valueToStore = JSON.stringify(value);
      }
      
      // Store the value
      localStorage.setItem(userKey, valueToStore);
      return true;
    } catch (error) {
      console.error(`Error setting ${key} in localStorage:`, error);
      return false;
    }
  }

  /**
   * Remove item from localStorage with user isolation
   * 
   * @param {string} key - Base key without user prefix
   * @param {boolean} removeLegacy - Whether to also remove the legacy key
   * @returns {boolean} Success status
   */
  remove(key, removeLegacy = true) {
    const userKey = this.getUserKey(key);
    
    try {
      // Remove user-specific key
      localStorage.removeItem(userKey);
      
      // Optionally remove legacy key
      if (removeLegacy) {
        localStorage.removeItem(key);
      }
      
      return true;
    } catch (error) {
      console.error(`Error removing ${key} from localStorage:`, error);
      return false;
    }
  }

  /**
   * Get and parse JSON from localStorage with user isolation
   * 
   * @param {string} key - Base key without user prefix
   * @param {*} defaultValue - Default value if not found or invalid
   * @param {boolean} fallbackToLegacy - Whether to check legacy key if user key not found
   * @returns {*} - Parsed object or defaultValue if not found/invalid
   */
  getJSON(key, defaultValue = null, fallbackToLegacy = true) {
    const userKey = this.getUserKey(key);
    
    try {
      // First try user-specific key
      const userValue = localStorage.getItem(userKey);
      if (userValue !== null) {
        return JSON.parse(userValue);
      }
      
      // Fall back to legacy key if enabled
      if (fallbackToLegacy && this.getUserId() !== 'guest') {
        const legacyValue = localStorage.getItem(key);
        if (legacyValue !== null) {
          // Parse the value
          const parsedValue = JSON.parse(legacyValue);
          
          // Auto-migrate to user-specific key
          this.set(key, parsedValue);
          
          return parsedValue;
        }
      }
      
      // Return default value if nothing found
      return defaultValue;
    } catch (error) {
      console.error(`Error parsing JSON for ${key} from localStorage:`, error);
      return defaultValue;
    }
  }

  /**
   * Stringify and store JSON in localStorage with user isolation
   * 
   * @param {string} key - Base key without user prefix
   * @param {*} value - Value to stringify and store
   * @returns {boolean} Success status
   */
  setJSON(key, value) {
    try {
      // Convert to JSON string
      const jsonValue = JSON.stringify(value);
      
      // Store using the set method
      return this.set(key, jsonValue);
    } catch (error) {
      console.error(`Error stringifying and storing JSON for ${key}:`, error);
      return false;
    }
  }

  /**
   * Check if a key exists in localStorage (either user-specific or legacy)
   * 
   * @param {string} key - Base key without user prefix
   * @param {boolean} checkLegacy - Whether to check legacy key too
   * @returns {boolean} Whether the key exists
   */
  has(key, checkLegacy = true) {
    const userKey = this.getUserKey(key);
    
    try {
      // Check user-specific key
      if (localStorage.getItem(userKey) !== null) {
        return true;
      }
      
      // Check legacy key if enabled
      if (checkLegacy && localStorage.getItem(key) !== null) {
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`Error checking if ${key} exists in localStorage:`, error);
      return false;
    }
  }

  /**
   * Clear all user-specific localStorage items
   * 
   * @param {boolean} clearLegacy - Whether to clear legacy keys too
   * @returns {boolean} Success status
   */
  clearUserData(clearLegacy = false) {
    const userId = this.getUserId();
    const prefix = `user_${userId}_`;
    
    try {
      // Loop through all localStorage keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        
        // Remove user-specific keys
        if (key.startsWith(prefix)) {
          localStorage.removeItem(key);
        }
        
        // Remove legacy keys if enabled
        if (clearLegacy && !key.includes('user_')) {
          localStorage.removeItem(key);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error clearing user data from localStorage:', error);
      return false;
    }
  }

  /**
   * Migrate all legacy localStorage keys to user-specific format
   * 
   * @returns {object} Results of migration
   */
  migrateAllLegacyKeys() {
    const results = {
      migrated: 0,
      failed: 0,
      total: 0
    };
    
    try {
      // Loop through all localStorage keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        
        // Skip already user-specific keys
        if (key.includes('user_')) {
          continue;
        }
        
        // Skip authentication keys
        if (key === 'auth_token' || key === 'auth_user') {
          continue;
        }
        
        results.total++;
        
        try {
          // Get the legacy value
          const value = localStorage.getItem(key);
          
          // Set it with user prefix
          const success = this.set(key, value);
          
          if (success) {
            results.migrated++;
          } else {
            results.failed++;
          }
        } catch (itemError) {
          console.error(`Error migrating key ${key}:`, itemError);
          results.failed++;
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error during legacy key migration:', error);
      return results;
    }
  }
}

// Create a singleton instance
const storageUtils = new StorageUtils();

export default storageUtils;