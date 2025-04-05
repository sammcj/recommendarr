import apiService from '../services/ApiService';
import AuthService from '../services/AuthService';

/**
 * DatabaseStorageUtils - A utility for managing user settings in the database
 * 
 * This utility provides a similar API to StorageUtils but uses the database
 * instead of localStorage for persistent storage.
 * 
 * This version does not use any caching to prevent settings overwrite issues.
 */
class DatabaseStorageUtils {
    /**
     * Get the current user ID or fall back to 'guest'
     * @returns {string} User ID or 'guest'
     */
    getUserId() {
        const user = AuthService.getUser();
        return user?.userId || 'guest';
    }

    /**
     * Get a value from settings
     * @param {string} key - The key to get
     * @param {*} defaultValue - Default value if not found
     * @returns {Promise<*>} The value or defaultValue
     */
    async get(key, defaultValue = null) {
        try {
            // Always get directly from API
            console.log(`Fetching ${key} directly from API...`);
            const value = await apiService.getSetting(key);
            
            if (value !== null && value !== undefined) {
                console.log(`Got ${key} from API:`, value);
                return value;
            } else {
                console.log(`${key} not found in API, using default:`, defaultValue);
                return defaultValue;
            }
        } catch (error) {
            console.error(`Error getting ${key} from database:`, error);
            return defaultValue;
        }
    }

    /**
     * Set a value in settings
     * @param {string} key - The key to set
     * @param {*} value - The value to set
     * @returns {Promise<boolean>} Success status
     */
    async set(key, value) {
        // Save to server using individual setting API
        try {
            await apiService.saveSetting(key, value);
            return true;
        } catch (error) {
            console.error(`Error setting ${key} in database:`, error);
            return false;
        }
    }

    /**
     * Get and parse JSON from settings
     * @param {string} key - The key to get
     * @param {*} defaultValue - Default value if not found or invalid
     * @returns {Promise<*>} Parsed object or defaultValue
     */
    async getJSON(key, defaultValue = null) {
        try {
            console.log(`DatabaseStorageUtils.getJSON: fetching ${key}`);
            const value = await this.get(key);
            console.log(`DatabaseStorageUtils.getJSON: received ${key}:`, value);

            if (value === null || value === undefined) {
                console.log(`DatabaseStorageUtils.getJSON: ${key} value is null/undefined, using default:`, defaultValue);
                return defaultValue;
            }

            // If it's already an object, return it
            if (typeof value === 'object' && value !== null) {
                console.log(`DatabaseStorageUtils.getJSON: ${key} is already an object with ${Array.isArray(value) ? value.length : Object.keys(value).length} items`);
                return value;
            }

            // Otherwise, try to parse it
            try {
                const parsed = JSON.parse(value);
                console.log(`DatabaseStorageUtils.getJSON: ${key} parsed successfully with ${Array.isArray(parsed) ? parsed.length : Object.keys(parsed).length} items`);
                return parsed;
            } catch (error) {
                console.error(`Error parsing JSON for ${key}:`, error);
                return defaultValue;
            }
        } catch (error) {
            console.error(`Error in getJSON for ${key}:`, error);
            return defaultValue;
        }
    }

    /**
     * Stringify and store JSON in settings
     * @param {string} key - The key to set
     * @param {*} value - The value to stringify and store
     * @returns {Promise<boolean>} Success status
     */
    async setJSON(key, value) {
        // If it's already a string, store it directly
        if (typeof value === 'string') {
            return this.set(key, value);
        }

        // Otherwise, store the object directly (will be JSON stringified by the API)
        try {
            return this.set(key, value);
        } catch (error) {
            console.error(`Error storing JSON for ${key}:`, error);
            return false;
        }
    }

    /**
     * Remove a value from settings
     * @param {string} key - The key to remove
     * @returns {Promise<boolean>} Success status
     */
    async remove(key) {
        // Save to server using individual setting API
        // We set the value to null to effectively remove it
        try {
            await apiService.saveSetting(key, null);
            return true;
        } catch (error) {
            console.error(`Error removing ${key} from database:`, error);
            return false;
        }
    }

    /**
     * Check if a key exists in settings
     * @param {string} key - The key to check
     * @returns {Promise<boolean>} Whether the key exists
     */
    async has(key) {
        const value = await this.get(key);
        return value !== null && value !== undefined;
    }

    /**
     * Synchronous version of get for compatibility with existing code
     * This will always fetch from the API, so it's not truly synchronous
     * @param {string} key - The key to get
     * @param {*} defaultValue - Default value if not found
     * @returns {*} The value or defaultValue
     */
    getSync(key, defaultValue = null) {
        console.warn(`getSync called for ${key}, but this is now asynchronous. Returning default value and fetching in background.`);
        
        // Start a background fetch that will be available for future async calls
        this.get(key).catch(error => {
            console.error(`Background fetch for ${key} failed:`, error);
        });
        
        return defaultValue;
    }

    /**
     * Synchronous version of getJSON for compatibility with existing code
     * This will always return the default value and fetch in the background
     * @param {string} key - The key to get
     * @param {*} defaultValue - Default value if not found
     * @returns {*} The parsed value or defaultValue
     */
    getJSONSync(key, defaultValue = null) {
        console.warn(`getJSONSync called for ${key}, but this is now asynchronous. Returning default value and fetching in background.`);
        
        // Start a background fetch that will be available for future async calls
        this.getJSON(key).catch(error => {
            console.error(`Background fetch for ${key} failed:`, error);
        });
        
        return defaultValue;
    }
}

// Create a singleton instance
const databaseStorageUtils = new DatabaseStorageUtils();

export default databaseStorageUtils;
