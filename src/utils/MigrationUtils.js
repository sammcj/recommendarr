import StorageUtils from './StorageUtils';

/**
 * MigrationUtils - Utilities for migrating localStorage data
 * 
 * This utility helps migrate legacy localStorage keys to the 
 * new user-specific format used by StorageUtils.
 */

/**
 * Migrate all legacy localStorage keys to user-specific format
 * @returns {Promise<Object>} Migration results
 */
export async function migrateLocalStorage() {
  // Check if migration already happened for this user
  const migrationFlag = 'storageUtilsMigrationComplete';
  const isMigrated = StorageUtils.get(migrationFlag) === true;
  
  if (isMigrated) {
    console.log('Storage migration already completed for this user');
    return { status: 'already-completed' };
  }
  
  console.log('Starting localStorage migration to user-specific format...');
  
  // Perform migration
  const results = StorageUtils.migrateAllLegacyKeys();
  
  // Mark migration as complete
  StorageUtils.set(migrationFlag, true);
  
  console.log('Storage migration completed:', results);
  return { 
    status: 'completed', 
    results
  };
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
 * Migrate specific known keys to user-specific format
 * @returns {Promise<Object>} Migration results
 */
export async function migrateKnownKeys() {
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
        // Set with user prefix
        const success = StorageUtils.set(key, legacyValue);
        
        if (success) {
          results.migrated++;
        } else {
          results.failed++;
        }
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
 * @returns {Promise<Object>} Migration results
 */
export async function runFullMigration() {
  // Check if full migration already happened for this user
  const migrationFlag = 'fullStorageMigrationComplete';
  const isMigrated = StorageUtils.get(migrationFlag) === true;
  
  if (isMigrated) {
    console.log('Full storage migration already completed for this user');
    return { status: 'already-completed' };
  }
  
  // Start with known keys
  const knownResults = await migrateKnownKeys();
  
  // Then try to migrate any remaining legacy keys
  const allResults = StorageUtils.migrateAllLegacyKeys();
  
  // Mark full migration as complete
  StorageUtils.set(migrationFlag, true);
  
  return {
    status: 'completed',
    knownKeysMigration: knownResults,
    allKeysMigration: allResults
  };
}