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
            console.log('Database cache already loading, waiting for completion');
            return this.loadPromise;
        }

        console.log('Loading database cache from server');
        
        // Create a new loading promise with timeout
        this.loadPromise = new Promise((resolve) => {
            // Set a timeout to prevent hanging indefinitely
            const timeoutId = setTimeout(() => {
                console.warn('Database cache loading timed out after 5 seconds');
                this.loadPromise = null;
                // Initialize with empty cache to prevent blocking the app
                if (!this.cacheLoaded) {
                    this.cache = {};
                    this.cacheLoaded = true;
                }
                resolve(false);
            }, 5000);
            
            // Attempt to load settings from API
            // Note: We're still using getSettings for initial load to get all settings at once
            // This is more efficient than making individual calls for each setting
            apiService.getSettings()
                .then(settings => {
                    // Clear timeout since we got a response
                    clearTimeout(timeoutId);
                    
                    // Update cache with settings
                    this.cache = settings || {};
                    this.cacheLoaded = true;
                    this.loadPromise = null; // Clear the promise
                    
                    console.log('Database cache loaded successfully with', Object.keys(this.cache).length, 'keys');
                    resolve(true);
                })
                .catch(error => {
                    // Clear timeout since we got a response
                    clearTimeout(timeoutId);
                    
                    console.error('Error loading settings cache:', error);
                    
                    // Initialize with empty cache to prevent blocking the app
                    this.cache = {};
                    this.cacheLoaded = true;
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
        try {
            // Check cache first for performance
            if (this.cacheLoaded && this.cache[key] !== undefined) {
                return this.cache[key];
            }
            
            // If not in cache or cache not loaded, get directly from API
            try {
                const value = await apiService.getSetting(key);
                
                // Update cache if it's loaded
                if (this.cacheLoaded) {
                    this.cache[key] = value;
                }
                
                return value !== null && value !== undefined ? value : defaultValue;
            } catch (error) {
                // If API call fails, try to load from cache as fallback
                if (!this.cacheLoaded) {
                    console.log(`API call failed, loading cache for ${key}`);
                    const loadResult = await this.loadCache();
                    if (!loadResult) {
                        console.warn(`Failed to load cache for ${key}, using default value`);
                        return defaultValue;
                    }
                    
                    return this.cache[key] !== undefined ? this.cache[key] : defaultValue;
                }
                
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
        if (!this.cacheLoaded) {
            await this.loadCache();
        }

        // Update cache
        this.cache[key] = value;

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
            const value = await this.get(key);

            if (value === null || value === undefined) {
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
        if (!this.cacheLoaded) {
            await this.loadCache();
        }

        // Remove from cache
        delete this.cache[key];

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
        try {
            const value = this.getSync(key);

            if (value === null || value === undefined) {
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
        } catch (error) {
            console.error(`Error in getJSONSync for ${key}:`, error);
            return defaultValue;
        }
    }
}

// Create a singleton instance
const databaseStorageUtils = new DatabaseStorageUtils();

export default databaseStorageUtils;
