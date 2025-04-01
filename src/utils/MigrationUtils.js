import databaseStorageUtils from './DatabaseStorageUtils';

/**
 * MigrationUtils - Utilities for migrating localStorage data
 * 
 * This utility helps migrate legacy localStorage keys to the 
 * new database storage system.
 */

/**
 * Migrate all legacy localStorage keys to database storage
 * @param {boolean} forceRun - Force migration even if user might not be authenticated
 * @returns {Promise<Object>} Migration results
 */
export async function migrateLocalStorage(forceRun = false) {
  // Import apiService dynamically to avoid circular dependencies
  const apiService = (await import('../services/ApiService')).default;
  
  // Check if user is authenticated
  if (!forceRun && !apiService.getCurrentUser()) {
    console.log('Skipping localStorage migration - user is not authenticated');
    return { 
      status: 'skipped',
      reason: 'user-not-authenticated'
    };
  }
  
  // Check if migration already happened for this user
  const migrationFlag = 'databaseStorageMigrationComplete';
  const isMigrated = await databaseStorageUtils.get(migrationFlag) === true;
  
  if (isMigrated) {
    console.log('Storage migration already completed for this user');
    return { status: 'already-completed' };
  }
  
  console.log('Starting localStorage migration to database storage...');
  
  // Perform migration - pass the forceRun parameter
  const results = await migrateAllLegacyKeys(forceRun);
  
  // Mark migration as complete
  await databaseStorageUtils.set(migrationFlag, true);
  
  console.log('Storage migration completed:', results);
  return { 
    status: 'completed', 
    results
  };
}

/**
 * Migrate all legacy localStorage keys to database storage
 * @param {boolean} forceRun - Force migration even if user might not be authenticated
 * @returns {Promise<Object>} Migration results
 */
export async function migrateAllLegacyKeys(forceRun = false) {
  // Import apiService dynamically to avoid circular dependencies
  const apiService = (await import('../services/ApiService')).default;
  
  // Check if user is authenticated
  if (!forceRun && !apiService.getCurrentUser()) {
    console.log('Skipping migration of all legacy keys - user is not authenticated');
    return { 
      status: 'skipped',
      reason: 'user-not-authenticated',
      migrated: 0,
      failed: 0,
      total: 0
    };
  }
  
  const results = {
    migrated: 0,
    failed: 0,
    total: 0
  };
  
  try {
    // Loop through all localStorage keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      
      // Skip already migrated keys or keys that start with user_
      if (key.includes('MigrationComplete') || key.includes('user_')) {
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
        
        // Try to parse JSON if it looks like JSON
        let parsedValue = value;
        if (value && (value.startsWith('{') || value.startsWith('['))) {
          try {
            parsedValue = JSON.parse(value);
          } catch (e) {
            // Not valid JSON, use as is
            parsedValue = value;
          }
        } else if (value === 'true') {
          parsedValue = true;
        } else if (value === 'false') {
          parsedValue = false;
        } else if (!isNaN(value) && value.trim() !== '') {
          parsedValue = Number(value);
        }
        
        // Set it in database storage
        await databaseStorageUtils.set(key, parsedValue);
        results.migrated++;
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

/**
 * List of known localStorage keys used in the application
 */
export const knownStorageKeys = [
  // History.vue
  'previousMovieRecommendations',
  'previousTVRecommendations',
  'historyColumnsCount',
  'historyHideExisting',
  'historyHideLiked',
  'historyHideDisliked',
  'historyHideHidden',
  
  // RequestRecommendations.vue
  'numRecommendations',
  'columnsCount',
  'aiTemperature',
  'openaiModel',
  'promptStyle',
  'useStructuredOutput',
  'useSampledLibrary',
  'librarySampleSize',
  'isMovieMode',
  'tvGenrePreferences',
  'tvCustomVibe',
  'tvLanguagePreference',
  'movieGenrePreferences',
  'movieCustomVibe',
  'movieLanguagePreference',
  'contentTypePreference',
  'currentMovieRecommendations',
  'currentTVRecommendations',
  'likedMovieRecommendations',
  'likedTVRecommendations',
  'dislikedMovieRecommendations',
  'dislikedTVRecommendations',
  'hiddenMovies',
  'hiddenTV',
  
  // Watch history
  'watchHistoryMovies',
  'watchHistoryShows',
  'jellyfinWatchHistoryMovies',
  'jellyfinWatchHistoryShows',
  'tautulliWatchHistoryMovies',
  'tautulliWatchHistoryShows',
  'traktWatchHistoryMovies',
  'traktWatchHistoryShows',
  
  // Service-specific settings
  'plexRecentLimit',
  'plexHistoryMode',
  'plexOnlyMode',
  'plexUseHistory',
  'plexCustomHistoryDays',
  'jellyfinOnlyMode',
  'tautulliOnlyMode',
  'traktOnlyMode',
  
  // UI settings
  'settingsTab',
  'lastVisitedPage'
];

/**
 * Migrate specific known keys to database storage
 * @param {boolean} forceRun - Force migration even if user might not be authenticated
 * @returns {Promise<Object>} Migration results
 */
export async function migrateKnownKeys(forceRun = false) {
  // Import apiService dynamically to avoid circular dependencies
  const apiService = (await import('../services/ApiService')).default;
  
  // Check if user is authenticated
  if (!forceRun && !apiService.getCurrentUser()) {
    console.log('Skipping migration of known localStorage keys - user is not authenticated');
    return { 
      status: 'skipped',
      reason: 'user-not-authenticated'
    };
  }
  
  console.log('Starting migration of known localStorage keys...');
  
  const results = {
    migrated: 0,
    failed: 0,
    total: knownStorageKeys.length
  };
  
  for (const key of knownStorageKeys) {
    try {
      // Check if legacy key exists
      const legacyValue = localStorage.getItem(key);
      
      if (legacyValue !== null) {
        // Try to parse JSON if it looks like JSON
        let parsedValue = legacyValue;
        if (legacyValue && (legacyValue.startsWith('{') || legacyValue.startsWith('['))) {
          try {
            parsedValue = JSON.parse(legacyValue);
          } catch (e) {
            // Not valid JSON, use as is
            parsedValue = legacyValue;
          }
        } else if (legacyValue === 'true') {
          parsedValue = true;
        } else if (legacyValue === 'false') {
          parsedValue = false;
        } else if (!isNaN(legacyValue) && legacyValue.trim() !== '') {
          parsedValue = Number(legacyValue);
        }
        
        // Set in database storage
        await databaseStorageUtils.set(key, parsedValue);
        results.migrated++;
      }
    } catch (error) {
      console.error(`Error migrating key ${key}:`, error);
      results.failed++;
    }
  }
  
  console.log('Known keys migration completed:', results);
  return { 
    status: 'completed', 
    results
  };
}

/**
 * Full migration strategy
 * - Migrate known keys explicitly
 * - Then try to migrate all legacy keys
 * - Mark migration as complete
 * 
 * @param {boolean} forceRun - Force migration even if user might not be authenticated
 * @returns {Promise<Object>} Migration results
 */
export async function runFullMigration(forceRun = false) {
  // Import apiService dynamically to avoid circular dependencies
  const apiService = (await import('../services/ApiService')).default;
  
  // Check if user is authenticated
  if (!forceRun && !apiService.getCurrentUser()) {
    console.log('Skipping full migration - user is not authenticated');
    return { 
      status: 'skipped',
      reason: 'user-not-authenticated'
    };
  }
  
  // Check if full migration already happened for this user
  const migrationFlag = 'fullDatabaseStorageMigrationComplete';
  const isMigrated = await databaseStorageUtils.get(migrationFlag) === true;
  
  if (isMigrated) {
    console.log('Full storage migration already completed for this user');
    return { status: 'already-completed' };
  }
  
  // Start with known keys
  const knownResults = await migrateKnownKeys(forceRun);
  
  // Then try to migrate any remaining legacy keys
  const allResults = await migrateAllLegacyKeys(forceRun);
  
  // Mark full migration as complete
  await databaseStorageUtils.set(migrationFlag, true);
  
  return {
    status: 'completed',
    knownKeysMigration: knownResults,
    allKeysMigration: allResults
  };
}
