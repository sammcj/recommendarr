import apiService from '../services/ApiService';
import AuthService from '../services/AuthService';

/**
 * DatabaseStorageUtils - A utility for managing user settings in the database
 * 
 * This utility provides a similar API to StorageUtils but uses the database
 * instead of localStorage for persistent storage.
 */
class DatabaseStorageUtils {
    constructor() {
        this.cache = {}; // In-memory cache for performance
        this.cacheLoaded = false;
        this.loadPromise = null; // Promise for loading cache
    }

    /**
     * Get the current user ID or fall back to 'guest'
     * @returns {string} User ID or 'guest'
     */
    getUserId() {
        const user = AuthService.getUser();
        return user?.userId || 'guest';
    }

    /**
     * Load all settings into cache
     * @returns {Promise<boolean>} Success status
     */
    async loadCache() {
        // If already loading, return the existing promise
        if (this.loadPromise) {
            return this.loadPromise;
        }

        // Create a new loading promise
        this.loadPromise = new Promise((resolve) => {
            apiService.getSettings()
                .then(settings => {
                    this.cache = settings || {};
                    this.cacheLoaded = true;
                    this.loadPromise = null; // Clear the promise
                    resolve(true);
                })
                .catch(error => {
                    console.error('Error loading settings cache:', error);
                    this.loadPromise = null; // Clear the promise
                    resolve(false);
                });
        });

        return this.loadPromise;
    }

    /**
     * Get a value from settings
     * @param {string} key - The key to get
     * @param {*} defaultValue - Default value if not found
     * @returns {Promise<*>} The value or defaultValue
     */
    async get(key, defaultValue = null) {
        if (!this.cacheLoaded) {
            await this.loadCache();
        }

        return this.cache[key] !== undefined ? this.cache[key] : defaultValue;
    }

    /**
     * Set a value in settings
     * @param {string} key - The key to set
     * @param {*} value - The value to set
     * @returns {Promise<boolean>} Success status
     */
    async set(key, value) {
        if (!this.cacheLoaded) {
            await this.loadCache();
        }

        // Update cache
        this.cache[key] = value;

        // Save to server
        try {
            await apiService.saveSettings(this.cache);
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
        const value = await this.get(key);

        if (value === null) {
            return defaultValue;
        }

        // If it's already an object, return it
        if (typeof value === 'object' && value !== null) {
            return value;
        }

        // Otherwise, try to parse it
        try {
            return JSON.parse(value);
        } catch (error) {
            console.error(`Error parsing JSON for ${key}:`, error);
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
        if (!this.cacheLoaded) {
            await this.loadCache();
        }

        // Remove from cache
        delete this.cache[key];

        // Save to server
        try {
            await apiService.saveSettings(this.cache);
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
        if (!this.cacheLoaded) {
            await this.loadCache();
        }

        return this.cache[key] !== undefined;
    }

    /**
     * Synchronous version of get for compatibility with existing code
     * This will return cached values if available, otherwise default value
     * @param {string} key - The key to get
     * @param {*} defaultValue - Default value if not found
     * @returns {*} The value or defaultValue
     */
    getSync(key, defaultValue = null) {
        if (!this.cacheLoaded) {
            console.warn(`getSync called for ${key} before cache is loaded, returning default value`);
            return defaultValue;
        }

        return this.cache[key] !== undefined ? this.cache[key] : defaultValue;
    }

    /**
     * Synchronous version of getJSON for compatibility with existing code
     * This will return cached values if available, otherwise default value
     * @param {string} key - The key to get
     * @param {*} defaultValue - Default value if not found
     * @returns {*} The parsed value or defaultValue
     */
    getJSONSync(key, defaultValue = null) {
        const value = this.getSync(key);

        if (value === null) {
            return defaultValue;
        }

        // If it's already an object, return it
        if (typeof value === 'object' && value !== null) {
            return value;
        }

        // Otherwise, try to parse it
        try {
            return JSON.parse(value);
        } catch (error) {
            console.error(`Error parsing JSON for ${key}:`, error);
            return defaultValue;
        }
    }
}

// Create a singleton instance
const databaseStorageUtils = new DatabaseStorageUtils();

export default databaseStorageUtils;
