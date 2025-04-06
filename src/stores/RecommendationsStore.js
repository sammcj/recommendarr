import { reactive, readonly, computed } from 'vue';
import databaseStorageUtils from '../utils/DatabaseStorageUtils';
import apiService from '../services/ApiService';

/**
 * RecommendationsStore - A centralized store for recommendation settings
 * 
 * This store manages all settings related to recommendations, providing
 * a single source of truth for both RecommendationSettings.vue and
 * RequestRecommendations.vue components.
 */

// Create a reactive state object to hold all settings
const state = reactive({
  // Model and API settings
  selectedModel: '',
  customModel: '',
  temperature: 0.7,
  useStructuredOutput: false,
  
  // Content type
  isMovieMode: false,
  
  // Library settings
  useSampledLibrary: false,
  sampleSize: 100,
  
  // Display settings
  numRecommendations: 10,
  columnsCount: 5,
  
  // Content preferences
  selectedGenres: [],
  promptStyle: 'vibe',
  customVibe: '',
  useCustomPromptOnly: false,
  selectedLanguage: '',
  
  // Watch history settings
  plexUseHistory: true,
  plexHistoryMode: 'all',
  plexCustomHistoryDays: 30,
  plexOnlyMode: false,
  
  jellyfinUseHistory: true,
  jellyfinHistoryMode: 'all',
  jellyfinCustomHistoryDays: 30,
  jellyfinOnlyMode: false,
  
  tautulliUseHistory: true,
  tautulliHistoryMode: 'all',
  tautulliCustomHistoryDays: 30,
  tautulliOnlyMode: false,
  
  traktUseHistory: true,
  traktHistoryMode: 'all',
  traktCustomHistoryDays: 30,
  traktOnlyMode: false,
  
  // Recommendation history
  previousShowRecommendations: [],
  previousMovieRecommendations: [],
  likedRecommendations: [],
  dislikedRecommendations: [],
  
  // UI state
  settingsExpanded: false,
  configurationExpanded: true,
  recNumberExpanded: true,
  postersPerRowExpanded: true,
  genrePreferencesExpanded: true,
  customVibeExpanded: true,
  contentLanguageExpanded: true,
  plexHistoryExpanded: true,
  jellyfinHistoryExpanded: true,
  tautulliHistoryExpanded: true,
  traktHistoryExpanded: true,
  
  // Loading state
  isLoading: false,
  loadingComplete: false
});

// Computed properties
const getters = {
  // Get the current previous recommendations based on mode
  previousRecommendations: computed(() => {
    const recs = state.isMovieMode ? state.previousMovieRecommendations : state.previousShowRecommendations;
    console.log(`RecommendationsStore.previousRecommendations computed property:`, {
      isMovieMode: state.isMovieMode,
      movieRecs: state.previousMovieRecommendations ? state.previousMovieRecommendations.length : 0,
      tvRecs: state.previousShowRecommendations ? state.previousShowRecommendations.length : 0,
      returnedRecs: recs ? recs.length : 0
    });
    return recs || [];
  }),
  
  // Check if any watch history provider is configured to use only mode
  isUsingOnlyMode: computed(() => {
    return state.plexOnlyMode || state.jellyfinOnlyMode || state.tautulliOnlyMode || state.traktOnlyMode;
  })
};

// Actions to modify the state
const actions = {
  /**
   * Initialize the store by loading all settings from storage
   */
  async initialize() {
    // If already completed initialization, just return current state
    if (state.loadingComplete) {
      console.log('RecommendationsStore: Already initialized, returning current state');
      
      // Force a refresh of recommendation history data even if initialized
      try {
        await this.loadRecommendationHistory();
        console.log('RecommendationsStore: Refreshed recommendation history');
      } catch (error) {
        console.error('RecommendationsStore: Error refreshing recommendation history:', error);
      }
      
      return state;
    }
    
    // If currently loading, wait for it to complete
    if (state.isLoading) {
      console.log('RecommendationsStore: Loading in progress, waiting...');
      // Create a simple promise that resolves when loading is complete
      await new Promise(resolve => {
        const checkLoading = () => {
          if (!state.isLoading) {
            resolve();
          } else {
            setTimeout(checkLoading, 100); // Check every 100ms
          }
        };
        checkLoading();
      });
      console.log('RecommendationsStore: Existing loading completed');
      return state;
    }
    
    console.log('RecommendationsStore: Starting new initialization');
    state.isLoading = true;
    
    try {
      console.log('RecommendationsStore: Loading settings from storage');
      // Load model settings
      const savedModel = await databaseStorageUtils.get('openaiModel');
      if (savedModel) {
        state.selectedModel = savedModel;
      }
      
      const savedTemperature = await databaseStorageUtils.get('temperature');
      if (savedTemperature !== null) {
        state.temperature = parseFloat(savedTemperature);
      }
      
      const useStructuredOutput = await databaseStorageUtils.get('useStructuredOutput');
      if (useStructuredOutput !== null) {
        state.useStructuredOutput = useStructuredOutput === true || useStructuredOutput === 'true';
      }
      
      // Load content type
      const contentTypePreference = await databaseStorageUtils.get('contentTypePreference');
      if (contentTypePreference) {
        state.isMovieMode = contentTypePreference === 'movies';
      }
      
      // Load library settings
      const useSampledLibrary = await databaseStorageUtils.get('useSampledLibrary');
      if (useSampledLibrary !== null) {
        state.useSampledLibrary = useSampledLibrary === true || useSampledLibrary === 'true';
      }
      
      const librarySampleSize = await databaseStorageUtils.get('librarySampleSize');
      if (librarySampleSize !== null) {
        state.sampleSize = parseInt(librarySampleSize);
      }
      
      // Load display settings
      const savedNumRecommendations = await databaseStorageUtils.get('numRecommendations');
      if (savedNumRecommendations !== null) {
        state.numRecommendations = parseInt(savedNumRecommendations);
      }
      
      const savedColumnsCount = await databaseStorageUtils.get('columnsCount');
      if (savedColumnsCount !== null) {
        state.columnsCount = parseInt(savedColumnsCount);
      }
      
      // Load content preferences
      const savedGenres = await databaseStorageUtils.getJSON('genrePreferences');
      if (savedGenres && Array.isArray(savedGenres)) {
        state.selectedGenres = savedGenres;
      }
      
      const savedPromptStyle = await databaseStorageUtils.get('promptStyle');
      if (savedPromptStyle) {
        state.promptStyle = savedPromptStyle;
      }
      
      const savedCustomVibe = await databaseStorageUtils.get('customVibe');
      if (savedCustomVibe) {
        state.customVibe = savedCustomVibe;
      }
      
      const useCustomPromptOnly = await databaseStorageUtils.get('useCustomPromptOnly');
      if (useCustomPromptOnly !== null) {
        state.useCustomPromptOnly = useCustomPromptOnly === true || useCustomPromptOnly === 'true';
      }
      
      const savedLanguage = await databaseStorageUtils.get('languagePreference');
      if (savedLanguage) {
        state.selectedLanguage = savedLanguage;
      }
      
      // Load watch history settings
      const plexUseHistory = await databaseStorageUtils.get('plexUseHistory');
      if (plexUseHistory !== null) {
        state.plexUseHistory = plexUseHistory === true || plexUseHistory === 'true';
      }
      
      const plexHistoryMode = await databaseStorageUtils.get('plexHistoryMode');
      if (plexHistoryMode) {
        state.plexHistoryMode = plexHistoryMode;
      }
      
      const plexCustomHistoryDays = await databaseStorageUtils.get('plexCustomHistoryDays');
      if (plexCustomHistoryDays !== null) {
        state.plexCustomHistoryDays = parseInt(plexCustomHistoryDays);
      }
      
      const plexOnlyMode = await databaseStorageUtils.get('plexOnlyMode');
      if (plexOnlyMode !== null) {
        state.plexOnlyMode = plexOnlyMode === true || plexOnlyMode === 'true';
      }
      
      // Jellyfin settings
      const jellyfinUseHistory = await databaseStorageUtils.get('jellyfinUseHistory');
      if (jellyfinUseHistory !== null) {
        state.jellyfinUseHistory = jellyfinUseHistory === true || jellyfinUseHistory === 'true';
      }
      
      const jellyfinHistoryMode = await databaseStorageUtils.get('jellyfinHistoryMode');
      if (jellyfinHistoryMode) {
        state.jellyfinHistoryMode = jellyfinHistoryMode;
      }
      
      const jellyfinCustomHistoryDays = await databaseStorageUtils.get('jellyfinCustomHistoryDays');
      if (jellyfinCustomHistoryDays !== null) {
        state.jellyfinCustomHistoryDays = parseInt(jellyfinCustomHistoryDays);
      }
      
      const jellyfinOnlyMode = await databaseStorageUtils.get('jellyfinOnlyMode');
      if (jellyfinOnlyMode !== null) {
        state.jellyfinOnlyMode = jellyfinOnlyMode === true || jellyfinOnlyMode === 'true';
      }
      
      // Tautulli settings
      const tautulliUseHistory = await databaseStorageUtils.get('tautulliUseHistory');
      if (tautulliUseHistory !== null) {
        state.tautulliUseHistory = tautulliUseHistory === true || tautulliUseHistory === 'true';
      }
      
      const tautulliHistoryMode = await databaseStorageUtils.get('tautulliHistoryMode');
      if (tautulliHistoryMode) {
        state.tautulliHistoryMode = tautulliHistoryMode;
      }
      
      const tautulliCustomHistoryDays = await databaseStorageUtils.get('tautulliCustomHistoryDays');
      if (tautulliCustomHistoryDays !== null) {
        state.tautulliCustomHistoryDays = parseInt(tautulliCustomHistoryDays);
      }
      
      const tautulliOnlyMode = await databaseStorageUtils.get('tautulliOnlyMode');
      if (tautulliOnlyMode !== null) {
        state.tautulliOnlyMode = tautulliOnlyMode === true || tautulliOnlyMode === 'true';
      }
      
      // Trakt settings
      const traktUseHistory = await databaseStorageUtils.get('traktUseHistory');
      if (traktUseHistory !== null) {
        state.traktUseHistory = traktUseHistory === true || traktUseHistory === 'true';
      }
      
      const traktHistoryMode = await databaseStorageUtils.get('traktHistoryMode');
      if (traktHistoryMode) {
        state.traktHistoryMode = traktHistoryMode;
      }
      
      const traktCustomHistoryDays = await databaseStorageUtils.get('traktCustomHistoryDays');
      if (traktCustomHistoryDays !== null) {
        state.traktCustomHistoryDays = parseInt(traktCustomHistoryDays);
      }
      
      const traktOnlyMode = await databaseStorageUtils.get('traktOnlyMode');
      if (traktOnlyMode !== null) {
        state.traktOnlyMode = traktOnlyMode === true || traktOnlyMode === 'true';
      }
      
      // Load recommendation history
      await this.loadRecommendationHistory();
      
      // Load liked/disliked preferences
      await this.loadPreferences();
      
      console.log('RecommendationsStore: All settings loaded successfully');
      initialized.value = true;
    } catch (error) {
      console.error('Error initializing RecommendationsStore:', error);
      initialized.value = false;
    } finally {
      state.isLoading = false;
      state.loadingComplete = true;
      console.log('RecommendationsStore: Initialization complete', {
        selectedModel: state.selectedModel,
        temperature: state.temperature,
        genres: state.selectedGenres,
        sampleSize: state.sampleSize
      });
    }
  },
  
  /**
   * Load recommendation history from the server
   */
  async loadRecommendationHistory() {
    try {
      console.log('RecommendationsStore: Loading recommendation history from server');
      
      // Load directly from storage via API settings
      try {
        // Get tvRecommendations directly
        console.log('RecommendationsStore: Getting TV recommendations from storage');
        const tvRecs = await databaseStorageUtils.getJSON('tvRecommendations', []);
        console.log('RecommendationsStore: TV recommendations from storage:', tvRecs ? tvRecs.length : 0);
        if (Array.isArray(tvRecs) && tvRecs.length > 0) {
          state.previousShowRecommendations = tvRecs;
        }
        
        // Get movieRecommendations directly
        console.log('RecommendationsStore: Getting movie recommendations from storage');
        const movieRecs = await databaseStorageUtils.getJSON('movieRecommendations', []);
        console.log('RecommendationsStore: Movie recommendations from storage:', movieRecs ? movieRecs.length : 0);
        if (Array.isArray(movieRecs) && movieRecs.length > 0) {
          state.previousMovieRecommendations = movieRecs;
        }
      } catch (storageError) {
        console.error('Error loading from storage directly:', storageError);
      }
      
      // Fallback to API if storage didn't work or returned empty
      if (!state.previousShowRecommendations.length || !state.previousMovieRecommendations.length) {
        console.log('RecommendationsStore: Falling back to API for empty recommendations');
        
        // Load TV show recommendations
        const tvRecsResponse = await apiService.getRecommendations('tv');
        if (Array.isArray(tvRecsResponse)) {
          if (tvRecsResponse.length > 0 && typeof tvRecsResponse[0] === 'string') {
            // Simple array of titles
            state.previousShowRecommendations = tvRecsResponse;
          } else if (tvRecsResponse.length > 0) {
            // Extract titles from full recommendation objects
            const extractedTitles = tvRecsResponse
              .map(rec => typeof rec === 'string' ? rec : rec.title)
              .filter(title => !!title);
            state.previousShowRecommendations = extractedTitles;
          } else {
            state.previousShowRecommendations = [];
          }
        }
        
        // Load movie recommendations
        const movieRecsResponse = await apiService.getRecommendations('movie');
        if (Array.isArray(movieRecsResponse)) {
          if (movieRecsResponse.length > 0 && typeof movieRecsResponse[0] === 'string') {
            // Simple array of titles
            state.previousMovieRecommendations = movieRecsResponse;
          } else if (movieRecsResponse.length > 0) {
            // Extract titles from full recommendation objects
            const extractedTitles = movieRecsResponse
              .map(rec => typeof rec === 'string' ? rec : rec.title)
              .filter(title => !!title);
            state.previousMovieRecommendations = extractedTitles;
          } else {
            state.previousMovieRecommendations = [];
          }
        }
      }
      
      console.log('RecommendationsStore: Final state -', 
                  'TV:', state.previousShowRecommendations.length, 
                  'Movie:', state.previousMovieRecommendations.length);
    } catch (error) {
      console.error('Error loading recommendation history:', error);
      
      // Fallback to localStorage one last time if nothing else worked
      try {
        console.log('RecommendationsStore: Final fallback to storage');
        const savedTVRecs = await databaseStorageUtils.getJSON('tvRecommendations', []);
        if (savedTVRecs && Array.isArray(savedTVRecs)) {
          console.log('RecommendationsStore: Final TV fallback found', savedTVRecs.length, 'items');
          state.previousShowRecommendations = savedTVRecs;
        }
        
        const savedMovieRecs = await databaseStorageUtils.getJSON('movieRecommendations', []);
        if (savedMovieRecs && Array.isArray(savedMovieRecs)) {
          console.log('RecommendationsStore: Final movie fallback found', savedMovieRecs.length, 'items');
          state.previousMovieRecommendations = savedMovieRecs;
        }
      } catch (finalError) {
        console.error('Final fallback failed:', finalError);
      }
    }
  },
  
  /**
   * Load liked/disliked preferences from the server
   */
  async loadPreferences() {
    try {
      const contentType = state.isMovieMode ? 'movie' : 'tv';
      
      // Load liked preferences
      const likedContent = await apiService.getPreferences(contentType, 'liked');
      if (Array.isArray(likedContent)) {
        state.likedRecommendations = likedContent;
      }
      
      // Load disliked preferences
      const dislikedContent = await apiService.getPreferences(contentType, 'disliked');
      if (Array.isArray(dislikedContent)) {
        state.dislikedRecommendations = dislikedContent;
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      
      // Fallback to localStorage
      const likedRecs = await databaseStorageUtils.getJSON('likedRecommendations');
      if (likedRecs && Array.isArray(likedRecs)) {
        state.likedRecommendations = likedRecs;
      }
      
      const dislikedRecs = await databaseStorageUtils.getJSON('dislikedRecommendations');
      if (dislikedRecs && Array.isArray(dislikedRecs)) {
        state.dislikedRecommendations = dislikedRecs;
      }
    }
  },
  
  /**
   * Update the selected model
   * @param {string} model - The model to select
   */
  async updateSelectedModel(model) {
    state.selectedModel = model;
    await databaseStorageUtils.set('openaiModel', model);
  },
  
  /**
   * Update the custom model
   * @param {string} model - The custom model name
   */
  async updateCustomModel(model) {
    state.customModel = model;
    await databaseStorageUtils.set('openaiModel', model);
  },
  
  /**
   * Update the temperature
   * @param {number} value - The temperature value
   */
  async updateTemperature(value) {
    state.temperature = parseFloat(value);
    await databaseStorageUtils.set('temperature', state.temperature.toString());
  },
  
  /**
   * Update the structured output setting
   * @param {boolean} value - Whether to use structured output
   */
  async updateStructuredOutput(value) {
    state.useStructuredOutput = value;
    await databaseStorageUtils.set('useStructuredOutput', value);
  },
  
  /**
   * Update the content type (movie/TV mode)
   * @param {boolean} isMovie - Whether to use movie mode
   */
  async setContentType(isMovie) {
    if (state.isMovieMode !== isMovie) {
      state.isMovieMode = isMovie;
      await databaseStorageUtils.set('contentTypePreference', isMovie ? 'movies' : 'tvshows');
      
      // Reload preferences for the new content type
      await this.loadPreferences();
    }
  },
  
  /**
   * Update the sampled library setting
   * @param {boolean} value - Whether to use sampled library
   */
  async updateSampledLibrary(value) {
    state.useSampledLibrary = value;
    await databaseStorageUtils.set('useSampledLibrary', value.toString());
  },
  
  /**
   * Update the sample size
   * @param {number} value - The sample size
   */
  async updateSampleSize(value) {
    state.sampleSize = parseInt(value);
    await databaseStorageUtils.set('librarySampleSize', state.sampleSize.toString());
  },
  
  /**
   * Update the number of recommendations
   * @param {number} value - The number of recommendations
   */
  async updateNumRecommendations(value) {
    state.numRecommendations = parseInt(value);
    await databaseStorageUtils.set('numRecommendations', state.numRecommendations.toString());
  },
  
  /**
   * Update the columns count
   * @param {number} value - The columns count
   */
  async updateColumnsCount(value) {
    state.columnsCount = parseInt(value);
    await databaseStorageUtils.set('columnsCount', state.columnsCount.toString());
  },
  
  /**
   * Toggle a genre in the selected genres
   * @param {string} genre - The genre to toggle
   */
  async toggleGenre(genre) {
    const index = state.selectedGenres.indexOf(genre);
    if (index === -1) {
      state.selectedGenres.push(genre);
    } else {
      state.selectedGenres.splice(index, 1);
    }
    await databaseStorageUtils.setJSON('genrePreferences', state.selectedGenres);
  },
  
  /**
   * Clear all selected genres
   */
  async clearGenres() {
    state.selectedGenres = [];
    await databaseStorageUtils.setJSON('genrePreferences', []);
  },
  
  /**
   * Update the prompt style
   * @param {string} style - The prompt style
   */
  async updatePromptStyle(style) {
    state.promptStyle = style;
    await databaseStorageUtils.set('promptStyle', style);
  },
  
  /**
   * Update the custom vibe
   * @param {string} vibe - The custom vibe
   */
  async updateCustomVibe(vibe) {
    state.customVibe = vibe;
    await databaseStorageUtils.set('customVibe', vibe);
  },
  
  /**
   * Clear the custom vibe
   */
  async clearCustomVibe() {
    state.customVibe = '';
    await databaseStorageUtils.set('customVibe', '');
  },
  
  /**
   * Update the custom prompt only setting
   * @param {boolean} value - Whether to use custom prompt only
   */
  async updateCustomPromptOnly(value) {
    state.useCustomPromptOnly = value;
    await databaseStorageUtils.set('useCustomPromptOnly', value.toString());
  },
  
  /**
   * Update the selected language
   * @param {string} language - The language code
   */
  async updateSelectedLanguage(language) {
    state.selectedLanguage = language;
    await databaseStorageUtils.set('languagePreference', language);
  },
  
  /**
   * Update Plex use history setting
   * @param {boolean} value - Whether to use Plex history
   */
  async updatePlexUseHistory(value) {
    state.plexUseHistory = value;
    await databaseStorageUtils.set('plexUseHistory', value.toString());
    
    // If turning off history usage, also turn off the plex-only mode
    if (!value && state.plexOnlyMode) {
      await this.updatePlexOnlyMode(false);
    }
  },
  
  /**
   * Update Plex history mode
   * @param {string} mode - The history mode ('all', 'recent', 'custom')
   */
  async updatePlexHistoryMode(mode) {
    state.plexHistoryMode = mode;
    await databaseStorageUtils.set('plexHistoryMode', mode);
  },
  
  /**
   * Update Plex custom history days
   * @param {number} days - The number of days
   */
  async updatePlexCustomHistoryDays(days) {
    state.plexCustomHistoryDays = parseInt(days);
    await databaseStorageUtils.set('plexCustomHistoryDays', state.plexCustomHistoryDays.toString());
  },
  
  /**
   * Update Plex only mode
   * @param {boolean} value - Whether to use only Plex history
   */
  async updatePlexOnlyMode(value) {
    state.plexOnlyMode = value;
    await databaseStorageUtils.set('plexOnlyMode', value.toString());
    
    // If enabling Plex only mode, disable other only modes
    if (value) {
      if (state.jellyfinOnlyMode) {
        state.jellyfinOnlyMode = false;
        await databaseStorageUtils.set('jellyfinOnlyMode', 'false');
      }
      
      if (state.tautulliOnlyMode) {
        state.tautulliOnlyMode = false;
        await databaseStorageUtils.set('tautulliOnlyMode', 'false');
      }
      
      if (state.traktOnlyMode) {
        state.traktOnlyMode = false;
        await databaseStorageUtils.set('traktOnlyMode', 'false');
      }
    }
  },
  
  /**
   * Update Jellyfin use history setting
   * @param {boolean} value - Whether to use Jellyfin history
   */
  async updateJellyfinUseHistory(value) {
    state.jellyfinUseHistory = value;
    await databaseStorageUtils.set('jellyfinUseHistory', value.toString());
    
    // If turning off history usage, also turn off the jellyfin-only mode
    if (!value && state.jellyfinOnlyMode) {
      await this.updateJellyfinOnlyMode(false);
    }
  },
  
  /**
   * Update Jellyfin history mode
   * @param {string} mode - The history mode ('all', 'recent', 'custom')
   */
  async updateJellyfinHistoryMode(mode) {
    state.jellyfinHistoryMode = mode;
    await databaseStorageUtils.set('jellyfinHistoryMode', mode);
  },
  
  /**
   * Update Jellyfin custom history days
   * @param {number} days - The number of days
   */
  async updateJellyfinCustomHistoryDays(days) {
    state.jellyfinCustomHistoryDays = parseInt(days);
    await databaseStorageUtils.set('jellyfinCustomHistoryDays', state.jellyfinCustomHistoryDays.toString());
  },
  
  /**
   * Update Jellyfin only mode
   * @param {boolean} value - Whether to use only Jellyfin history
   */
  async updateJellyfinOnlyMode(value) {
    state.jellyfinOnlyMode = value;
    await databaseStorageUtils.set('jellyfinOnlyMode', value.toString());
    
    // If enabling Jellyfin only mode, disable other only modes
    if (value) {
      if (state.plexOnlyMode) {
        state.plexOnlyMode = false;
        await databaseStorageUtils.set('plexOnlyMode', 'false');
      }
      
      if (state.tautulliOnlyMode) {
        state.tautulliOnlyMode = false;
        await databaseStorageUtils.set('tautulliOnlyMode', 'false');
      }
      
      if (state.traktOnlyMode) {
        state.traktOnlyMode = false;
        await databaseStorageUtils.set('traktOnlyMode', 'false');
      }
    }
  },
  
  /**
   * Update Tautulli use history setting
   * @param {boolean} value - Whether to use Tautulli history
   */
  async updateTautulliUseHistory(value) {
    state.tautulliUseHistory = value;
    await databaseStorageUtils.set('tautulliUseHistory', value.toString());
    
    // If turning off history usage, also turn off the tautulli-only mode
    if (!value && state.tautulliOnlyMode) {
      await this.updateTautulliOnlyMode(false);
    }
  },
  
  /**
   * Update Tautulli history mode
   * @param {string} mode - The history mode ('all', 'recent', 'custom')
   */
  async updateTautulliHistoryMode(mode) {
    state.tautulliHistoryMode = mode;
    await databaseStorageUtils.set('tautulliHistoryMode', mode);
  },
  
  /**
   * Update Tautulli custom history days
   * @param {number} days - The number of days
   */
  async updateTautulliCustomHistoryDays(days) {
    state.tautulliCustomHistoryDays = parseInt(days);
    await databaseStorageUtils.set('tautulliCustomHistoryDays', state.tautulliCustomHistoryDays.toString());
  },
  
  /**
   * Update Tautulli only mode
   * @param {boolean} value - Whether to use only Tautulli history
   */
  async updateTautulliOnlyMode(value) {
    state.tautulliOnlyMode = value;
    await databaseStorageUtils.set('tautulliOnlyMode', value.toString());
    
    // If enabling Tautulli only mode, disable other only modes
    if (value) {
      if (state.plexOnlyMode) {
        state.plexOnlyMode = false;
        await databaseStorageUtils.set('plexOnlyMode', 'false');
      }
      
      if (state.jellyfinOnlyMode) {
        state.jellyfinOnlyMode = false;
        await databaseStorageUtils.set('jellyfinOnlyMode', 'false');
      }
      
      if (state.traktOnlyMode) {
        state.traktOnlyMode = false;
        await databaseStorageUtils.set('traktOnlyMode', 'false');
      }
    }
  },
  
  /**
   * Update Trakt use history setting
   * @param {boolean} value - Whether to use Trakt history
   */
  async updateTraktUseHistory(value) {
    state.traktUseHistory = value;
    await databaseStorageUtils.set('traktUseHistory', value.toString());
    
    // If turning off history usage, also turn off the trakt-only mode
    if (!value && state.traktOnlyMode) {
      await this.updateTraktOnlyMode(false);
    }
  },
  
  /**
   * Update Trakt history mode
   * @param {string} mode - The history mode ('all', 'recent', 'custom')
   */
  async updateTraktHistoryMode(mode) {
    state.traktHistoryMode = mode;
    await databaseStorageUtils.set('traktHistoryMode', mode);
  },
  
  /**
   * Update Trakt custom history days
   * @param {number} days - The number of days
   */
  async updateTraktCustomHistoryDays(days) {
    state.traktCustomHistoryDays = parseInt(days);
    await databaseStorageUtils.set('traktCustomHistoryDays', state.traktCustomHistoryDays.toString());
  },
  
  /**
   * Update Trakt only mode
   * @param {boolean} value - Whether to use only Trakt history
   */
  async updateTraktOnlyMode(value) {
    state.traktOnlyMode = value;
    await databaseStorageUtils.set('traktOnlyMode', value.toString());
    
    // If enabling Trakt only mode, disable other only modes
    if (value) {
      if (state.plexOnlyMode) {
        state.plexOnlyMode = false;
        await databaseStorageUtils.set('plexOnlyMode', 'false');
      }
      
      if (state.jellyfinOnlyMode) {
        state.jellyfinOnlyMode = false;
        await databaseStorageUtils.set('jellyfinOnlyMode', 'false');
      }
      
      if (state.tautulliOnlyMode) {
        state.tautulliOnlyMode = false;
        await databaseStorageUtils.set('tautulliOnlyMode', 'false');
      }
    }
  },
  
  /**
   * Add recommendations to history
   * @param {Array} recommendations - The recommendations to add
   */
  async addToRecommendationHistory(recommendations) {
    // Extract just the titles for the title-only history array
    const titlesToAdd = recommendations.map(rec => rec.title);
    
    // Reference to the correct history array based on mode
    const historyArray = state.isMovieMode ? 
      state.previousMovieRecommendations : state.previousShowRecommendations;
    
    // Combine with existing recommendations, remove duplicates
    const combinedRecommendations = [...historyArray, ...titlesToAdd];
    
    // Keep only unique recommendations (as strings)
    const uniqueRecommendations = [...new Set(combinedRecommendations)];
    
    // If over the limit, remove oldest recommendations
    const maxStoredRecommendations = 500;
    if (uniqueRecommendations.length > maxStoredRecommendations) {
      if (state.isMovieMode) {
        state.previousMovieRecommendations = uniqueRecommendations.slice(
          uniqueRecommendations.length - maxStoredRecommendations
        );
      } else {
        state.previousShowRecommendations = uniqueRecommendations.slice(
          uniqueRecommendations.length - maxStoredRecommendations
        );
      }
    } else {
      if (state.isMovieMode) {
        state.previousMovieRecommendations = uniqueRecommendations;
      } else {
        state.previousShowRecommendations = uniqueRecommendations;
      }
    }
    
    // Save to server
    try {
      if (state.isMovieMode) {
        await apiService.saveRecommendations('movie', state.previousMovieRecommendations);
      } else {
        await apiService.saveRecommendations('tv', state.previousShowRecommendations);
      }
    } catch (error) {
      console.error('Error saving recommendation history:', error);
      
      // Fallback to localStorage
      if (state.isMovieMode) {
        await databaseStorageUtils.setJSON('previousMovieRecommendations', state.previousMovieRecommendations);
      } else {
        await databaseStorageUtils.setJSON('previousTVRecommendations', state.previousShowRecommendations);
      }
    }
  },
  
  /**
   * Clear recommendation history
   */
  async clearRecommendationHistory() {
    if (state.isMovieMode) {
      state.previousMovieRecommendations = [];
      await databaseStorageUtils.setJSON('previousMovieRecommendations', []);
      await apiService.saveRecommendations('movie', []);
    } else {
      state.previousShowRecommendations = [];
      await databaseStorageUtils.setJSON('previousTVRecommendations', []);
      await apiService.saveRecommendations('tv', []);
    }
  },
  
  /**
   * Like a recommendation
   * @param {string} title - The title to like
   */
  async likeRecommendation(title) {
    // If it's already liked, remove it from liked list (toggle behavior)
    if (state.likedRecommendations.includes(title)) {
      state.likedRecommendations = state.likedRecommendations.filter(item => item !== title);
    } else {
      // Add to liked list
      state.likedRecommendations.push(title);
      
      // Remove from disliked list if it was there
      if (state.dislikedRecommendations.includes(title)) {
        state.dislikedRecommendations = state.dislikedRecommendations.filter(item => item !== title);
      }
    }
    
    // Save to server
    await this.saveLikedDislikedLists(); // Keep this call within the store action
  },

  /**
   * Update the entire liked recommendations list (used by event handler)
   * @param {Array<string>} updatedList - The new list of liked titles
   */
  async updateLikedRecommendations(updatedList) {
    state.likedRecommendations = updatedList;
    await this.saveLikedDislikedLists();
  },

  /**
   * Dislike a recommendation
   * @param {string} title - The title to dislike
   */
  async dislikeRecommendation(title) {
    // If it's already disliked, remove it from disliked list (toggle behavior)
    if (state.dislikedRecommendations.includes(title)) {
      state.dislikedRecommendations = state.dislikedRecommendations.filter(item => item !== title);
    } else {
      // Add to disliked list
      state.dislikedRecommendations.push(title);
      
      // Remove from liked list if it was there
      if (state.likedRecommendations.includes(title)) {
        state.likedRecommendations = state.likedRecommendations.filter(item => item !== title);
      }
    }
    
    // Save to server
    await this.saveLikedDislikedLists(); // Keep this call within the store action
  },

  /**
   * Update the entire disliked recommendations list (used by event handler)
   * @param {Array<string>} updatedList - The new list of disliked titles
   */
  async updateDislikedRecommendations(updatedList) {
    state.dislikedRecommendations = updatedList;
    await this.saveLikedDislikedLists();
  },

  /**
   * Save liked and disliked lists to server
   */
  async saveLikedDislikedLists() {
    try {
      const contentType = state.isMovieMode ? 'movie' : 'tv';
      await apiService.savePreferences(contentType, 'liked', state.likedRecommendations);
      await apiService.savePreferences(contentType, 'disliked', state.dislikedRecommendations);
    } catch (error) {
      console.error('Error saving preferences to server:', error);
      
      // Fallback to localStorage
      await databaseStorageUtils.setJSON('likedRecommendations', state.likedRecommendations);
      await databaseStorageUtils.setJSON('dislikedRecommendations', state.dislikedRecommendations);
    }
  },
  
  /**
   * Toggle a UI section's expanded state
   * @param {string} section - The section to toggle
   */
  toggleSection(section) {
    if (section in state) {
      state[section] = !state[section];
    }
  },
  
  /**
   * Reset the store to its initial state
   * This should be called when a user logs out or when a new user logs in
   */
  resetStore() {
    console.log('RecommendationsStore: Resetting store to initial state');
    
    // Reset all state to default values
    state.selectedModel = '';
    state.customModel = '';
    state.temperature = 0.7;
    state.useStructuredOutput = false;
    
    state.isMovieMode = false;
    
    state.useSampledLibrary = false;
    state.sampleSize = 100;
    
    state.numRecommendations = 10;
    state.columnsCount = 5;
    
    state.selectedGenres = [];
    state.promptStyle = 'vibe';
    state.customVibe = '';
    state.useCustomPromptOnly = false;
    state.selectedLanguage = '';
    
    state.plexUseHistory = true;
    state.plexHistoryMode = 'all';
    state.plexCustomHistoryDays = 30;
    state.plexOnlyMode = false;
    
    state.jellyfinUseHistory = true;
    state.jellyfinHistoryMode = 'all';
    state.jellyfinCustomHistoryDays = 30;
    state.jellyfinOnlyMode = false;
    
    state.tautulliUseHistory = true;
    state.tautulliHistoryMode = 'all';
    state.tautulliCustomHistoryDays = 30;
    state.tautulliOnlyMode = false;
    
    state.traktUseHistory = true;
    state.traktHistoryMode = 'all';
    state.traktCustomHistoryDays = 30;
    state.traktOnlyMode = false;
    
    state.previousShowRecommendations = [];
    state.previousMovieRecommendations = [];
    state.likedRecommendations = [];
    state.dislikedRecommendations = [];
    
    // Reset UI state
    state.settingsExpanded = false;
    state.configurationExpanded = true;
    state.recNumberExpanded = true;
    state.postersPerRowExpanded = true;
    state.genrePreferencesExpanded = true;
    state.customVibeExpanded = true;
    state.contentLanguageExpanded = true;
    state.plexHistoryExpanded = true;
    state.jellyfinHistoryExpanded = true;
    state.tautulliHistoryExpanded = true;
    state.traktHistoryExpanded = true;
    
    // Reset loading state to force reinitialization
    state.isLoading = false;
    state.loadingComplete = false;
    
    // Reset initialization flag
    initialized.value = false;
    
    console.log('RecommendationsStore: Store reset complete');
  }
};

// Add a reactive property to track initialization status
const initialized = reactive({
  value: false
});

// Create the store object
const store = {
  state: readonly(state),
  ...getters,
  ...actions,
  // Quick way to check if store has been initialized
  get initialized() {
    return state.loadingComplete || initialized.value;
  },
  set initialized(value) {
    initialized.value = value;
  }
};

export default store;
