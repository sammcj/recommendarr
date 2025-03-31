<template>
  <div class="recommendations">
    <div class="recommendation-header">
      <h2>{{ isMovieMode ? 'Movie Recommendations' : 'TV Show Recommendations' }}</h2>
      <p class="user-recommendation-info" v-if="username">Personalized for user: {{ username }}</p>
      <div class="content-type-selector">
        <button 
          class="content-type-button" 
          :class="{ 'active': !isMovieMode }"
          @click="setContentType(false)"
        >
          <span class="button-icon">📺</span>
          <span>TV Shows</span>
        </button>
        <button 
            class="content-type-button" 
          :class="{ 'active': isMovieMode }"
          @click="setContentType(true)"
        >
          <span class="button-icon">🎬</span>
          <span>Movies</span>
        </button>
      </div>
    </div>
    
    <div v-if="!openaiConfigured" class="setup-section">
      <h3 class="setup-title">AI Connection Required</h3>
      <p class="info-message">To generate {{ isMovieMode ? 'movie' : 'TV show' }} recommendations, you need to configure an AI service first.</p>
      <p class="setup-details">You can use OpenAI, local models (like Ollama or LM Studio), or any OpenAI-compatible API.</p>
      <button 
        @click="goToSettings" 
        class="action-button settings-button"
      >
        Configure AI Service
      </button>
    </div>
    
    <div v-else>
      <div class="actions">
        <div class="recommendations-settings">
          <RecommendationSettings
            ref="settingsComponent"
            :settingsExpanded="settingsExpanded"
            :configurationExpanded="configurationExpanded"
            :recNumberExpanded="recNumberExpanded"
            :postersPerRowExpanded="postersPerRowExpanded"
            :genrePreferencesExpanded="genrePreferencesExpanded"
            :customVibeExpanded="customVibeExpanded"
            :contentLanguageExpanded="contentLanguageExpanded"
            :plexHistoryExpanded="plexHistoryExpanded"
            :jellyfinHistoryExpanded="jellyfinHistoryExpanded"
            :tautulliHistoryExpanded="tautulliHistoryExpanded"
            :traktHistoryExpanded="traktHistoryExpanded"
            :isMovieMode="isMovieMode"
            :modelOptions="modelOptions"
            v-model:selectedModel="selectedModel"
            :customModel="customModel"
            :isCustomModel="isCustomModel"
            :fetchingModels="fetchingModels"
            :fetchError="fetchError"
            :temperature="temperature"
            :useSampledLibrary="useSampledLibrary"
            :sampleSize="sampleSize"
            :useStructuredOutput="useStructuredOutput"
            :previousRecommendations="previousRecommendations"
            v-model:numRecommendations="numRecommendations"
            v-model:columnsCount="columnsCount"
            :availableGenres="availableGenres"
            v-model:selectedGenres="selectedGenres"
            v-model:promptStyle="promptStyle"
            v-model:customVibe="customVibe"
            v-model:useCustomPromptOnly="useCustomPromptOnly"
            :availableLanguages="availableLanguages"
            v-model:selectedLanguage="selectedLanguage"
            :plexConfigured="plexConfigured"
            v-model:plexUseHistory="plexUseHistory"
            v-model:plexHistoryMode="plexHistoryMode"
            v-model:plexCustomHistoryDays="plexCustomHistoryDays"
            v-model:plexOnlyMode="plexOnlyMode"
            :jellyfinConfigured="jellyfinConfigured"
            v-model:jellyfinUseHistory="jellyfinUseHistory"
            v-model:jellyfinHistoryMode="jellyfinHistoryMode"
            v-model:jellyfinCustomHistoryDays="jellyfinCustomHistoryDays"
            v-model:jellyfinOnlyMode="jellyfinOnlyMode"
            :tautulliConfigured="tautulliConfigured"
            v-model:tautulliUseHistory="tautulliUseHistory"
            v-model:tautulliHistoryMode="tautulliHistoryMode"
            v-model:tautulliCustomHistoryDays="tautulliCustomHistoryDays"
            v-model:tautulliOnlyMode="tautulliOnlyMode"
            :traktConfigured="traktConfigured"
            v-model:traktUseHistory="traktUseHistory"
            v-model:traktHistoryMode="traktHistoryMode"
            v-model:traktCustomHistoryDays="traktCustomHistoryDays"
            v-model:traktOnlyMode="traktOnlyMode"
            @toggle-settings="toggleSettings"
            @toggle-configuration="toggleConfiguration"
            @toggle-rec-number="toggleRecNumber"
            @toggle-posters-per-row="togglePostersPerRow"
            @toggle-genre-preferences="toggleGenrePreferences"
            @toggle-custom-vibe="toggleCustomVibe"
            @toggle-content-language="toggleContentLanguage"
            @toggle-plex-history="togglePlexHistory"
            @toggle-jellyfin-history="toggleJellyfinHistory"
            @toggle-tautulli-history="toggleTautulliHistory"
            @toggle-trakt-history="toggleTraktHistory"
            @fetch-models="fetchModels"
            @update-model="updateModel"
            @update-custom-model="updateCustomModel"
            @update-temperature="updateTemperature"
            @save-library-mode-preference="saveLibraryModePreference"
            @save-sample-size="saveSampleSize"
            @save-structured-output-preference="saveStructuredOutputPreference"
            @clear-recommendation-history="clearRecommendationHistory"
            @save-recommendation-count="saveRecommendationCount"
            @save-columns-count="saveColumnsCount"
            @handle-resize="handleResize"
            @toggle-genre="toggleGenre"
            @clear-genres="clearGenres"
            @save-prompt-style="savePromptStyle"
            @save-custom-vibe="saveCustomVibe"
            @clear-custom-vibe="clearCustomVibe"
            @save-custom-prompt-only-preference="saveCustomPromptOnlyPreference"
            @save-language-preference="saveLanguagePreference"
            @save-plex-use-history="savePlexUseHistory"
            @save-plex-history-mode="savePlexHistoryMode"
            @save-plex-custom-history-days="savePlexCustomHistoryDays"
            @save-plex-only-mode="savePlexOnlyMode"
            @save-jellyfin-use-history="saveJellyfinUseHistory"
            @save-jellyfin-history-mode="saveJellyfinHistoryMode"
            @save-jellyfin-custom-history-days="saveJellyfinCustomHistoryDays"
            @save-jellyfin-only-mode="saveJellyfinOnlyMode"
            @save-tautulli-use-history="saveTautulliUseHistory"
            @save-tautulli-history-mode="saveTautulliHistoryMode"
            @save-tautulli-custom-history-days="saveTautulliCustomHistoryDays"
            @save-tautulli-only-mode="saveTautulliOnlyMode"
            @save-trakt-use-history="saveTraktUseHistory"
            @save-trakt-history-mode="saveTraktHistoryMode"
            @save-trakt-custom-history-days="saveTraktCustomHistoryDays"
            @save-trakt-only-mode="saveTraktOnlyMode"
            @openPlexUserSelect="openPlexUserSelect"
            @openJellyfinUserSelect="openJellyfinUserSelect"
            @openTautulliUserSelect="openTautulliSelect"
            @refreshTraktHistory="refreshTraktHistory" />
        </div>
        <div class="discover-card-container" :class="{'visible-when-collapsed': !settingsExpanded}">
          <div 
            @click="!loading && getRecommendations()" 
            :class="['discover-card', {'discover-card-loading': loading}]"
          >
            <div class="discover-card-inner" v-if="!loading">
              <div class="discover-icon-container">
                <span class="discover-icon">{{ isMovieMode ? '🎬' : '📺' }}</span>
                <div class="discover-pulse"></div>
              </div>
              
              <div class="discover-content">
                <h3 class="discover-title">{{ isMovieMode ? 'Movie Recommendations' : 'TV Show Recommendations' }}</h3>
                <p class="discover-subtitle">Personalized just for you</p>
              </div>
              
              <div class="discover-action">
                <div class="discover-button-circle">
                  <svg class="discover-arrow-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>
            
            <div class="discover-loading-content" v-if="loading">
              <div class="discover-loading-spinner"></div>
              <div class="discover-loading-info">
                <p class="discover-loading-message">{{ currentLoadingMessage }}</p>
                <p class="discover-loading-counter" :class="{'initializing': recommendations.length === 0}">
                  <span v-if="recommendations.length > 0">
                    Found {{ recommendations.length }} of {{ numRecommendations }} recommendations
                  </span>
                  <span v-else>
                    Processing initial request...
                  </span>
                </p>
              </div>
            </div>
            
            <div class="discover-card-background"></div>
          </div>
        </div>
      </div>
      
      <!-- Loading UI is now integrated into the discover card -->
      
      <div v-if="error" class="error">
        <p>{{ error }}</p>
        <div class="action-button-container">
          <button 
            @click="getRecommendations" 
            :disabled="loading"
            class="action-button retry-button"
          >
            Retry
          </button>
          <button 
            v-if="error.includes('API key') || error.includes('API service') || error.includes('not configured')"
            @click="goToSettings" 
            class="action-button settings-button"
          >
            Configure API Settings
          </button>
        </div>
      </div>
      
      <RecommendationResults
        :recommendations="recommendations"
        :error="error"
        :request-status="requestStatus"
        :requesting-series="requestingSeries"
        :is-movie-mode="isMovieMode"
        :liked-recommendations="likedRecommendations"
        :disliked-recommendations="dislikedRecommendations"
        :columns-count="columnsCount"
        @update:liked-recommendations="likeRecommendation($event)"
        @update:disliked-recommendations="dislikeRecommendation($event)"
        @open-tmdb-modal="openTMDBDetailModal"
        @request-series="requestSeries"
      />
      
      <!-- TMDB Detail Modal - moved outside of conditional rendering -->
      <TMDBDetailModal 
        :show="showTMDBModal"
        :media-id="selectedMediaId"
        :media-type="isMovieMode ? 'movie' : 'tv'"
        :title="selectedMediaTitle"
        @close="closeTMDBModal"
      />
      
      <div v-if="recommendationsRequested && !recommendations.length && !loading" class="no-recommendations">
        <p>No recommendations could be generated. Try again or check your TV show library.</p>
        <div class="action-button-container">
          <button 
            @click="getRecommendations" 
            :disabled="loading"
            class="action-button retry-button"
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  </div>
    <!-- Season Selection Modal for TV Shows -->
    <div v-if="showSeasonModal && currentSeries" class="modal-overlay">
      <div class="modal-container">
        <div class="modal-header">
          <h3>Add "{{ currentSeries.title }}" to Sonarr</h3>
          <button class="modal-close" @click="closeSeasonModal">×</button>
        </div>
        
        <div class="modal-body">
          <div v-if="currentSeries.showSeasonWarning" class="modal-warning">
            <div class="warning-icon">⚠️</div>
            <div class="warning-text">
              No season information was found for this series. This may be due to a temporary Sonarr API issue.
              If you proceed, all seasons of this show will be added and monitored. You can proceed or cancel and try again later.
            </div>
          </div>
          
          <div class="modal-section" v-if="!currentSeries.showSeasonWarning && currentSeries.seasons.length > 0">
            <h4>Select seasons to monitor:</h4>
            
            <div class="select-all">
              <label>
                <input 
                  type="checkbox" 
                  :checked="selectedSeasons.length === currentSeries.seasons.length"
                  @click="toggleAllSeasons"
                > 
                Select All Seasons
              </label>
            </div>
            
            <div class="seasons-grid">
              <div 
                v-for="season in currentSeries.seasons" 
                :key="season.seasonNumber"
                class="season-item"
              >
                <label>
                  <input 
                    type="checkbox" 
                    :value="season.seasonNumber"
                    :checked="selectedSeasons.includes(season.seasonNumber)"
                    @click="toggleSeason(season.seasonNumber)"
                  >
                  Season {{ season.seasonNumber }}
                  <span v-if="season.statistics" class="episode-count">
                    ({{ season.statistics.episodeCount }} episodes)
                  </span>
                </label>
              </div>
            </div>
          </div>
          
          <div class="modal-section">
            <h4>Quality & Storage Settings:</h4>
            
            <div class="loading-indicator" v-if="loadingFolders">
              <div class="small-spinner"></div>
              <span>Loading options...</span>
            </div>
            
            <div class="settings-grid" v-else>
              <div class="setting-item">
                <label for="rootFolder">Save Location:</label>
                <select 
                  id="rootFolder" 
                  v-model="selectedRootFolder"
                  class="setting-select"
                >
                  <option v-for="folder in rootFolders" :key="folder.id" :value="folder.path">
                    {{ folder.path }} ({{ formatFreeSpace(folder.freeSpace) }} free)
                  </option>
                </select>
              </div>
              
              <div class="setting-item">
                <label for="qualityProfile">Quality Profile:</label>
                <select 
                  id="qualityProfile" 
                  v-model="selectedQualityProfile"
                  class="setting-select"
                >
                  <option v-for="profile in qualityProfiles" :key="profile.id" :value="profile.id">
                    {{ profile.name }}
                  </option>
                </select>
              </div>
              
              <div class="setting-item tags-section">
                <label>Tags:</label>
                <div class="tags-container">
                  <div v-for="tag in availableTags.sonarr" :key="tag.id" class="tag-item">
                    <label class="tag-checkbox-label">
                      <input 
                        type="checkbox" 
                        :value="tag.id" 
                        v-model="selectedTags.sonarr"
                      >
                      {{ tag.label }}
                    </label>
                  </div>
                </div>
                
                <div class="new-tag-input">
                  <input 
                    type="text" 
                    v-model="tagInput" 
                    placeholder="Create new tag..." 
                    @keyup.enter="createSonarrTag(tagInput).then(() => { tagInput = ''; })"
                  >
                  <button 
                    @click="createSonarrTag(tagInput).then(() => { tagInput = ''; })"
                    :disabled="!tagInput.trim()"
                    class="tag-add-button"
                  >
                    Add Tag
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="cancel-button" @click="closeSeasonModal">Cancel</button>
          <button 
            class="confirm-button" 
            @click="confirmAddSeries"
            :disabled="(!selectedSeasons.length && !currentSeries.showSeasonWarning) || loadingFolders"
          >
            {{ currentSeries.showSeasonWarning ? 'Add All Seasons to Sonarr' : 'Add to Sonarr' }}
          </button>
        </div>
      </div>
    </div>
    
    <!-- Movie Confirmation Modal -->
    <div v-if="showMovieModal && currentMovie" class="modal-overlay">
      <div class="modal-container">
        <div class="modal-header">
          <h3>Add "{{ currentMovie.title }}" to Radarr</h3>
          <button class="modal-close" @click="closeMovieModal">×</button>
        </div>
        
        <div class="modal-body">
          <div class="modal-section">
            <p>You're about to add "{{ currentMovie.title }}" to your Radarr library. Radarr will search for this movie and download it if available.</p>
          </div>
          
          <div class="modal-section">
            <h4>Quality & Storage Settings:</h4>
            
            <div class="loading-indicator" v-if="loadingMovieFolders">
              <div class="small-spinner"></div>
              <span>Loading options...</span>
            </div>
            
            <div class="settings-grid" v-else>
              <div class="setting-item">
                <label for="movieRootFolder">Save Location:</label>
                <select 
                  id="movieRootFolder" 
                  v-model="selectedMovieRootFolder"
                  class="setting-select"
                >
                  <option v-for="folder in movieRootFolders" :key="folder.id" :value="folder.path">
                    {{ folder.path }} ({{ formatFreeSpace(folder.freeSpace) }} free)
                  </option>
                </select>
              </div>
              
              <div class="setting-item">
                <label for="movieQualityProfile">Quality Profile:</label>
                <select 
                  id="movieQualityProfile" 
                  v-model="selectedMovieQualityProfile"
                  class="setting-select"
                >
                  <option v-for="profile in movieQualityProfiles" :key="profile.id" :value="profile.id">
                    {{ profile.name }}
                  </option>
                </select>
              </div>
              
              <div class="setting-item tags-section">
                <label>Tags:</label>
                <div class="tags-container">
                  <div v-for="tag in availableTags.radarr" :key="tag.id" class="tag-item">
                    <label class="tag-checkbox-label">
                      <input 
                        type="checkbox" 
                        :value="tag.id" 
                        v-model="selectedTags.radarr"
                      >
                      {{ tag.label }}
                    </label>
                  </div>
                </div>
                
                <div class="new-tag-input">
                  <input 
                    type="text" 
                    v-model="tagInput" 
                    placeholder="Create new tag..." 
                    @keyup.enter="createRadarrTag(tagInput).then(() => { tagInput = ''; })"
                  >
                  <button 
                    @click="createRadarrTag(tagInput).then(() => { tagInput = ''; })"
                    :disabled="!tagInput.trim()"
                    class="tag-add-button"
                  >
                    Add Tag
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="cancel-button" @click="closeMovieModal">Cancel</button>
          <button 
            class="confirm-button" 
            @click="confirmAddMovie"
            :disabled="loadingMovieFolders"
          >
            Add to Radarr
          </button>
        </div>
      </div>
    </div>
    
    <!-- Watch History Modal -->
    <div v-if="showWatchHistoryModal" class="modal-overlay" @click.self="closeWatchHistoryModal">
      <div class="modal-container watch-history-modal">
        <div class="modal-header">
          <h3>Watch History</h3>
          <button class="modal-close" @click="closeWatchHistoryModal">×</button>
        </div>
        
        <div class="modal-body">
          <div class="watch-history-header">
            <div class="history-title">
              <h4>Watch History</h4>
              <p class="item-count">
                Showing {{ (filteredWatchHistory || []).length }} items
              </p>
            </div>
            
            <div class="filter-controls">
              <div class="filter-group">
                <label for="historySourceFilter">Source:</label>
                <select id="historySourceFilter" v-model="historySourceFilter">
                  <option value="all">All Sources</option>
                  <option value="plex">Plex</option>
                  <option value="jellyfin">Jellyfin</option>
                  <option value="tautulli">Tautulli</option>
                  <option value="trakt">Trakt</option>
                </select>
              </div>
              
              <div class="filter-group">
                <label for="historyTypeFilter">Type:</label>
                <select id="historyTypeFilter" v-model="historyTypeFilter">
                  <option value="all">All Types</option>
                  <option value="movie">Movies</option>
                  <option value="show">TV Shows</option>
                </select>
              </div>
              
              <div class="filter-group items-per-page">
                <label for="itemsPerPage">Per page:</label>
                <select id="itemsPerPage" v-model="historyItemsPerPage">
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>
            </div>
          </div>
          
          <div class="search-container">
            <input 
              type="text" 
              v-model="historySearchFilter" 
              placeholder="Search by title..." 
              class="history-search"
            />
          </div>
          
          <!-- Bottom row with pagination -->
          <div class="pagination-container">
            <div class="pagination-info">
              {{ (filteredWatchHistory || []).length }} total items
            </div>
            
            <div class="pagination-buttons">
              <button 
                @click="currentHistoryPage = 1" 
                :disabled="currentHistoryPage === 1"
                class="pagination-button"
                title="First page"
              >
                &laquo;
              </button>
              <button 
                @click="currentHistoryPage--" 
                :disabled="currentHistoryPage === 1"
                class="pagination-button"
                title="Previous page"
              >
                &lt;
              </button>
              <span class="current-page">{{ currentHistoryPage }} of {{ maxHistoryPages || 1 }}</span>
              <button 
                @click="currentHistoryPage++" 
                :disabled="currentHistoryPage >= (maxHistoryPages || 1)"
                class="pagination-button"
                title="Next page"
              >
                &gt;
              </button>
              <button 
                @click="currentHistoryPage = (maxHistoryPages || 1)" 
                :disabled="currentHistoryPage >= (maxHistoryPages || 1)"
                class="pagination-button"
                title="Last page"
              >
                &raquo;
              </button>
            </div>
          </div>
          
          <div class="history-table-container">
            <table class="history-table">
              <thead>
                <tr>
                  <th class="title-column">Title</th>
                  <th>Type</th>
                  <th>Source</th>
                  <th>Last Watched</th>
                </tr>
              </thead>
              <tbody>
                <!-- Removed test data -->
                
                <!-- Now try the actual data with improved property access -->
                <tr v-for="(item, index) in filteredWatchHistory" :key="index">
                  <td class="title-column">
                    {{ findTitle(item) }}
                  </td>
                  <td>{{ findType(item) }}</td>
                  <td>{{ findSource(item) }}</td>
                  <td>{{ findDate(item) }}</td>
                </tr>
                
                <tr v-if="!filteredWatchHistory || filteredWatchHistory.length === 0">
                  <td colspan="4" class="no-history">
                    No data available.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="action-button" @click="closeWatchHistoryModal">Close</button>
        </div>
      </div>
    </div>
  </template>

<script>
import openAIService from '../services/OpenAIService';
import sonarrService from '../services/SonarrService';
import radarrService from '../services/RadarrService';
import apiService from '../services/ApiService';
import authService from '../services/AuthService';
import databaseStorageUtils from '../utils/DatabaseStorageUtils';
import TMDBDetailModal from './TMDBDetailModal.vue';
import RecommendationResults from './RecommendationResults.vue';
import RecommendationSettings from './RecommendationSettings.vue';

export default {
  name: 'TVRecommendations',
  components: {
    TMDBDetailModal,
    RecommendationResults,
    RecommendationSettings
  },
  props: {
    initialMovieMode: {
      type: Boolean,
      default: false
    },
    series: {
      type: Array,
      required: true
    },
    sonarrConfigured: {
      type: Boolean,
      required: true
    },
    recentlyWatchedShows: {
      type: Array,
      default: () => []
    },
    jellyfinRecentlyWatchedShows: {
      type: Array,
      default: () => []
    },
    plexConfigured: {
      type: Boolean,
      default: false
    },
    jellyfinConfigured: {
      type: Boolean,
      default: false
    },
    tautulliConfigured: {
      type: Boolean,
      default: false
    },
    tautulliRecentlyWatchedShows: {
      type: Array,
      default: () => []
    },
    movies: {
      type: Array,
      default: () => []
    },
    radarrConfigured: {
      type: Boolean,
      default: false
    },
    recentlyWatchedMovies: {
      type: Array,
      default: () => []
    },
    jellyfinRecentlyWatchedMovies: {
      type: Array,
      default: () => []
    },
    tautulliRecentlyWatchedMovies: {
      type: Array,
      default: () => []
    },
    traktConfigured: {
      type: Boolean,
      default: false
    },
    traktRecentlyWatchedShows: {
      type: Array,
      default: () => []
    },
    traktRecentlyWatchedMovies: {
      type: Array,
      default: () => []
    }
  },
  computed: {
    // Removed shouldUseCompactMode - moved to RecommendationResults.vue
    
    // Removed gridStyle - moved to RecommendationResults.vue
    
    // Computed property to get the current active history based on mode
    currentHistory() {
      return this.isMovieMode ? this.previousMovieRecommendations : this.previousShowRecommendations;
    },
    
    // Computed property to get movie watch history from all sources
    allMovieWatchHistory() {
      // First try the standard movie props
      const standardMovies = [
        ...(this.recentlyWatchedMovies || []),
        ...(this.jellyfinRecentlyWatchedMovies || []),
        ...(this.tautulliRecentlyWatchedMovies || []),
        ...(this.traktRecentlyWatchedMovies || [])
      ];
      
      // Then check if we have movies in the 'movies' prop
      const moviesFromProp = (this.movies || []).map(movie => ({
        ...movie,
        type: 'movie',
        source: 'plex'  // Assuming these come from Plex based on format
      }));
      
      return [...standardMovies, ...moviesFromProp];
    },
    
    // Computed property to get TV watch history from all sources
    allTVWatchHistory() {
      return [
        ...(this.recentlyWatchedShows || []),
        ...(this.jellyfinRecentlyWatchedShows || []),
        ...(this.tautulliRecentlyWatchedShows || [])
      ];
    },
    
    // isTMDBAvailable property moved to RecommendationResults.vue
  },
  watch: {
    // Watch for changes to radarrConfigured prop (for example when saving credentials)
    radarrConfigured: {
      handler(newValue, oldValue) {
        console.log('RequestRecommendations: radarrConfigured prop changed:', newValue);
        // Only fetch if the value actually changed from false to true
        // and we don't already have movies data
        if (newValue && !oldValue && this.isMovieMode) {
          // If radarrConfigured became true while in movie mode, try to load movies
          console.log('Radarr is now configured and we are in movie mode, checking movies data');
          if ((!this.movies || this.movies.length === 0) && 
              (!this.localMovies || this.localMovies.length === 0)) {
            console.log('Movies array is empty, trying to fetch from radarr service');
            radarrService.getMovies().then(moviesData => {
              if (moviesData && moviesData.length > 0) {
                console.log(`Successfully loaded ${moviesData.length} movies`);
                // Update localMovies instead of directly mutating the prop
                this.localMovies = moviesData;
              }
            }).catch(err => {
              console.error('Error fetching movies after radarrConfigured changed:', err);
            });
          } else {
            console.log('Skipping fetch as we already have movies data:', 
                        this.localMovies?.length || 0, 'local movies,',
                        this.movies?.length || 0, 'prop movies');
          }
        }
      },
      immediate: false // Changed to false to prevent double loading on mount
    },
    
    // Watch for changes to movies prop to update localMovies
    movies: {
      handler(newValue) {
        console.log('Movies prop changed, updating localMovies');
        this.localMovies = [...newValue];
      },
      immediate: true
    }
  },
  data() {
    return {
      username: authService.getUser()?.username || '',
      openaiConfigured: openAIService.isConfigured(), // Initialize with current configuration state
      recommendations: [],
      loading: false,
      error: null,
      recommendationsRequested: false,
      numRecommendations: 5, // Default number of recommendations to request
      columnsCount: 2, // Default number of posters per row
      isMovieMode: this.initialMovieMode || false, // Toggle between TV shows (false) and movies (true)
      selectedGenres: [], // Multiple genre selections
      customVibe: '', // Custom vibe/mood input from user
      promptStyle: 'vibe', // Style of prompt to use for recommendations: 'vibe', 'analytical', 'creative', 'technical'
      plexHistoryMode: 'all', // 'all', 'recent', or 'custom'
      plexOnlyMode: false, // Whether to use only Plex history for recommendations
      plexUseHistory: true, // Whether to include Plex watch history at all
      plexCustomHistoryDays: 30, // Custom number of days for history when using 'custom' mode
      // modelOptions already defined later in the data object
      
      jellyfinHistoryMode: 'all', // 'all', 'recent', or 'custom'
      jellyfinOnlyMode: false, // Whether to use only Jellyfin history for recommendations
      jellyfinUseHistory: true, // Whether to include Jellyfin watch history at all
      jellyfinCustomHistoryDays: 30, // Custom number of days for history when using 'custom' mode
      
      tautulliHistoryMode: 'all', // 'all', 'recent', or 'custom'
      tautulliOnlyMode: false, // Whether to use only Tautulli history for recommendations
      tautulliUseHistory: true, // Whether to include Tautulli watch history at all
      tautulliCustomHistoryDays: 30, // Custom number of days for history when using 'custom' mode
      
      traktHistoryMode: 'all', // 'all', 'recent', or 'custom'
      traktOnlyMode: false, // Whether to use only Trakt history for recommendations
      traktUseHistory: true, // Whether to include Trakt watch history at all
      traktCustomHistoryDays: 30, // Custom number of days for history when using 'custom' mode
      localMovies: [], // Local copy of movies prop to avoid direct mutation
      useSampledLibrary: false, // Whether to use sampled library or full library
      sampleSize: 20, // Default sample size when using sampled library
      useStructuredOutput: false, // Whether to use OpenAI's structured output feature - default to off
      structuredOutputEnabled: false, // Backing property for the toggle
      useCustomPromptOnly: false, // Whether to use only custom prompt for recommendations
      rootFolders: [], // Available Sonarr root folders
      qualityProfiles: [], // Available Sonarr quality profiles
      selectedRootFolder: null, // Selected root folder for series
      selectedQualityProfile: null, // Selected quality profile for series
      loadingFolders: false, // Loading status for folders
      
      // Tags for Radarr and Sonarr
      availableTags: {
        radarr: [],
        sonarr: []
      },
      selectedTags: {
        radarr: [],
        sonarr: []
      },
      tagInput: '',
      loadingTags: {
        radarr: false,
        sonarr: false
      },
      funLoadingMessages: [
        "Consulting with TV critics from alternate dimensions...",
        "Analyzing your taste in shows (don't worry, we won't judge)...",
        "Sorting through the multiverse for the perfect shows...",
        "Bribing streaming algorithms for insider information...",
        "Converting caffeine into recommendations...",
        "Feeding your watchlist to our recommendation hamsters...",
        "Searching for shows that won't be cancelled after season 1...",
        "Scanning for hidden gems buried under streaming algorithms...",
        "Asking your future self what shows you'll love...",
        "Calculating the perfect binge-watching schedule...",
        "Digging through the golden age of television...",
        "Filtering out shows with disappointing endings...",
        "Picking shows that will make you say 'just one more episode'...",
        "Consulting with the TV psychics for your next obsession...",
        "Brewing a perfect blend of recommendations...",
        "Decoding the secret sauce of great television...",
        "Sending scouts to the corners of the streaming universe...",
        "Finding shows that will make you forget to check your phone...",
        "Extracting hidden patterns from your viewing history...",
        "Teaching the AI to understand the concept of 'binge-worthy'..."
      ],
      currentLoadingMessage: "",  // Current displayed loading message
      loadingMessageInterval: null, // For rotating messages
      
      // TMDB Modal state
      showTMDBModal: false,
      selectedMediaId: null,
      selectedMediaTitle: '',
      
      availableGenres: [
        { value: 'action', label: 'Action' },
        { value: 'adventure', label: 'Adventure' },
        { value: 'animation', label: 'Animation' },
        { value: 'anime', label: 'Anime' },
        { value: 'comedy', label: 'Comedy' },
        { value: 'crime', label: 'Crime' },
        { value: 'documentary', label: 'Documentary' },
        { value: 'drama', label: 'Drama' },
        { value: 'fantasy', label: 'Fantasy' },
        { value: 'horror', label: 'Horror' },
        { value: 'mystery', label: 'Mystery' },
        { value: 'niche', label: 'Niche' },
        { value: 'romance', label: 'Romance' },
        { value: 'sci-fi', label: 'Sci-Fi' },
        { value: 'thriller', label: 'Thriller' }
      ],
      availableLanguages: [
        { code: 'en', name: 'English' },
        { code: 'es', name: 'Spanish' },
        { code: 'fr', name: 'French' },
        { code: 'de', name: 'German' },
        { code: 'it', name: 'Italian' },
        { code: 'ja', name: 'Japanese' },
        { code: 'ko', name: 'Korean' },
        { code: 'zh', name: 'Chinese' },
        { code: 'hi', name: 'Hindi' },
        { code: 'pt', name: 'Portuguese' },
        { code: 'ru', name: 'Russian' },
        { code: 'ar', name: 'Arabic' },
        { code: 'tr', name: 'Turkish' },
        { code: 'da', name: 'Danish' },
        { code: 'sv', name: 'Swedish' },
        { code: 'no', name: 'Norwegian' },
        { code: 'fi', name: 'Finnish' },
        { code: 'nl', name: 'Dutch' },
        { code: 'pl', name: 'Polish' }
      ],
      selectedLanguage: '',
      requestingSeries: null, // Track which series is being requested
      requestStatus: {}, // Track request status for each series
      previousShowRecommendations: [], // Track previous TV show recommendations
      previousMovieRecommendations: [], // Track previous movie recommendations
      previousRecommendations: [], // Current mode's previous recommendations
      likedRecommendations: [], // TV shows that user has liked
      dislikedRecommendations: [], // TV shows that user has disliked
      maxStoredRecommendations: 500, // Maximum number of previous recommendations to store
      showSeasonModal: false, // Control visibility of season selection modal
      currentSeries: null, // Current series being added
      selectedSeasons: [], // Selected seasons for the current series
      
      // Movie modal
      showMovieModal: false, // Control visibility of movie confirmation modal
      currentMovie: null, // Current movie being added
      movieRootFolders: [], // Available Radarr root folders
      movieQualityProfiles: [], // Available Radarr quality profiles
      selectedMovieRootFolder: null, // Selected root folder for movie
      selectedMovieQualityProfile: null, // Selected quality profile for movie
      loadingMovieFolders: false, // Loading status for movie folders
      selectedModel: '', // Current selected model
      customModel: '', // For custom model input
      isCustomModel: false, // Whether the custom model input is visible
      modelOptions: [], // Available models from API
      fetchingModels: false, // Loading state for fetching models
      fetchError: null, // Error when fetching models
      settingsExpanded: false, // Controls visibility of settings panel
      temperature: 0.5, // AI temperature parameter
      recNumberExpanded: true, // Number of recommendations section
      postersPerRowExpanded: true, // Posters per row section
      genrePreferencesExpanded: true, // Genre preferences section
      contentLanguageExpanded: true, // Content language section
      watchHistoryExpanded: true, // Watch history main section
      plexHistoryExpanded: true, // Plex history subsection
      configurationExpanded: true, // Current configuration section
      customVibeExpanded: true, // Vibe/mood section
      jellyfinHistoryExpanded: true, // Jellyfin history subsection
      tautulliHistoryExpanded: true, // Tautulli history subsection
      traktHistoryExpanded: true, // Trakt history subsection
      
      // Watch history modal
      showWatchHistoryModal: false, // Controls visibility of the watch history modal
      historyItemsPerPage: 25, // Number of items per page in the history table
      currentHistoryPage: 1, // Current page in the history pagination
      historySourceFilter: 'all', // Filter for history source (plex, jellyfin, etc.)
      historyTypeFilter: 'all', // Filter for content type (movie, show)
      historySearchFilter: '', // Search filter for history items
      showRawHistoryData: false, // Controls visibility of raw data debug section
      rawDataProps: null // Storage for raw data properties
    };
  },
  methods: {
    /**
     * Remove duplicate recommendations based on title
     * @param {Array} recommendations - The recommendations array to deduplicate
     * @returns {Array} - Deduplicated recommendations array
     */
    removeDuplicateRecommendations(recommendations) {
      if (!recommendations || recommendations.length === 0) {
        return recommendations;
      }
      
      console.log(`Checking for duplicates in ${recommendations.length} recommendations`);
      
      // Use a Map to track unique titles (case-insensitive)
      const uniqueTitles = new Map();
      
      // Filter the recommendations array to keep only the first occurrence of each title
      const deduplicated = recommendations.filter(rec => {
        if (!rec || !rec.title) return false;
        
        const normalizedTitle = rec.title.toLowerCase();
        
        if (uniqueTitles.has(normalizedTitle)) {
          console.log(`Found duplicate recommendation: "${rec.title}"`);
          return false;
        }
        
        uniqueTitles.set(normalizedTitle, true);
        return true;
      });
      
      console.log(`Removed ${recommendations.length - deduplicated.length} duplicate recommendations`);
      return deduplicated;
    },
    
    // Handle window resize for responsive features like compact mode
    handleWindowResize() {
      // This triggers a reactivity update for the shouldUseCompactMode computed property
      this.$forceUpdate();
      
      // Try accessing data from App component directly
      if (this.$root) {
        console.log('Root component data:', this.$root);
      }
    },
    
    closeWatchHistoryModal() {
      this.showWatchHistoryModal = false;
      this.showRawHistoryData = false;
      
      // Clean up our temporary data
      this._watchHistoryData = null;
      
      console.log('Watch history modal closed and temporary data cleared');
    },
    
    viewRawHistoryData() {
      this.showRawHistoryData = !this.showRawHistoryData;
      
      // Create a formatted string with all relevant data properties
      const propsObject = {
        moviesProps: this.recentlyWatchedMovies ? {
          type: typeof this.recentlyWatchedMovies,
          keys: Object.keys(this.recentlyWatchedMovies),
          isArray: Array.isArray(this.recentlyWatchedMovies),
          hasMoviesProperty: Object.prototype.hasOwnProperty.call(this.recentlyWatchedMovies, 'movies'),
          moviesType: this.recentlyWatchedMovies.movies ? typeof this.recentlyWatchedMovies.movies : 'N/A',
          moviesLength: this.recentlyWatchedMovies.movies ? this.recentlyWatchedMovies.movies.length : 'N/A'
        } : 'undefined',
        
        showsProps: this.recentlyWatchedShows ? {
          type: typeof this.recentlyWatchedShows,
          keys: Object.keys(this.recentlyWatchedShows),
          isArray: Array.isArray(this.recentlyWatchedShows),
          hasShowsProperty: Object.prototype.hasOwnProperty.call(this.recentlyWatchedShows, 'shows'),
          showsType: this.recentlyWatchedShows.shows ? typeof this.recentlyWatchedShows.shows : 'N/A',
          showsLength: this.recentlyWatchedShows.shows ? this.recentlyWatchedShows.shows.length : 'N/A'
        } : 'undefined',
        
        // Include sample data if available
        moviesSample: this.recentlyWatchedMovies && this.recentlyWatchedMovies.movies && this.recentlyWatchedMovies.movies.length > 0 
          ? this.recentlyWatchedMovies.movies[0] 
          : 'No sample',
          
        showsSample: this.recentlyWatchedShows && this.recentlyWatchedShows.shows && this.recentlyWatchedShows.shows.length > 0 
          ? this.recentlyWatchedShows.shows[0] 
          : 'No sample'
      };
      
      this.rawDataProps = JSON.stringify(propsObject, null, 2);
    },
    
    formatSource(source) {
      if (!source) return 'Unknown';
      
      const sources = {
        'plex': 'Plex',
        'jellyfin': 'Jellyfin',
        'tautulli': 'Tautulli',
        'trakt': 'Trakt'
      };
      
      return sources[source] || source.charAt(0).toUpperCase() + source.slice(1);
    },
    
    // Helper methods for finding properties in different data formats
    findTitle(item) {
      if (!item) return 'Unknown';
      
      // Debug the item structure when it's the first item
      if (this.filteredWatchHistory && this.filteredWatchHistory[0] === item) {
        console.log('DEBUG: First item structure in findTitle:', JSON.stringify(item));
      }
      
      // Try different possible property names for the title
      return item.title || item.name || item.showName || item.movieName || 
             (item.media && item.media.title) || (item.media && item.media.name) || 
             'Unknown Title';
    },
    
    findType(item) {
      if (!item) return 'Unknown';
      
      // Check explicit type property
      if (item.type) {
        if (typeof item.type === 'string') {
          const type = item.type.toLowerCase();
          if (type === 'movie') return 'Movie';
          if (type === 'show' || type === 'series' || type === 'episode') return 'TV Show';
        }
      }
      
      // Check source property names that might indicate type
      if (item.movieId || item.movieName || item.isMovie) return 'Movie';
      if (item.showId || item.showName || item.seriesName || item.isShow) return 'TV Show';
      
      // Based on which array it's from
      if (this.recentlyWatchedMovies && 
          this.recentlyWatchedMovies.some && 
          item.ratingKey && 
          this.recentlyWatchedMovies.some(m => m.ratingKey === item.ratingKey)) {
        return 'Movie';
      }
      
      if (this.recentlyWatchedShows && 
          this.recentlyWatchedShows.some && 
          item.ratingKey && 
          this.recentlyWatchedShows.some(s => s.ratingKey === item.ratingKey)) {
        return 'TV Show';
      }
      
      // Guess based on the current mode
      return this.isMovieMode ? 'Movie' : 'TV Show';
    },
    
    findSource(item) {
      if (!item) return 'Unknown';
      
      // Try to get the source property
      if (item.source) return item.source.charAt(0).toUpperCase() + item.source.slice(1);
      
      // Check for service-specific properties
      if (item.plexId || item.plexTitle || item.plexLibraryTitle) return 'Plex';
      if (item.jellyfinId || item.jellyfinTitle) return 'Jellyfin';
      if (item.tautulliId) return 'Tautulli';
      if (item.traktId || item.traktTitle) return 'Trakt';
      
      // If we can't determine, default to Plex
      return 'Plex';
    },
    
    findDate(item) {
      if (!item) return 'Unknown';
      
      // Try different date properties
      const dateValue = item.lastWatched || item.watched || item.viewedAt || 
                       item.dateWatched || item.watchedAt || item.lastViewedAt;
      
      if (!dateValue) return 'Unknown Date';
      
      try {
        // Check if it's a unix timestamp (in seconds), JS timestamp (in milliseconds), or string date
        let watchDate;
        if (typeof dateValue === 'number') {
          // Check if it's a Unix timestamp (seconds) or JS timestamp (milliseconds)
          // Unix timestamps are typically 10 digits (seconds), JS timestamps are 13 digits (milliseconds)
          watchDate = dateValue > 9999999999 ? new Date(dateValue) : new Date(dateValue * 1000); 
        } else {
          watchDate = new Date(dateValue);
        }
        
        // Check if the date is valid
        if (isNaN(watchDate.getTime())) {
          return 'Invalid Date';
        }
        
        // Format the date as 'YYYY-MM-DD'
        return watchDate.toLocaleDateString();
      } catch (err) {
        console.error('Error formatting date:', dateValue, err);
        return 'Date Error';
      }
    },
    
    formatWatchDate(date) {
      if (!date) return 'Unknown';
      
      try {
        // Check if it's a unix timestamp (in seconds), JS timestamp (in milliseconds), or string date
        let watchDate;
        if (typeof date === 'number') {
          // Check if it's a Unix timestamp (seconds) or JS timestamp (milliseconds)
          // Unix timestamps are typically 10 digits (seconds), JS timestamps are 13 digits (milliseconds)
          watchDate = date > 9999999999 ? new Date(date) : new Date(date * 1000); 
        } else {
          watchDate = new Date(date);
        }
        
        // Check if the date is valid
        if (isNaN(watchDate.getTime())) {
          return 'Invalid Date';
        }
        
        // Format the date as 'YYYY-MM-DD'
        return watchDate.toLocaleDateString();
      } catch (err) {
        console.error('Error formatting date:', date, err);
        return 'Date Error';
      }
    },
    
    determineContentType(item) {
      return this.findType(item);
    },
    
    // Note: The saveColumnsCount method already exists elsewhere in this file
    
    
    // Tag-related methods
    async loadRadarrTags() {
      if (!radarrService.isConfigured() || this.loadingTags.radarr) {
        return;
      }
      
      this.loadingTags.radarr = true;
      
      try {
        const tags = await radarrService.getTags();
        this.availableTags.radarr = tags || [];
        console.log('Loaded Radarr tags:', this.availableTags.radarr);
      } catch (error) {
        console.error('Error loading Radarr tags:', error);
      } finally {
        this.loadingTags.radarr = false;
      }
    },
    
    async loadSonarrTags() {
      if (!sonarrService.isConfigured() || this.loadingTags.sonarr) {
        return;
      }
      
      this.loadingTags.sonarr = true;
      
      try {
        const tags = await sonarrService.getTags();
        this.availableTags.sonarr = tags || [];
        console.log('Loaded Sonarr tags:', this.availableTags.sonarr);
      } catch (error) {
        console.error('Error loading Sonarr tags:', error);
      } finally {
        this.loadingTags.sonarr = false;
      }
    },
    
    async createRadarrTag(label) {
      if (!label || !radarrService.isConfigured()) {
        return null;
      }
      
      try {
        const newTag = await radarrService.createTag(label);
        if (newTag && newTag.id) {
          this.availableTags.radarr = [...this.availableTags.radarr, newTag];
          return newTag;
        }
        return null;
      } catch (error) {
        console.error(`Error creating Radarr tag "${label}":`, error);
        return null;
      }
    },
    
    async createSonarrTag(label) {
      if (!label || !sonarrService.isConfigured()) {
        return null;
      }
      
      try {
        const newTag = await sonarrService.createTag(label);
        if (newTag && newTag.id) {
          this.availableTags.sonarr = [...this.availableTags.sonarr, newTag];
          return newTag;
        }
        return null;
      } catch (error) {
        console.error(`Error creating Sonarr tag "${label}":`, error);
        return null;
      }
    },
    
    // Mounted and Destroyed lifecycle hooks
    mounted() {
      // Add window resize event listener for compact mode calculations
      window.addEventListener('resize', this.handleWindowResize);
      
      // Load available tags if services are configured
      if (radarrService.isConfigured()) {
        this.loadRadarrTags();
      }
      
      if (sonarrService.isConfigured()) {
        this.loadSonarrTags();
      }
      
      // Load the prompt style from localStorage or server
      this.loadPromptStyle();
      
      // Debug watch history directly
      console.log('MOUNTED HOOK - DIRECT INSPECTION:');
      console.log('recentlyWatchedMovies direct inspection:', this.recentlyWatchedMovies);
      console.log('recentlyWatchedShows direct inspection:', this.recentlyWatchedShows);
      
      // Set up a delayed check to see if data comes in later
      setTimeout(() => {
        console.log('DELAYED CHECK (1 second):');
        console.log('recentlyWatchedMovies delayed check:', this.recentlyWatchedMovies);
        console.log('recentlyWatchedShows delayed check:', this.recentlyWatchedShows);
        
        // Manually try to access data from parent component and store it
        if (this.$parent && this.$parent.recentlyWatchedMovies) {
          console.log('Found data in parent component!');
        }
      }, 1000);
    },
    
    // This will be called when the component is shown (keep-alive)
    async activated() {
      console.log("RequestRecommendations component activated, reloading recommendations from server");
      
      try {
        // Reload recommendations based on current mode
        if (this.isMovieMode) {
          const movieRecsResponse = await apiService.getRecommendationsReadOnly('movie', this.username) || [];
          if (Array.isArray(movieRecsResponse) && movieRecsResponse.length > 0) {
            console.log(`Loaded ${movieRecsResponse.length} movie recommendations from server on activation (read-only)`);
            this.previousMovieRecommendations = movieRecsResponse;
            this.previousRecommendations = [...this.previousMovieRecommendations];
          }
        } else {
          const tvRecsResponse = await apiService.getRecommendationsReadOnly('tv', this.username) || [];
          if (Array.isArray(tvRecsResponse) && tvRecsResponse.length > 0) {
            console.log(`Loaded ${tvRecsResponse.length} TV recommendations from server on activation (read-only)`);
            this.previousShowRecommendations = tvRecsResponse;
            this.previousRecommendations = [...this.previousShowRecommendations];
          }
        }
      } catch (error) {
        console.error("Error reloading recommendations on activation:", error);
      }
    },
    
    // Add deactivated hook to prevent saving state when component is hidden
    deactivated() {
      console.log("RequestRecommendations component deactivated");
      // Do not save state when navigating away
    },
    
    beforeUnmount() {
      // Clean up event listeners on component destruction
      window.removeEventListener('resize', this.handleWindowResize);
    },
    
    goToSettings() {
      this.$emit('navigate', 'settings', 'ai');
    },
    
    // Set content type and save preference
    async setContentType(isMovie) {
      // Only proceed if the mode actually changed
      if (this.isMovieMode !== isMovie) {
        this.isMovieMode = isMovie;
        await this.saveContentTypePreference();
        
        // Reload the previous recommendations and liked/disliked lists from the server after switching content type
        try {
          console.log("Content type changed, reloading data from server...");
          
          // Load recommendations based on new mode
          const contentType = isMovie ? 'movie' : 'tv';
          const recsResponse = await apiService.getRecommendations(contentType, this.username) || [];
          
          if (Array.isArray(recsResponse) && recsResponse.length > 0) {
            console.log(`Loaded ${recsResponse.length} ${contentType} recommendations from server after content type change`);
            
            if (isMovie) {
              this.previousMovieRecommendations = recsResponse;
              this.previousRecommendations = [...this.previousMovieRecommendations];
            } else {
              this.previousShowRecommendations = recsResponse;
              this.previousRecommendations = [...this.previousShowRecommendations];
            }
          }
          
          // Load liked/disliked preferences for the new content type
          const likedContent = await apiService.getPreferences(contentType, 'liked');
          if (Array.isArray(likedContent)) {
            this.likedRecommendations = likedContent;
            console.log(`Loaded ${likedContent.length} liked ${contentType} preferences after content type change`);
          } else {
            // Reset if no data found
            this.likedRecommendations = [];
          }
          
          const dislikedContent = await apiService.getPreferences(contentType, 'disliked');
          if (Array.isArray(dislikedContent)) {
            this.dislikedRecommendations = dislikedContent;
            console.log(`Loaded ${dislikedContent.length} disliked ${contentType} preferences after content type change`);
          } else {
            // Reset if no data found
            this.dislikedRecommendations = [];
          }
        } catch (error) {
          console.error("Error reloading data after content type change:", error);
        }
      }
    },
    
    // Save content type preference (TV or Movies)
    async saveContentTypePreference() {
      try {
        await apiService.saveSettings({
          contentTypePreference: this.isMovieMode ? 'movies' : 'tvshows',
          isMovieMode: this.isMovieMode
        });
      } catch (error) {
        console.error('Error saving content type preference to server:', error);
        // Fallback to database storage
        await databaseStorageUtils.set('contentTypePreference', this.isMovieMode ? 'movies' : 'tvshows');
        await databaseStorageUtils.set('isMovieMode', this.isMovieMode);
      }
      
      // Update the current recommendations list based on mode
      this.previousRecommendations = this.isMovieMode ? 
        this.previousMovieRecommendations : this.previousShowRecommendations;
      
      // Reset recommendations when switching modes
      this.recommendations = [];
      
      // Clear openai conversation/context to ensure fresh recommendations
      openAIService.resetConversation();
      console.log('Content type switched, conversation history cleared');
    },
    
    toggleSettings() {
      this.settingsExpanded = !this.settingsExpanded;
      
      // Use the improved animation method for settings panel too
      this.animateSection('.settings-content', this.settingsExpanded);
    },
    
    // Toggle section visibility functions
    toggleRecNumber() {
      this.recNumberExpanded = !this.recNumberExpanded;
      this.animateSection('.rec-number-content', this.recNumberExpanded);
    },
    
    togglePostersPerRow() {
      this.postersPerRowExpanded = !this.postersPerRowExpanded;
      this.animateSection('.posters-row-content', this.postersPerRowExpanded);
    },
    
    toggleGenrePreferences() {
      this.genrePreferencesExpanded = !this.genrePreferencesExpanded;
      this.animateSection('.genre-content', this.genrePreferencesExpanded);
    },
    
    toggleContentLanguage() {
      this.contentLanguageExpanded = !this.contentLanguageExpanded;
      this.animateSection('.language-content', this.contentLanguageExpanded);
    },
    
    toggleWatchHistory() {
      this.watchHistoryExpanded = !this.watchHistoryExpanded;
      this.animateSection('.watch-history-content', this.watchHistoryExpanded);
    },
    
    togglePlexHistory() {
      this.plexHistoryExpanded = !this.plexHistoryExpanded;
      this.animateSection('.plex-content', this.plexHistoryExpanded);
    },
    
    toggleJellyfinHistory() {
      this.jellyfinHistoryExpanded = !this.jellyfinHistoryExpanded;
      this.animateSection('.jellyfin-content', this.jellyfinHistoryExpanded);
    },
    
    toggleTautulliHistory() {
      this.tautulliHistoryExpanded = !this.tautulliHistoryExpanded;
      this.animateSection('.tautulli-content', this.tautulliHistoryExpanded);
    },
    
    toggleTraktHistory() {
      this.traktHistoryExpanded = !this.traktHistoryExpanded;
      this.animateSection('.trakt-content', this.traktHistoryExpanded);
    },
    
    toggleConfiguration() {
      this.configurationExpanded = !this.configurationExpanded;
      this.animateSection('.config-content', this.configurationExpanded);
    },
    
    toggleCustomVibe() {
      this.customVibeExpanded = !this.customVibeExpanded;
      this.animateSection('.vibe-content', this.customVibeExpanded);
    },
    
    // Helper method for animating sections consistently
    animateSection(selector, isExpanded) {
      const panel = document.querySelector(selector);
      if (!panel) return;
      
      // Clear any existing transition end listeners
      panel.removeEventListener('transitionend', panel._transitionEndHandler);
      
      if (isExpanded) {
        // OPENING ANIMATION
        
        // Reset display to ensure proper height calculation
        panel.style.display = '';
        panel.style.visibility = 'visible';
        panel.style.height = 'auto';
        
        // Get actual content height
        const height = panel.scrollHeight;
        
        // Setup initial state
        panel.style.overflow = 'hidden';
        panel.style.maxHeight = '0px';
        panel.style.opacity = '0';
        panel.style.transform = 'translateY(-5px)';
        
        // Force browser reflow
        void panel.offsetWidth;
        
        // Apply transitions (faster speed)
        panel.style.transition = 'max-height 0.3s cubic-bezier(0.25, 1, 0.5, 1), ' +
                                'opacity 0.25s cubic-bezier(0.25, 1, 0.5, 1), ' +
                                'transform 0.25s cubic-bezier(0.25, 1, 0.5, 1)';
        
        // Trigger animation
        panel.style.maxHeight = `${height}px`;
        panel.style.opacity = '1';
        panel.style.transform = 'translateY(0)';
        
        // Remove maxHeight constraint after animation completes to allow for content changes
        panel._transitionEndHandler = (e) => {
          if (e.propertyName === 'max-height') {
            panel.style.maxHeight = 'none'; // Allow content to grow if needed
          }
        };
        panel.addEventListener('transitionend', panel._transitionEndHandler);
        
      } else {
        // CLOSING ANIMATION
        
        // First set a fixed height - critical for smooth animation
        panel.style.height = 'auto';
        panel.style.maxHeight = 'none';
        const height = panel.scrollHeight;
        panel.style.maxHeight = `${height}px`;
        
        // Force browser reflow
        void panel.offsetWidth;
        
        // Setup transitions (faster speed)
        panel.style.overflow = 'hidden';
        panel.style.transition = 'max-height 0.25s cubic-bezier(0.55, 0, 0.1, 1), ' +
                               'opacity 0.2s cubic-bezier(0.55, 0, 0.1, 1), ' +
                               'transform 0.2s cubic-bezier(0.55, 0, 0.1, 1)';
        
        // Trigger animation
        panel.style.maxHeight = '0px';
        panel.style.opacity = '0';
        panel.style.transform = 'translateY(-5px)';
        
        // Handle complete close
        panel._transitionEndHandler = (e) => {
          if (e.propertyName === 'max-height') {
            // If the section should stay in the DOM but be hidden, we can use:
            // panel.style.visibility = 'hidden';
            // We're using v-show so this isn't strictly necessary
          }
        };
        panel.addEventListener('transitionend', panel._transitionEndHandler);
      }
    },
    // The following methods have been moved to RecommendationResults.vue:
    // - cleanTitle
    // - hasPoster
    // - isPosterFallback
    // - retryPoster
    // - getPosterStyle
    // - getInitials
    
    // Simple hash function for consistent colors
    simpleHash(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
      }
      return Math.abs(hash);
    },
    
    // Extract just the numeric score from the rating text
    extractScore(ratingText) {
      if (!ratingText || ratingText === 'N/A') {
        return '??';
      }
      
      // Try to extract score percentage with various patterns
      // First try to match a standard percentage pattern like "85%"
      let scoreMatch = ratingText.match(/(\d+)%/);
      
      // If that doesn't work, try to match a pattern like "85/100"
      if (!scoreMatch) {
        scoreMatch = ratingText.match(/(\d+)\s*\/\s*100/);
      }
      
      // If that doesn't work, try to match a pattern like "8.5/10" and convert to percentage
      if (!scoreMatch) {
        const decimalMatch = ratingText.match(/(\d+(?:\.\d+)?)\s*\/\s*10/);
        if (decimalMatch) {
          const decimal = parseFloat(decimalMatch[1]);
          return Math.round(decimal * 10).toString();
        }
      }
      
      // If that doesn't work, look for just a number followed by any text
      if (!scoreMatch) {
        scoreMatch = ratingText.match(/(\d+)/);
      }
      
      // If we find any match, return the first capture group
      if (scoreMatch) {
        return scoreMatch[1];
      }
      
      // If no pattern matches, return placeholder
      return '??';
    },
    
    // Extract a numeric value from rating text for sorting
    extractScoreValue(ratingText) {
      if (!ratingText || ratingText === 'N/A') {
        return 0; // Default to 0 for sorting purposes
      }
      
      // Use the same extraction logic as extractScore but return a number instead of string
      // First try to match a standard percentage pattern like "85%"
      let scoreMatch = ratingText.match(/(\d+)%/);
      
      // If that doesn't work, try to match a pattern like "85/100"
      if (!scoreMatch) {
        scoreMatch = ratingText.match(/(\d+)\s*\/\s*100/);
      }
      
      // If that doesn't work, try to match a pattern like "8.5/10" and convert to percentage
      if (!scoreMatch) {
        const decimalMatch = ratingText.match(/(\d+(?:\.\d+)?)\s*\/\s*10/);
        if (decimalMatch) {
          const decimal = parseFloat(decimalMatch[1]);
          return Math.round(decimal * 10);
        }
      }
      
      // If that doesn't work, look for just a number followed by any text
      if (!scoreMatch) {
        scoreMatch = ratingText.match(/(\d+)/);
      }
      
      // If we find any match, return the first capture group as a number
      if (scoreMatch) {
        return parseInt(scoreMatch[1], 10);
      }
      
      // If no pattern matches, return 0
      return 0;
    },
    
    // This method has been removed as we no longer display rating details
    // The extractScore method is still used to get the percentage value
    
    // Determine CSS class for Recommendarr Rating
    getScoreClass(scoreText) {
      if (!scoreText || scoreText === 'N/A') {
        return 'score-unknown';
      }
      
      // Get a numeric score from the text using our extract method
      const scoreValue = this.extractScore(scoreText);
      
      // If we couldn't extract a meaningful value, return unknown
      if (scoreValue === '??') {
        return 'score-unknown';
      }
      
      const score = parseInt(scoreValue, 10);
      
      // Apply our rating scale
      if (score >= 90) {
        return 'score-certified'; // Excellent
      } else if (score >= 70) {
        return 'score-fresh'; // Good
      } else if (score >= 50) {
        return 'score-rotten'; // Average
      } else {
        return 'score-unknown'; // Below average
      }
    },
    // Save recommendation count to server
    async saveRecommendationCount(value) {
      try {
        this.numRecommendations = value;
        console.log('Saving numRecommendations to server:', this.numRecommendations);
        await apiService.saveSettings({ numRecommendations: value });
        
        // Also save to databaseStorageUtils as a backup
        await databaseStorageUtils.set('numRecommendations', value.toString());
      } catch (error) {
        console.error('Error saving recommendation count to server:', error);
        // Fallback to databaseStorageUtils only
        await databaseStorageUtils.set('numRecommendations', value.toString());
      }
    },
    
    
    async saveColumnsCount(value) {
      try {
        this.columnsCount = value;
        console.log('Saving columnsCount to server:', this.columnsCount);
        await apiService.saveSettings({ columnsCount: value });
        
        // Also save to databaseStorageUtils as a backup
        await databaseStorageUtils.set('columnsCount', value.toString());
        
        // expandedCards handling moved to RecommendationResults.vue
        
        // Force grid layout to update with new column count
        this.$nextTick(() => {
          this.handleResize();
        });
      } catch (error) {
        console.error('Error saving columns count to server:', error);
        // Fallback to databaseStorageUtils only
        await databaseStorageUtils.set('columnsCount', value.toString());
        
        // expandedCards handling moved to RecommendationResults.vue
        
        // Force grid layout to update with new column count
        this.$nextTick(() => {
          this.handleResize();
        });
      }
    },
    
    // Save genre preferences to server when they change
    async saveGenrePreference() {
      try {
        await apiService.saveSettings({ tvGenrePreferences: this.selectedGenres });
      } catch (error) {
        console.error('Error saving genre preferences to server:', error);
        // Fallback to databaseStorageUtils
        await databaseStorageUtils.setJSON('tvGenrePreferences', this.selectedGenres);
      }
    },
    
  // Toggle a genre selection
  toggleGenre(genreValue) {
    // Ensure selectedGenres is always an array
    if (!this.selectedGenres || !Array.isArray(this.selectedGenres)) {
      this.selectedGenres = [];
    }
    
    const index = this.selectedGenres.indexOf(genreValue);
    if (index === -1) {
      // Genre not selected, add it
      this.selectedGenres.push(genreValue);
    } else {
      // Genre already selected, remove it
      this.selectedGenres.splice(index, 1);
    }
    this.saveGenrePreference();
    
    // Reset conversation when genre selection changes
    openAIService.resetConversation();
    
    // Clear current recommendations if any
    if (this.recommendations.length > 0) {
      this.recommendations = [];
      this.recommendationsRequested = false;
    }
  },
    
    // Clear all selected genres
    clearGenres() {
      this.selectedGenres = [];
      this.saveGenrePreference();
      
      // Reset conversation when genres are cleared
      openAIService.resetConversation();
      
      // Clear current recommendations if any
      if (this.recommendations.length > 0) {
        this.recommendations = [];
        this.recommendationsRequested = false;
      }
    },
    
    // Save custom vibe preference to server and reset conversation
    async saveCustomVibe(value) {
      try {
        this.customVibe = value;
        await apiService.saveSettings({ tvCustomVibe: value });
        // Reset OpenAI conversation context when vibe changes
        openAIService.resetConversation();
        console.log('Custom vibe updated, conversation history cleared');
      } catch (error) {
        console.error('Error saving custom vibe to server:', error);
        // Fallback to databaseStorageUtils
        await databaseStorageUtils.set('tvCustomVibe', value);
        // Still reset conversation even if server save fails
        openAIService.resetConversation();
      }
    },
    
    // Clear custom vibe input and reset conversation
    clearCustomVibe() {
      this.customVibe = '';
      this.saveCustomVibe();
      // Reset OpenAI conversation is handled in saveCustomVibe
    },
    
    // Save prompt style preference
    async savePromptStyle(value) {
      try {
        this.promptStyle = value;
        // Set the promptStyle in OpenAIService
        openAIService.setPromptStyle(value);
        
        // Save to server
        await apiService.saveSettings({ promptStyle: value });
        
        // Reset OpenAI conversation context when prompt style changes
        openAIService.resetConversation();
        console.log('Prompt style updated to:', value, 'conversation history cleared');
        
        // Reset recommendations when changing prompt style
        this.recommendationsRequested = false;
      } catch (error) {
        console.error('Error saving prompt style to server:', error);
          // Fallback to databaseStorageUtils
          databaseStorageUtils.set('promptStyle', value);
          // Still reset conversation even if server save fails
          openAIService.resetConversation();
      }
    },
    
    // Save custom prompt only preference
    async saveCustomPromptOnlyPreference(value) {
      try {
        this.useCustomPromptOnly = value;
        // Save to server
        await apiService.saveSettings({ useCustomPromptOnly: value });
        
        // Set in the OpenAIService
        if (typeof openAIService.setUseCustomPromptOnly === 'function') {
          openAIService.setUseCustomPromptOnly(value);
        } else {
          // If method doesn't exist, add the property directly
          openAIService.useCustomPromptOnly = value;
        }
        
        // Reset OpenAI conversation context when preference changes
        openAIService.resetConversation();
        console.log('Custom prompt only preference updated to:', value, 'conversation history cleared');
        
        // Reset recommendations when changing prompt settings
        this.recommendationsRequested = false;
      } catch (error) {
        console.error('Error saving custom prompt only preference to server:', error);
        // Fallback to databaseStorageUtils
        databaseStorageUtils.set('useCustomPromptOnly', value.toString());
        
        // Still set in OpenAIService in case of server error
        if (typeof openAIService.setUseCustomPromptOnly === 'function') {
          openAIService.setUseCustomPromptOnly(value);
        } else {
          openAIService.useCustomPromptOnly = value;
        }
      }
    },
    
    // Load prompt style from server or localStorage
    async loadPromptStyle() {
      try {
        // First try to get the prompt style from server settings
        const settings = await apiService.getSettings();
        if (settings && settings.promptStyle) {
          this.promptStyle = settings.promptStyle;
          console.log('Loaded prompt style from server:', this.promptStyle);
          
          // Also load useCustomPromptOnly if it exists in settings
          if (Object.prototype.hasOwnProperty.call(settings, 'useCustomPromptOnly')) {
            this.useCustomPromptOnly = settings.useCustomPromptOnly === true;
            console.log('Loaded useCustomPromptOnly from server:', this.useCustomPromptOnly);
          }
        } else {
          // If not available from server, try databaseStorageUtils
          const localPromptStyle = databaseStorageUtils.get('promptStyle');
          if (localPromptStyle) {
            this.promptStyle = localPromptStyle;
            console.log('Loaded prompt style from storageUtils:', this.promptStyle);
          }
          
          // Try to load useCustomPromptOnly from databaseStorageUtils
          const localCustomPromptOnly = databaseStorageUtils.get('useCustomPromptOnly');
          if (localCustomPromptOnly !== null) { // Check for null explicitly
            this.useCustomPromptOnly = localCustomPromptOnly === 'true' || localCustomPromptOnly === true; // Handle boolean or string
            console.log('Loaded useCustomPromptOnly from storageUtils:', this.useCustomPromptOnly);
          }
        }
        
        // Set the promptStyle in OpenAIService
        openAIService.setPromptStyle(this.promptStyle);
      } catch (error) {
        console.error('Error loading prompt style:', error);
        // If error loading from server, try databaseStorageUtils
        const localPromptStyle = databaseStorageUtils.get('promptStyle');
        if (localPromptStyle) {
          this.promptStyle = localPromptStyle;
          openAIService.setPromptStyle(this.promptStyle);
        }
        
        // Try to load useCustomPromptOnly from databaseStorageUtils
        const localCustomPromptOnly = databaseStorageUtils.get('useCustomPromptOnly');
        if (localCustomPromptOnly !== null) {
          this.useCustomPromptOnly = localCustomPromptOnly === 'true' || localCustomPromptOnly === true;
        }
      }
    },
    
    // Save language preference to server
    async saveLanguagePreference(value) {
      try {
        this.selectedLanguage = value;
        await apiService.saveSettings({ tvLanguagePreference: value });
      } catch (error) {
        console.error('Error saving language preference to server:', error);
        // Fallback to databaseStorageUtils
        databaseStorageUtils.set('tvLanguagePreference', value);
      }
    },
    
    // Get language name from code
    getLanguageName(code) {
      if (!code) return '';
      const language = this.availableLanguages.find(lang => lang.code === code);
      return language ? language.name : code;
    },
    
    // Save Plex history mode preference
    async savePlexHistoryMode(value) {
      try {
        this.plexHistoryMode = value;
        // Save to User_Data.json via API service
        await apiService.saveSettings({ 
          plexHistoryMode: value,
          plexCustomHistoryDays: this.plexCustomHistoryDays
        });
        this.$emit('plexHistoryModeChanged', value);
        
        // Reset conversation when watch history settings change
        openAIService.resetConversation();
        
        // Clear current recommendations if any
        if (this.recommendations.length > 0) {
          this.recommendations = [];
          this.recommendationsRequested = false;
        }
      } catch (error) {
        console.error('Error saving Plex history mode to server:', error);
      }
    },
    
    // Save Plex use history preference
    async savePlexUseHistory(value) {
      try {
        this.plexUseHistory = value;
        // Save to User_Data.json via API service
        await apiService.saveSettings({ plexUseHistory: value });
        
        // If turning off history usage, also turn off the plex-only mode
        if (!value && this.plexOnlyMode) {
          this.plexOnlyMode = false;
          await this.savePlexOnlyMode();
        }
      } catch (error) {
        console.error('Error saving Plex use history preference to server:', error);
      }
    },
    
    // Save Plex custom history days
    async savePlexCustomHistoryDays(value) {
      try {
        this.plexCustomHistoryDays = value;
        // Save to User_Data.json via API service
        await apiService.saveSettings({ plexCustomHistoryDays: value });
        
        // Reset conversation when watch history days change
        openAIService.resetConversation();
        
        // Clear current recommendations if any
        if (this.recommendations.length > 0) {
          this.recommendations = [];
          this.recommendationsRequested = false;
        }
      } catch (error) {
        console.error('Error saving Plex custom history days to server:', error);
      }
    },
    
    // Save Jellyfin history mode preference
    async saveJellyfinHistoryMode(value) {
      try {
        this.jellyfinHistoryMode = value;
        // Save to User_Data.json via API service
        await apiService.saveSettings({ 
          jellyfinHistoryMode: value,
          jellyfinCustomHistoryDays: this.jellyfinCustomHistoryDays
        });
        this.$emit('jellyfinHistoryModeChanged', value);
        
        // Reset conversation when watch history settings change
        openAIService.resetConversation();
        
        // Clear current recommendations if any
        if (this.recommendations.length > 0) {
          this.recommendations = [];
          this.recommendationsRequested = false;
        }
      } catch (error) {
        console.error('Error saving Jellyfin history mode to server:', error);
      }
    },
    
    // Save Jellyfin use history preference
    async saveJellyfinUseHistory(value) {
      try {
        this.jellyfinUseHistory = value;
        // Save to User_Data.json via API service
        await apiService.saveSettings({ jellyfinUseHistory: value });
        
        // If turning off history usage, also turn off the jellyfin-only mode
        if (!value && this.jellyfinOnlyMode) {
          this.jellyfinOnlyMode = false;
          await this.saveJellyfinOnlyMode();
        }
      } catch (error) {
        console.error('Error saving Jellyfin use history preference to server:', error);
      }
    },
    
    // Save Jellyfin custom history days
    async saveJellyfinCustomHistoryDays(value) {
      try {
        this.jellyfinCustomHistoryDays = value;
        // Save to User_Data.json via API service
        await apiService.saveSettings({ jellyfinCustomHistoryDays: value });
        
        // Reset conversation when watch history days change
        openAIService.resetConversation();
        
        // Clear current recommendations if any
        if (this.recommendations.length > 0) {
          this.recommendations = [];
          this.recommendationsRequested = false;
        }
      } catch (error) {
        console.error('Error saving Jellyfin custom history days to server:', error);
      }
    },
    
    // Save Plex only mode preference
    async savePlexOnlyMode(value) {
      try {
        this.plexOnlyMode = value;
        // If enabling Plex only mode, disable other only modes
        if (value) {
          const settings = { plexOnlyMode: value };
          
          if (this.jellyfinOnlyMode) {
            this.jellyfinOnlyMode = false;
            settings.jellyfinOnlyMode = false;
            this.$emit('jellyfinOnlyModeChanged', false);
          }
          
          if (this.tautulliOnlyMode) {
            this.tautulliOnlyMode = false;
            settings.tautulliOnlyMode = false;
            this.$emit('tautulliOnlyModeChanged', false);
          }
          
          if (this.traktOnlyMode) {
            this.traktOnlyMode = false;
            settings.traktOnlyMode = false;
            this.$emit('traktOnlyModeChanged', false);
          }
          
          await apiService.saveSettings(settings);
        } else {
          await apiService.saveSettings({ plexOnlyMode: value });
        }
        
        this.$emit('plexOnlyModeChanged', value);
      } catch (error) {
        console.error('Error saving Plex only mode to server:', error);
        // Fallback to databaseStorageUtils
        databaseStorageUtils.set('plexOnlyMode', value.toString());
        
        // If enabling Plex only mode, disable other only modes
        if (value) {
          if (this.jellyfinOnlyMode) {
            this.jellyfinOnlyMode = false;
            databaseStorageUtils.set('jellyfinOnlyMode', 'false');
            this.$emit('jellyfinOnlyModeChanged', false);
          }
          
          if (this.tautulliOnlyMode) {
            this.tautulliOnlyMode = false;
            databaseStorageUtils.set('tautulliOnlyMode', 'false');
            this.$emit('tautulliOnlyModeChanged', false);
          }
          
          if (this.traktOnlyMode) {
            this.traktOnlyMode = false;
            databaseStorageUtils.set('traktOnlyMode', 'false');
            this.$emit('traktOnlyModeChanged', false);
          }
        }
        
        this.$emit('plexOnlyModeChanged', value);
      }
    },
    
    // Save Jellyfin only mode preference
    async saveJellyfinOnlyMode(value) {
      try {
        this.jellyfinOnlyMode = value;
        // If enabling Jellyfin only mode, disable other only modes
        if (value) {
          const settings = { jellyfinOnlyMode: value };
          
          if (this.plexOnlyMode) {
            this.plexOnlyMode = false;
            settings.plexOnlyMode = false;
            this.$emit('plexOnlyModeChanged', false);
          }
          
          if (this.tautulliOnlyMode) {
            this.tautulliOnlyMode = false;
            settings.tautulliOnlyMode = false;
            this.$emit('tautulliOnlyModeChanged', false);
          }
          
          if (this.traktOnlyMode) {
            this.traktOnlyMode = false;
            settings.traktOnlyMode = false;
            this.$emit('traktOnlyModeChanged', false);
          }
          
          await apiService.saveSettings(settings);
        } else {
          await apiService.saveSettings({ jellyfinOnlyMode: value });
        }
        
        this.$emit('jellyfinOnlyModeChanged', value);
      } catch (error) {
        console.error('Error saving Jellyfin only mode to server:', error);
        // Fallback to databaseStorageUtils
        databaseStorageUtils.set('jellyfinOnlyMode', value.toString());
        
        // If enabling Jellyfin only mode, disable other only modes
        if (value) {
          if (this.plexOnlyMode) {
            this.plexOnlyMode = false;
            databaseStorageUtils.set('plexOnlyMode', 'false');
            this.$emit('plexOnlyModeChanged', false);
          }
          
          if (this.tautulliOnlyMode) {
            this.tautulliOnlyMode = false;
            databaseStorageUtils.set('tautulliOnlyMode', 'false');
            this.$emit('tautulliOnlyModeChanged', false);
          }
          
          if (this.traktOnlyMode) {
            this.traktOnlyMode = false;
            databaseStorageUtils.set('traktOnlyMode', 'false');
            this.$emit('traktOnlyModeChanged', false);
          }
        }
        
        this.$emit('jellyfinOnlyModeChanged', value);
      }
    },
    
    // Save Tautulli history mode preference
    async saveTautulliHistoryMode(value) {
      this.tautulliHistoryMode = value;
      try {
        // Save to User_Data.json via API service
        await apiService.saveSettings({ 
          tautulliHistoryMode: value,
          tautulliCustomHistoryDays: this.tautulliCustomHistoryDays
        });
        this.$emit('tautulliHistoryModeChanged', value);
      } catch (error) {
        console.error('Error saving Tautulli history mode to server:', error);
      }
    },
    
    // Save Tautulli use history preference
    async saveTautulliUseHistory(value) {
      this.tautulliUseHistory = value;
      try {
        // Save to User_Data.json via API service
        await apiService.saveSettings({ tautulliUseHistory: value });
        
        // If turning off history usage, also turn off the tautulli-only mode
        if (!value && this.tautulliOnlyMode) {
          this.tautulliOnlyMode = false;
          await this.saveTautulliOnlyMode();
        }
      } catch (error) {
        console.error('Error saving Tautulli use history preference to server:', error);
      }
    },
    
    // Save Tautulli custom history days
    async saveTautulliCustomHistoryDays(value) {
      this.tautulliCustomHistoryDays = value;
      try {
        // Save to User_Data.json via API service
        await apiService.saveSettings({ tautulliCustomHistoryDays: value });
      } catch (error) {
        console.error('Error saving Tautulli custom history days to server:', error);
      }
    },
    
    // Save Tautulli only mode preference
    async saveTautulliOnlyMode(value) {
      this.tautulliOnlyMode = value;
      try {
        // If enabling Tautulli only mode, disable Plex only mode, Jellyfin only mode, and Trakt only mode
        if (value) {
          const settings = { tautulliOnlyMode: value };
          
          if (this.plexOnlyMode) {
            this.plexOnlyMode = false;
            settings.plexOnlyMode = false;
            this.$emit('plexOnlyModeChanged', false);
          }
          
          if (this.jellyfinOnlyMode) {
            this.jellyfinOnlyMode = false;
            settings.jellyfinOnlyMode = false;
            this.$emit('jellyfinOnlyModeChanged', false);
          }
          
          if (this.traktOnlyMode) {
            this.traktOnlyMode = false;
            settings.traktOnlyMode = false;
            this.$emit('traktOnlyModeChanged', false);
          }
          
          await apiService.saveSettings(settings);
        } else {
          await apiService.saveSettings({ tautulliOnlyMode: this.tautulliOnlyMode });
        }
        
        this.$emit('tautulliOnlyModeChanged', this.tautulliOnlyMode);
      } catch (error) {
        console.error('Error saving Tautulli only mode to server:', error);
        // Fallback to databaseStorageUtils
        databaseStorageUtils.set('tautulliOnlyMode', this.tautulliOnlyMode.toString());
        
        // If enabling Tautulli only mode, disable other only modes
        if (this.tautulliOnlyMode) {
          if (this.plexOnlyMode) {
            this.plexOnlyMode = false;
            databaseStorageUtils.set('plexOnlyMode', 'false');
            this.$emit('plexOnlyModeChanged', false);
          }
          if (this.jellyfinOnlyMode) {
            this.jellyfinOnlyMode = false;
            databaseStorageUtils.set('jellyfinOnlyMode', 'false');
            this.$emit('jellyfinOnlyModeChanged', false);
          }
          if (this.traktOnlyMode) {
            this.traktOnlyMode = false;
            databaseStorageUtils.set('traktOnlyMode', 'false');
            this.$emit('traktOnlyModeChanged', false);
          }
        }
        
        this.$emit('tautulliOnlyModeChanged', this.tautulliOnlyMode);
      }
    },
    
    // Save Trakt history mode preference
    async saveTraktHistoryMode(value) {
      this.traktHistoryMode = value;
      try {
        // Save to User_Data.json via API service
        await apiService.saveSettings({ 
          traktHistoryMode: value,
          traktCustomHistoryDays: this.traktCustomHistoryDays
        });
        this.$emit('traktHistoryModeChanged', value);
      } catch (error) {
        console.error('Error saving Trakt history mode to server:', error);
      }
    },
    
    // Save Trakt use history preference
    async saveTraktUseHistory(value) {
      this.traktUseHistory = value;
      console.log('Saving Trakt use history preference:', value);
      try {
        // Explicitly convert to boolean to avoid any string conversion issues
        const useHistoryValue = value === true;
        
        // Save to User_Data.json via API service
        await apiService.saveSettings({ traktUseHistory: useHistoryValue });
        console.log('Successfully saved traktUseHistory setting:', useHistoryValue);
        
        // If turning off history usage, also turn off the trakt-only mode
        if (!this.traktUseHistory && this.traktOnlyMode) {
          console.log('Trakt history disabled but "only mode" was on - turning off "only mode"');
          this.traktOnlyMode = false;
          await this.saveTraktOnlyMode();
        }
      } catch (error) {
        console.error('Error saving Trakt use history preference to server:', error);
      }
    },
    
    // Save Trakt custom history days
    async saveTraktCustomHistoryDays(value) {
      this.traktCustomHistoryDays = value;
      try {
        // Save to User_Data.json via API service
        await apiService.saveSettings({ traktCustomHistoryDays: value });
      } catch (error) {
        console.error('Error saving Trakt custom history days to server:', error);
      }
    },
    
    // Save Trakt only mode preference
    async saveTraktOnlyMode(value) {
      this.traktOnlyMode = value;
      try {
        // If enabling Trakt only mode, disable other only modes
        if (value) {
          const settings = { traktOnlyMode: value };
          
          if (this.plexOnlyMode) {
            this.plexOnlyMode = false;
            settings.plexOnlyMode = false;
            this.$emit('plexOnlyModeChanged', false);
          }
          
          if (this.jellyfinOnlyMode) {
            this.jellyfinOnlyMode = false;
            settings.jellyfinOnlyMode = false;
            this.$emit('jellyfinOnlyModeChanged', false);
          }
          
          if (this.tautulliOnlyMode) {
            this.tautulliOnlyMode = false;
            settings.tautulliOnlyMode = false;
            this.$emit('tautulliOnlyModeChanged', false);
          }
          
          await apiService.saveSettings(settings);
        } else {
          await apiService.saveSettings({ traktOnlyMode: this.traktOnlyMode });
        }
        
        this.$emit('traktOnlyModeChanged', this.traktOnlyMode);
      } catch (error) {
        console.error('Error saving Trakt only mode to server:', error);
        // Fallback to databaseStorageUtils
        databaseStorageUtils.set('traktOnlyMode', this.traktOnlyMode.toString());
        
        // If enabling Trakt only mode, disable other only modes
        if (this.traktOnlyMode) {
          if (this.plexOnlyMode) {
            this.plexOnlyMode = false;
            databaseStorageUtils.set('plexOnlyMode', 'false');
            this.$emit('plexOnlyModeChanged', false);
          }
          if (this.jellyfinOnlyMode) {
            this.jellyfinOnlyMode = false;
            databaseStorageUtils.set('jellyfinOnlyMode', 'false');
            this.$emit('jellyfinOnlyModeChanged', false);
          }
          if (this.tautulliOnlyMode) {
            this.tautulliOnlyMode = false;
            databaseStorageUtils.set('tautulliOnlyMode', 'false');
            this.$emit('tautulliOnlyModeChanged', false);
          }
        }
        
        this.$emit('traktOnlyModeChanged', this.traktOnlyMode);
      }
    },
    
    // Save previous recommendations to server
    async savePreviousRecommendations() {
      try {
        // Save both the list of titles (for history) and the current recommendations (for restoring session)
        if (this.isMovieMode) {
          // If we have active recommendations, save them
          if (this.recommendations && this.recommendations.length > 0) {
            await apiService.saveRecommendations('movie', this.recommendations, this.username);
          } else {
            // Otherwise just save the history titles
            await apiService.saveRecommendations('movie', this.previousMovieRecommendations, this.username);
          }
        } else {
          // If we have active recommendations, save them
          if (this.recommendations && this.recommendations.length > 0) {
            await apiService.saveRecommendations('tv', this.recommendations, this.username);
          } else {
            // Otherwise just save the history titles
            await apiService.saveRecommendations('tv', this.previousShowRecommendations, this.username);
          }
        }
      } catch (error) {
        console.error('Error saving recommendations to server:', error);
        // Fallback to storageUtils
        if (this.isMovieMode) {
          // Save both history and current recommendations
          databaseStorageUtils.setJSON('previousMovieRecommendations', this.previousMovieRecommendations);
          if (this.recommendations && this.recommendations.length > 0) {
            databaseStorageUtils.setJSON('currentMovieRecommendations', this.recommendations);
          }
        } else {
          // Save both history and current recommendations
          databaseStorageUtils.setJSON('previousTVRecommendations', this.previousShowRecommendations);
          if (this.recommendations && this.recommendations.length > 0) {
            databaseStorageUtils.setJSON('currentTVRecommendations', this.recommendations);
          }
        }
      }
    },
    
    // Add current recommendations to the history
    async addToRecommendationHistory(newRecommendations) {
      // Extract just the titles for the title-only history array
      const titlesToAdd = newRecommendations.map(rec => rec.title);
      
      // Reference to the correct history array based on mode
      const historyArray = this.isMovieMode ? 
        this.previousMovieRecommendations : this.previousShowRecommendations;
      
      // Combine with existing recommendations, remove duplicates
      const combinedRecommendations = [...historyArray, ...titlesToAdd];
      
      // Keep only unique recommendations (as strings)
      const uniqueRecommendations = [...new Set(combinedRecommendations)];
      
      // If over the limit, remove oldest recommendations
      if (uniqueRecommendations.length > this.maxStoredRecommendations) {
        if (this.isMovieMode) {
          this.previousMovieRecommendations = uniqueRecommendations.slice(
            uniqueRecommendations.length - this.maxStoredRecommendations
          );
          // Also update the current view
          this.previousRecommendations = this.previousMovieRecommendations;
        } else {
          this.previousShowRecommendations = uniqueRecommendations.slice(
            uniqueRecommendations.length - this.maxStoredRecommendations
          );
          // Also update the current view
          this.previousRecommendations = this.previousShowRecommendations;
        }
      } else {
        if (this.isMovieMode) {
          this.previousMovieRecommendations = uniqueRecommendations;
          // Also update the current view
          this.previousRecommendations = this.previousMovieRecommendations;
        } else {
          this.previousShowRecommendations = uniqueRecommendations;
          // Also update the current view
          this.previousRecommendations = this.previousShowRecommendations;
        }
      }
      
      // Save only the title history to the server for consistency
      try {
        if (this.isMovieMode) {
          // Save only the titles array to the server
          await apiService.saveRecommendations('movie', this.previousMovieRecommendations, this.username);
          
          // Store in storageUtils for backup only after successfully saving to server
          databaseStorageUtils.setJSON('previousMovieRecommendations', this.previousMovieRecommendations);
          databaseStorageUtils.setJSON('currentMovieRecommendations', newRecommendations);
        } else {
          // Save only the titles array to the server
          // Ensure all items are valid strings before saving
          const sanitizedRecommendations = this.previousShowRecommendations
            .filter(item => item !== null && item !== undefined)
            .map(item => String(item));
          await apiService.saveRecommendations('tv', sanitizedRecommendations, this.username);
          
          // Store in storageUtils for backup only after successfully saving to server
          databaseStorageUtils.setJSON('previousTVRecommendations', sanitizedRecommendations);
          
          // Also update our local array with the sanitized version to maintain consistency
          this.previousShowRecommendations = sanitizedRecommendations;
          this.previousRecommendations = sanitizedRecommendations;
          
          // Store current recommendations separately
          databaseStorageUtils.setJSON('currentTVRecommendations', newRecommendations);
        }
        
        console.log(`Saved ${this.isMovieMode ? 'movie' : 'TV'} recommendation history to server (${this.previousRecommendations.length} items)`);
      } catch (error) {
        console.error('Error saving recommendation history to server:', error);
        
        // Fallback to storageUtils
        if (this.isMovieMode) {
          databaseStorageUtils.setJSON('previousMovieRecommendations', this.previousMovieRecommendations);
          databaseStorageUtils.setJSON('currentMovieRecommendations', newRecommendations);
        } else {
          // Ensure all items are valid strings before saving to storageUtils
          const sanitizedRecommendations = this.previousShowRecommendations
            .filter(item => item !== null && item !== undefined)
            .map(item => String(item));
            
          databaseStorageUtils.setJSON('previousTVRecommendations', sanitizedRecommendations);
          
          // Also update our local array with the sanitized version to maintain consistency
          this.previousShowRecommendations = sanitizedRecommendations;
          this.previousRecommendations = sanitizedRecommendations;
          
          databaseStorageUtils.setJSON('currentTVRecommendations', newRecommendations);
        }
      }
    },
    
    // Clear recommendation history
    async clearRecommendationHistory() {
      // Ask for confirmation with appropriate content type
      const contentType = this.isMovieMode ? 'movies' : 'shows';
      if (confirm(`Clear your history of ${this.previousRecommendations.length} previously recommended ${contentType}?`)) {
        if (this.isMovieMode) {
          // Clear movie history
          this.previousMovieRecommendations = [];
          this.previousRecommendations = [];
          
          // Clear from storageUtils
          databaseStorageUtils.remove('previousMovieRecommendations');
          
          // Set a flag to prevent reloading from storageUtils
          databaseStorageUtils.set('recentlyClearedMovieHistory', 'true');
          
          // Clear this flag after 1 minute
          setTimeout(() => {
            databaseStorageUtils.remove('recentlyClearedMovieHistory');
          }, 60000);
          
          // Clear from server
          try {
            await apiService.saveRecommendations('movie', [], this.username);
            console.log('Successfully cleared movie history from server');
          } catch (error) {
            console.error('Failed to clear movie history from server:', error);
          }
        } else {
          // Clear TV history
          this.previousShowRecommendations = [];
          this.previousRecommendations = [];
          
          // Clear from storageUtils
          databaseStorageUtils.remove('previousTVRecommendations');
          
          // Set a flag to prevent reloading from storageUtils
          databaseStorageUtils.set('recentlyClearedTVHistory', 'true');
          
          // Clear this flag after 1 minute
          setTimeout(() => {
            databaseStorageUtils.remove('recentlyClearedTVHistory');
          }, 60000);
          
          // Clear from server
          try {
            await apiService.saveRecommendations('tv', [], this.username);
            console.log('Successfully cleared TV history from server');
          } catch (error) {
            console.error('Failed to clear TV history from server:', error);
          }
        }
        
        // No need to call savePreviousRecommendations since we already saved to both localStorage and server
      }
    },
    
    // Update the model selection
    async updateModel(value) {
      this.selectedModel = value;

      if (this.selectedModel === 'custom') {
        this.isCustomModel = true;
        // If we already have a custom model set, use that as the initial value
        if (openAIService.model && !this.modelOptions.some(model => model.id === openAIService.model)) {
          this.customModel = openAIService.model;
        }
      } else {
        this.isCustomModel = false;
        
        try {
          // Save model setting to server
          await apiService.saveSettings({ openaiModel: value });
          
          console.log(value);
          // Update service
          openAIService.model = value;
          
          // Also save to the server-side credentials
          await openAIService.configure(
            openAIService.apiKey, 
            value,
            openAIService.baseUrl,
            openAIService.maxTokens,
            openAIService.temperature,
            openAIService.useSampledLibrary,
            openAIService.sampleSize
          );
        } catch (error) {
        console.error('Error saving model settings:', error);
        // Fallback to storageUtils (already using it)
        databaseStorageUtils.set('openaiModel', value);
        openAIService.model = value;
      }
      }
    },
    
    // Update the custom model name
    async updateCustomModel(value) {
      this.customModel = value;
      if (this.customModel.trim()) {
        try {
          // Save custom model setting to server
          await apiService.saveSettings({ openaiModel: value });
          
          // Update service
          openAIService.model = value;
          
          // Also save to the server-side credentials
          await openAIService.configure(
            openAIService.apiKey, 
            value,
            openAIService.baseUrl,
            openAIService.maxTokens,
            openAIService.temperature,
            openAIService.useSampledLibrary,
            openAIService.sampleSize
          );
        } catch (error) {
        console.error('Error saving custom model settings:', error);
        // Fallback to storageUtils (already using it)
        databaseStorageUtils.set('openaiModel', value);
        openAIService.model = value;
      }
      }
    },
    
    // Update temperature and save to server
    async updateTemperature(value) {
      try {
        // Update the local temperature value with the new value
        this.temperature = value;
        
        console.log('Saving temperature to server:', value);
        await apiService.saveSettings({ aiTemperature: value.toString() });
        
          // Also save to databaseStorageUtils as a backup
          databaseStorageUtils.set('aiTemperature', value.toString());
          
          // Update in OpenAI service
          openAIService.temperature = value;
      } catch (error) {
        console.error('Error saving temperature to server:', error);
        // Fallback to databaseStorageUtils only
        databaseStorageUtils.set('aiTemperature', value.toString());
        openAIService.temperature = value;
      }
    },
    
    // Save library mode preference to server
    async saveLibraryModePreference(value) {
      try {
        // Update the local value with the new value
        this.useSampledLibrary = value;
        
        await apiService.saveSettings({ useSampledLibrary: value });
        openAIService.useSampledLibrary = value;
      } catch (error) {
        console.error('Error saving library mode preference to server:', error);
        // Fallback to databaseStorageUtils
        databaseStorageUtils.set('useSampledLibrary', value.toString());
        openAIService.useSampledLibrary = value;
      }
    },
    
    // Save sample size to server
    async saveSampleSize(value) {
      this.sampleSize = value;
      try {
        await apiService.saveSettings({ librarySampleSize: value });
        openAIService.sampleSize = value;
      } catch (error) {
        console.error('Error saving sample size to server:', error);
        // Fallback to databaseStorageUtils
        databaseStorageUtils.set('librarySampleSize', value.toString());
        openAIService.sampleSize = value;
      }
    },
    
    // Save structured output preference
    async saveStructuredOutputPreference(value) {
      try {
        // Update the local value with the new value
        this.useStructuredOutput = value;
        
        console.log('Saving structured output preference:', value);
        await apiService.saveSettings({ useStructuredOutput: value });
        
        // Also save to localStorage as a backup
        databaseStorageUtils.set('useStructuredOutput', value);
        
        // Set the useStructuredOutput property on the OpenAIService
        openAIService.useStructuredOutput = value;
        
        // Reset the conversation history in OpenAI service to ensure proper formatting
        openAIService.resetConversation();
        console.log('Conversation history reset due to structured output setting change');
        
        // Reset current recommendations if any to encourage getting fresh ones with the new format
        if (this.recommendations.length > 0) {
          this.recommendations = [];
          this.recommendationsRequested = false;
          console.log('Cleared current recommendations due to structured output setting change');
        }
      } catch (error) {
        console.error('Error saving structured output preference to server:', error);
        // Fallback to localStorage only
        databaseStorageUtils.set('useStructuredOutput', value);
        openAIService.useStructuredOutput = value;
        
        // Still reset the conversation even if there was an error saving
        openAIService.resetConversation();
      }
    },
    
    // Fetch available models from the API
    async fetchModels() {
      if (!openAIService.isConfigured()) {
        this.fetchError = 'API service is not configured. Please set up your API key first.';
        // Redirect to settings page if API is not configured
        this.goToSettings();
        return;
      }
      
      this.fetchingModels = true;
      this.fetchError = null;
      
      try {
        // Use OpenAIService's method to fetch models, which already uses the proxy
        const models = await openAIService.fetchModels();
        
        // Initialize as empty array first to ensure there's always an array
        this.modelOptions = [];
        
        if (Array.isArray(models)) {
          // Set model options only if we got a valid array
          this.modelOptions = models;
          
          // Sort models alphabetically
          this.modelOptions.sort((a, b) => a.id.localeCompare(b.id));
        } else {
          console.warn('Models returned is not an array:', models);
          this.fetchError = 'Invalid response format from API';
          // Redirect to settings page for invalid response format
          this.goToSettings();
        }
      } catch (error) {
        console.error('Error fetching models:', error);
        const errorMessage = error.response?.data?.error?.message || 
                         'Failed to fetch models. Check your API key and URL.';
        
        this.fetchError = errorMessage;
        
        // If the error contains information about an invalid API key, redirect to settings
        if (errorMessage.includes('API key') || 
            errorMessage.includes('authentication') || 
            errorMessage.includes('Incorrect API key') || 
            errorMessage.includes('401') ||
            errorMessage.includes('provide')) {
          // Redirect to settings page
          this.goToSettings();
        }
      } finally {
        this.fetchingModels = false;
      }
    },
    
    // Like a TV show recommendation
    async likeRecommendation(title) {
      // If it's already liked, remove it from liked list (toggle behavior)
      if (this.isLiked(title)) {
        this.likedRecommendations = this.likedRecommendations.filter(item => item !== title);
      } else {
        // Add to liked list
        this.likedRecommendations.push(title);
        
        // Remove from disliked list if it was there
        if (this.isDisliked(title)) {
          this.dislikedRecommendations = this.dislikedRecommendations.filter(item => item !== title);
        }
      }
      
      // Save to server (this will also fall back to localStorage if needed)
      await this.saveLikedDislikedLists();
    },
    
    // Dislike a TV show recommendation
    async dislikeRecommendation(title) {
      // If it's already disliked, remove it from disliked list (toggle behavior)
      if (this.isDisliked(title)) {
        this.dislikedRecommendations = this.dislikedRecommendations.filter(item => item !== title);
      } else {
        // Add to disliked list
        this.dislikedRecommendations.push(title);
        
        // Remove from liked list if it was there
        if (this.isLiked(title)) {
          this.likedRecommendations = this.likedRecommendations.filter(item => item !== title);
        }
      }
      
      // Save to server (this will also fall back to localStorage if needed)
      await this.saveLikedDislikedLists();
    },
    
    // Check if a TV show is liked
    isLiked(title) {
      return this.likedRecommendations.includes(title);
    },
    
    // Check if a TV show is disliked
    isDisliked(title) {
      return this.dislikedRecommendations.includes(title);
    },
    
    // Save liked and disliked lists to server
    async saveLikedDislikedLists() {
      try {
        if (this.isMovieMode) {
          await apiService.savePreferences('movie', 'liked', this.likedRecommendations);
          await apiService.savePreferences('movie', 'disliked', this.dislikedRecommendations);
        } else {
          await apiService.savePreferences('tv', 'liked', this.likedRecommendations);
          await apiService.savePreferences('tv', 'disliked', this.dislikedRecommendations);
        }
      } catch (error) {
        console.error('Error saving preferences to server:', error);
        // Fallback to storageUtils
        databaseStorageUtils.setJSON('likedTVRecommendations', this.likedRecommendations);
        databaseStorageUtils.setJSON('dislikedTVRecommendations', this.dislikedRecommendations);
      }
    },
    
    /**
     * Filter watch history based on the selected history mode
     * @param {Array} historyArray - The original history array to filter
     * @param {string} service - The service ('plex', 'jellyfin', or 'tautulli')
     * @returns {Array} - The filtered history array
     */
    filterWatchHistory(historyArray, service) {
      if (!historyArray || !historyArray.length) {
        console.log(`Empty ${service} history array`);
        return [];
      }
      
      console.log(`Filtering ${historyArray.length} items for ${service} history`);
      
      // Get the appropriate mode and custom days settings based on service
      let historyMode, customDays;
      
      switch (service) {
        case 'plex':
          historyMode = this.plexHistoryMode;
          customDays = this.plexCustomHistoryDays;
          break;
        case 'jellyfin':
          historyMode = this.jellyfinHistoryMode;
          customDays = this.jellyfinCustomHistoryDays;
          break;
        case 'tautulli':
          historyMode = this.tautulliHistoryMode;
          customDays = this.tautulliCustomHistoryDays;
          break;
        case 'trakt':
          historyMode = this.traktHistoryMode;
          customDays = this.traktCustomHistoryDays;
          console.log(`Trakt history mode: ${historyMode}, custom days: ${customDays}`);
          break;
        default:
          // Default to 'all' if service is unknown
          return historyArray;
      }
      
      // Return unfiltered array if using 'all' mode
      if (historyMode === 'all') {
        console.log(`${service} using 'all' mode, returning all ${historyArray.length} items`);
        return historyArray;
      }
      
      // Calculate the cut-off date based on mode
      const now = new Date();
      let cutoffDate;
      
      if (historyMode === 'recent') {
        // Recent mode is hardcoded to 30 days
        cutoffDate = new Date(now);
        cutoffDate.setDate(now.getDate() - 30);
        console.log(`${service} using 'recent' mode, cut-off date: ${cutoffDate.toISOString()}`);
      } else if (historyMode === 'custom') {
        // Custom mode uses user-specified days
        cutoffDate = new Date(now);
        cutoffDate.setDate(now.getDate() - customDays);
        console.log(`${service} using 'custom' mode (${customDays} days), cut-off date: ${cutoffDate.toISOString()}`);
      } else {
        // Unknown mode, return original array
        console.log(`${service} using unknown mode '${historyMode}', returning all items`);
        return historyArray;
      }
      
      // Filter history by date
      // Note: The history item format depends on the source (has lastWatched or watched property)
      const filteredArray = historyArray.filter(item => {
        if (!item) return false;
        
        // Handle different property names for watched date (compatibility with different sources)
        // Look for watch date in different properties depending on service
        // Plex uses viewedAt, others may use lastWatched or watched
        const watchDateStr = item.lastWatched || item.watched || item.viewedAt;
        if (!watchDateStr) {
          console.log(`${service} item missing watch date:`, item);
          return false;
        }
        
        // Handle both date strings and unix timestamps
        let watchDate;
        if (typeof watchDateStr === 'number' || (typeof watchDateStr === 'string' && !isNaN(parseInt(watchDateStr, 10)))) {
          // Handle Unix timestamps (seconds since epoch)
          const timestamp = parseInt(watchDateStr, 10);
          // Check if timestamp is in seconds (Plex) or milliseconds
          watchDate = timestamp > 9999999999 
            ? new Date(timestamp) // Already in milliseconds
            : new Date(timestamp * 1000); // Convert seconds to milliseconds
        } else {
          // Handle regular date strings
          watchDate = new Date(watchDateStr);
        }
        
        const shouldInclude = watchDate >= cutoffDate;
        
        // Debug output if filtering out item
        if (!shouldInclude) {
          console.log(`Filtering out ${service} item "${item.title}" with date ${watchDate.toISOString()} before cutoff ${cutoffDate.toISOString()}`);
        }
        
        if (service === 'trakt' && !shouldInclude) {
          console.log(`Filtering out Trakt item with date ${watchDate.toISOString()} before cutoff ${cutoffDate.toISOString()}`);
        }
        
        return shouldInclude;
      });
      
      console.log(`${service} history: filtered from ${historyArray.length} to ${filteredArray.length} items`);
      if (filteredArray.length > 0) {
        console.log(`${service} first filtered item:`, filteredArray[0]);
      }
      
      return filteredArray;
    },
    
    /**
     * Start the rotating loading message animation
     */
    startLoadingMessages() {
      // Set initial message based on content type
      const contentType = this.isMovieMode ? 'movie' : 'TV show';
      let baseMessage = `Analyzing your ${contentType} library and generating recommendations...`;
      
      // Prepare history service names to include in message
      const activeServices = [];
      if (this.plexConfigured && this.plexUseHistory) {
        activeServices.push('Plex');
        if (this.plexOnlyMode) {
          baseMessage = 'Analyzing your Plex watch history...';
        }
      }
      
      if (this.jellyfinConfigured && this.jellyfinUseHistory) {
        activeServices.push('Jellyfin');
        if (this.jellyfinOnlyMode) {
          baseMessage = 'Analyzing your Jellyfin watch history...';
        }
      }
      
      if (this.tautulliConfigured && this.tautulliUseHistory) {
        activeServices.push('Tautulli');
        if (this.tautulliOnlyMode) {
          baseMessage = 'Analyzing your Tautulli watch history...';
        }
      }
      
      if (this.traktConfigured && this.traktUseHistory) {
        activeServices.push('Trakt');
        if (this.traktOnlyMode) {
          baseMessage = 'Analyzing your Trakt watch history...';
        }
      }
      
      // If we're not in "only mode" but we have active services, include them in the message
      if (!this.plexOnlyMode && !this.jellyfinOnlyMode && !this.tautulliOnlyMode && !this.traktOnlyMode && activeServices.length > 0) {
        baseMessage = `Analyzing your ${contentType} library and ${activeServices.join('/')} watch history...`;
      }
            
      this.currentLoadingMessage = baseMessage;
      
      // Clear any existing interval
      if (this.loadingMessageInterval) {
        clearInterval(this.loadingMessageInterval);
      }
      
      // Start a new interval to rotate through fun messages
      let lastIndex = -1;
      this.loadingMessageInterval = setInterval(() => {
        // Every other time, show the base message
        if (Math.random() > 0.5) {
          this.currentLoadingMessage = baseMessage;
          return;
        }
        
        // Get a random fun message that's different from the last one
        let randomIndex;
        do {
          randomIndex = Math.floor(Math.random() * this.funLoadingMessages.length);
        } while (randomIndex === lastIndex && this.funLoadingMessages.length > 1);
        
        lastIndex = randomIndex;
        this.currentLoadingMessage = this.funLoadingMessages[randomIndex];
      }, 10000); // Change message every 10 seconds
    },
    openTautulliSelect() {
      this.$emit('openTautulliUserSelect');
    },
     openPlexUserSelect() {
      this.$emit('openPlexUserSelect');
    },
    openJellyfinUserSelect() {
      this.$emit('openJellyfinUserSelect');
    },
    refreshTraktHistory() {
      this.$emit('refreshTraktHistory');
    },
    
    /**
     * Stop the rotating loading message animation
     */
    stopLoadingMessages() {
      if (this.loadingMessageInterval) {
        clearInterval(this.loadingMessageInterval);
        this.loadingMessageInterval = null;
      }
    },
    
    async getRecommendations() {
      // Debug the radarrConfigured prop state when requesting recommendations
      console.log('RequestRecommendations: Starting getRecommendations');
      console.log('radarrConfigured prop:', this.radarrConfigured);
      console.log('radarrService.isConfigured():', radarrService.isConfigured());
      console.log('radarrService state:', {
        baseUrl: radarrService.baseUrl,
        apiKey: radarrService.apiKey ? 'set' : 'not set'
      });
      
      // Check if we have any watch history providers configured
      const hasWatchHistoryProvider = this.plexConfigured || this.jellyfinConfigured || this.tautulliConfigured || this.traktConfigured;
      
      // Verify we have content and OpenAI is configured
      // Force-check radarrService.isConfigured() for movie mode to bypass the issue
      const isServiceConfigured = this.isMovieMode 
        ? (this.radarrConfigured || radarrService.isConfigured()) 
        : this.sonarrConfigured;
      
      // Allow recommendations if either Sonarr/Radarr OR a watch history provider is configured
      if (!isServiceConfigured && !hasWatchHistoryProvider) {
        this.error = `You need to connect to either ${this.isMovieMode ? 'Radarr' : 'Sonarr'} or a watch history provider (Plex, Jellyfin, Tautulli, or Trakt) to get recommendations.`;
        return;
      }
      
      // Check if the service is actually ready with a valid connection, but only if we're using a Sonarr/Radarr library
      if (isServiceConfigured) {
        if (this.isMovieMode) {
          // Always try to load the latest Radarr credentials if we're in movie mode
          console.log('Movie mode active, loading latest Radarr credentials');
          await radarrService.loadCredentials();
          
          if (!radarrService.isConfigured()) {
            // Only require Radarr if no watch history providers are available
            if (!hasWatchHistoryProvider) {
              console.error("Radarr service isn't fully configured after loading credentials");
              this.error = "Radarr service isn't fully configured. Please check your connection settings.";
              return;
            }
          } else {
            console.log('Radarr credentials loaded successfully', {
              baseUrl: radarrService.baseUrl, 
              apiKey: radarrService.apiKey ? 'set' : 'not set'
            });
          }
        } else if (!this.isMovieMode && (!sonarrService.isConfigured() || !sonarrService.apiKey || !sonarrService.baseUrl)) {
            await sonarrService.loadCredentials();
            if (!sonarrService.isConfigured() && !hasWatchHistoryProvider) {
              this.error = "Sonarr service isn't fully configured. Please check your connection settings.";
              return;
            }
          }
      }
      
      // Check if the library is empty
      const libraryEmpty = this.isMovieMode 
        ? (!this.localMovies || this.localMovies.length === 0)
        : (!this.series || this.series.length === 0);
        
      // Check if we're going to rely on watch history
      const useWatchHistoryOnly = hasWatchHistoryProvider && (
        (this.plexOnlyMode && this.plexUseHistory) ||
        (this.jellyfinOnlyMode && this.jellyfinUseHistory) ||
        (this.tautulliOnlyMode && this.tautulliUseHistory) ||
        (this.traktOnlyMode && this.traktUseHistory)
      );
      
      // Skip library emptiness check if we're using watch history only mode
      if (libraryEmpty && !useWatchHistoryOnly) {
        if (this.isMovieMode && radarrService.isConfigured()) {
          // First check if we already have movies in our local cache
          // to avoid unnecessary API calls
          if (this.localMovies && this.localMovies.length > 0) {
            console.log(`Using ${this.localMovies.length} movies from local cache`);
          } else {
            // Try to fetch movies directly from Radarr if Radarr is configured but movies prop is empty
            console.log('Movies array is empty but Radarr is configured, attempting to fetch movies');
            try {
              const moviesData = await radarrService.getMovies();
              if (moviesData && moviesData.length > 0) {
                console.log(`Successfully fetched ${moviesData.length} movies from Radarr directly`);
                // Use the movies we just fetched for recommendations
                this.localMovies = moviesData;
              } else if (!hasWatchHistoryProvider) {
                this.error = `Your Radarr library is empty. Add some movies to get recommendations or enable a watch history provider.`;
                return;
              }
            } catch (error) {
              console.error('Error fetching movies directly from Radarr:', error);
              if (!hasWatchHistoryProvider) {
                this.error = `Your Radarr library appears to be empty or inaccessible. Add some movies to get recommendations or enable a watch history provider.`;
                return;
              }
            }
          }
        } else if (!hasWatchHistoryProvider) {
          this.error = `Your ${this.isMovieMode ? 'Radarr' : 'Sonarr'} library is empty. Add some ${this.isMovieMode ? 'movies' : 'TV shows'} to get recommendations or enable a watch history provider.`;
          return;
        }
      }
      
      if (!openAIService.isConfigured()) {
        this.error = 'AI service is not configured. Please provide an API key.';
        this.goToSettings();
        return;
      }
      
      // Reset recommendations array to ensure counter starts at 0
      this.recommendations = [];
      
      this.loading = true;
      this.error = null;
      this.recommendationsRequested = true;
      this.settingsExpanded = false; // Collapse settings when getting recommendations
      
      // Start the rotating loading messages
      this.startLoadingMessages();
      
      // Scroll to the top of the loading section
      setTimeout(() => {
        const loadingElement = document.querySelector('.loading');
        if (loadingElement) {
          loadingElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
      
      try {
        // Convert selectedGenres array to a comma-separated string for the API
        const genreString = this.selectedGenres.length > 0 
          ? this.selectedGenres.join(', ')
          : '';
        
        // Prepare watch history based on user configuration
        let watchHistory = [];
        
        // First try to load from storageUtils cache
        let plexHistoryFiltered = [];
        let jellyfinHistoryFiltered = [];
        let tautulliHistoryFiltered = [];
        let traktHistoryFiltered = [];
        
        // Get local Plex history
        if (this.plexUseHistory) {
          let plexHistory;
          if (this.isMovieMode) {
            plexHistory = databaseStorageUtils.getJSON('watchHistoryMovies');
            if (!plexHistory) {
              plexHistory = this.recentlyWatchedMovies || [];
            }
          } else {
            plexHistory = databaseStorageUtils.getJSON('watchHistoryShows');
            if (!plexHistory) {
              plexHistory = this.recentlyWatchedShows || [];
            }
          }
          plexHistoryFiltered = this.filterWatchHistory(plexHistory, 'plex');
        }
        
        // Get local Jellyfin history
        if (this.jellyfinUseHistory) {
          let jellyfinHistory;
          if (this.isMovieMode) {
            jellyfinHistory = databaseStorageUtils.getJSON('jellyfinWatchHistoryMovies');
            if (!jellyfinHistory) {
              jellyfinHistory = this.jellyfinRecentlyWatchedMovies || [];
            }
          } else {
            jellyfinHistory = databaseStorageUtils.getJSON('jellyfinWatchHistoryShows');
            if (!jellyfinHistory) {
              jellyfinHistory = this.jellyfinRecentlyWatchedShows || [];
            }
          }
          jellyfinHistoryFiltered = this.filterWatchHistory(jellyfinHistory, 'jellyfin');
        }
        
        // Get local Tautulli history
        if (this.tautulliUseHistory) {
          let tautulliHistory;
          if (this.isMovieMode) {
            tautulliHistory = databaseStorageUtils.getJSON('tautulliWatchHistoryMovies');
            if (!tautulliHistory) {
              tautulliHistory = this.tautulliRecentlyWatchedMovies || [];
            }
          } else {
            tautulliHistory = databaseStorageUtils.getJSON('tautulliWatchHistoryShows');
            if (!tautulliHistory) {
              tautulliHistory = this.tautulliRecentlyWatchedShows || [];
            }
          }
          tautulliHistoryFiltered = this.filterWatchHistory(tautulliHistory, 'tautulli');
        }
        
        // Get local Trakt history
        if (this.traktUseHistory) {
          let traktHistory;
          if (this.isMovieMode) {
            traktHistory = databaseStorageUtils.getJSON('traktWatchHistoryMovies');
            if (!traktHistory) {
              traktHistory = this.traktRecentlyWatchedMovies || [];
            }
          } else {
            traktHistory = databaseStorageUtils.getJSON('traktWatchHistoryShows');
            if (!traktHistory) {
              traktHistory = this.traktRecentlyWatchedShows || [];
            }
          }
          traktHistoryFiltered = this.filterWatchHistory(traktHistory, 'trakt');
        }
        
        // If no local cache, fall back to props
        if (plexHistoryFiltered.length === 0 && this.plexUseHistory) {
          console.log('No cached Plex history found, using prop data');
          const plexHistory = this.isMovieMode ? this.recentlyWatchedMovies || [] : this.recentlyWatchedShows || [];
          plexHistoryFiltered = this.filterWatchHistory(plexHistory, 'plex');
        }
        
        if (jellyfinHistoryFiltered.length === 0 && this.jellyfinUseHistory) {
          console.log('No cached Jellyfin history found, using prop data');
          const jellyfinHistory = this.isMovieMode ? this.jellyfinRecentlyWatchedMovies || [] : this.jellyfinRecentlyWatchedShows || [];
          jellyfinHistoryFiltered = this.filterWatchHistory(jellyfinHistory, 'jellyfin');
        }
        
        if (tautulliHistoryFiltered.length === 0 && this.tautulliUseHistory) {
          console.log('No cached Tautulli history found, using prop data');
          const tautulliHistory = this.isMovieMode ? this.tautulliRecentlyWatchedMovies || [] : this.tautulliRecentlyWatchedShows || [];
          tautulliHistoryFiltered = this.filterWatchHistory(tautulliHistory, 'tautulli');
        }
        
        if (traktHistoryFiltered.length === 0 && this.traktUseHistory) {
          console.log('No cached Trakt history found, using prop data');
          const traktHistory = this.isMovieMode ? this.traktRecentlyWatchedMovies || [] : this.traktRecentlyWatchedShows || [];
          traktHistoryFiltered = this.filterWatchHistory(traktHistory, 'trakt');
        }
        
        // Combine histories based on "only mode" settings
        if (this.plexOnlyMode && this.plexUseHistory) {
          watchHistory = plexHistoryFiltered;
        } else if (this.jellyfinOnlyMode && this.jellyfinUseHistory) {
          watchHistory = jellyfinHistoryFiltered;
        } else if (this.tautulliOnlyMode && this.tautulliUseHistory) {
          watchHistory = tautulliHistoryFiltered;
        } else if (this.traktOnlyMode && this.traktUseHistory) {
          watchHistory = traktHistoryFiltered;
        } else {
          // Combine all enabled histories
          watchHistory = [
            ...plexHistoryFiltered,
            ...jellyfinHistoryFiltered,
            ...tautulliHistoryFiltered,
            ...traktHistoryFiltered
          ];
        }
        
        console.log(`Using watch history: ${watchHistory.length} items (Plex: ${plexHistoryFiltered.length}, Jellyfin: ${jellyfinHistoryFiltered.length}, Tautulli: ${tautulliHistoryFiltered.length}, Trakt: ${traktHistoryFiltered.length})`);
        
        // If no watch history is available or all are disabled, use empty array
        if (watchHistory.length === 0) {
          console.log('No watch history is being used for recommendations');
          
          // If still no history found, refresh from server as last resort
          if (this.plexUseHistory || this.jellyfinUseHistory || this.tautulliUseHistory || this.traktUseHistory) {
            try {
              console.log('No watch history found locally, trying to fetch from server...');
              const historyType = this.isMovieMode ? 'movies' : 'shows';
              const serverHistory = await apiService.getWatchHistory(historyType);
              
              if (serverHistory && serverHistory.length > 0) {
                console.log(`Loaded ${serverHistory.length} items from server watch history`);
                
                // Filter by source based on user preferences
                if (this.plexOnlyMode && this.plexUseHistory) {
                  watchHistory = serverHistory.filter(item => item.source === 'plex');
                } else if (this.jellyfinOnlyMode && this.jellyfinUseHistory) {
                  watchHistory = serverHistory.filter(item => item.source === 'jellyfin');
                } else if (this.tautulliOnlyMode && this.tautulliUseHistory) {
                  watchHistory = serverHistory.filter(item => item.source === 'tautulli');
                } else if (this.traktOnlyMode && this.traktUseHistory) {
                  watchHistory = serverHistory.filter(item => item.source === 'trakt');
                } else {
                  // Apply filters for each service if they're enabled
                  let filteredHistory = [];
                  
                  if (this.plexUseHistory) {
                    filteredHistory = [...filteredHistory, ...serverHistory.filter(item => item.source === 'plex')];
                  }
                  
                  if (this.jellyfinUseHistory) {
                    filteredHistory = [...filteredHistory, ...serverHistory.filter(item => item.source === 'jellyfin')];
                  }
                  
                  if (this.tautulliUseHistory) {
                    filteredHistory = [...filteredHistory, ...serverHistory.filter(item => item.source === 'tautulli')];
                  }
                  
                  if (this.traktUseHistory) {
                    filteredHistory = [...filteredHistory, ...serverHistory.filter(item => item.source === 'trakt')];
                  }
                  
                  watchHistory = filteredHistory;
                }
                
                console.log(`Using ${watchHistory.length} items from server history after filtering`);
              }
            } catch (error) {
              console.error('Error fetching watch history from server:', error);
            }
          }
        }
        
        // Get initial recommendations using the appropriate service method based on mode
        if (this.isMovieMode) {
          console.log("Starting movie recommendations...");
          console.log("Movies array:", this.localMovies ? this.localMovies.length : 0, "items");
          console.log("NumRecommendations:", this.numRecommendations);
          console.log("GenreString:", genreString);
          console.log("PreviousMovieRecommendations:", this.previousMovieRecommendations.length, "items");
          console.log("Watch history:", watchHistory.length, "items");
          
          try {
            // Use movie recommendations method
            this.recommendations = await openAIService.getMovieRecommendations(
              this.localMovies, // Use localMovies array for movie mode
              this.numRecommendations,
              genreString,
              this.previousMovieRecommendations, // Use movie-specific history
              this.likedRecommendations,
              this.dislikedRecommendations,
              watchHistory,  // This includes Trakt history if traktUseHistory is true
              this.plexOnlyMode || this.jellyfinOnlyMode || this.tautulliOnlyMode || this.traktOnlyMode,
              this.customVibe,
              this.selectedLanguage,
              this.promptStyle,
              this.useCustomPromptOnly
            );
            
            // Log what watch history was actually used
            console.log("Watch history used for recommendations:", {
              total: watchHistory.length,
              plex: this.plexUseHistory ? plexHistoryFiltered.length : 0,
              jellyfin: this.jellyfinUseHistory ? jellyfinHistoryFiltered.length : 0,
              tautulli: this.tautulliUseHistory ? tautulliHistoryFiltered.length : 0,
              trakt: this.traktUseHistory ? traktHistoryFiltered.length : 0,
              onlyMode: this.plexOnlyMode ? 'plex' : this.jellyfinOnlyMode ? 'jellyfin' : this.tautulliOnlyMode ? 'tautulli' : this.traktOnlyMode ? 'trakt' : 'combined'
            });
            
            // Log a sample of watch history items to debug
            const watchHistorySample = watchHistory.slice(0, 3);
            console.log("Watch history sample (first 3 items):", 
              watchHistorySample.map(item => {
                try {
                  let source = 'unknown';
                  if (item.type === 'movie' && item.traktId) {
                    source = 'trakt';
                  } else if (item.plexLibraryTitle) {
                    source = 'plex';
                  } else if (item.jellyfinId) {
                    source = 'jellyfin';
                  } else if (item.tautulliId) {
                    source = 'tautulli';
                  }
                  
                  return {
                    title: item.title || item.name || (typeof item === 'string' ? item : ''),
                    watched: item.watched || item.lastWatched || 'no date',
                    source,
                    type: item.type || 'unknown'
                  };
                } catch (error) {
                  console.error('Error mapping watch history item:', error, item);
                  return { title: 'Error parsing item', error: error.message };
                }
              })
            );
            console.log("Movie recommendations completed successfully:", this.recommendations);
          } catch (error) {
            console.error("Error getting movie recommendations:", error);
            throw error; // Rethrow to be caught by the outer try/catch
          }
        } else {
          // Use TV show recommendations method
          this.recommendations = await openAIService.getRecommendations(
            this.series, 
            this.numRecommendations,
            genreString,
            this.previousRecommendations,
            this.likedRecommendations,
            this.dislikedRecommendations,
            watchHistory,
            this.plexOnlyMode || this.jellyfinOnlyMode || this.tautulliOnlyMode || this.traktOnlyMode,
            this.customVibe,
            this.selectedLanguage,
            this.promptStyle,
            this.useCustomPromptOnly
          );
        }
        
        // Update loading message to include genres if selected
        const loadingMessage = document.querySelector('.loading p');
        if (loadingMessage && this.selectedGenres.length > 0) {
          let source = this.isMovieMode ? 'movie library' : 'TV library';
          if (this.plexOnlyMode) {
            source = 'Plex watch history';
          } else if (this.jellyfinOnlyMode) {
            source = 'Jellyfin watch history';
          } else if (this.tautulliOnlyMode) {
            source = 'Tautulli watch history';
          } else if (this.traktOnlyMode) {
            source = 'Trakt watch history';
          } else if (this.plexConfigured || this.jellyfinConfigured || this.tautulliConfigured || this.traktConfigured) {
            source = `${this.isMovieMode ? 'movie' : 'TV'} library and watch history`;
          }
          
          loadingMessage.textContent = `Analyzing your ${source} and generating ${genreString} recommendations...`;
        }
        
        // Filter out content that is already in the library, already recommended, or liked/disliked
        // Always do this filtering regardless of mode to ensure clean recommendations
        if (this.recommendations.length > 0) {
          this.recommendations = await this.filterExistingShows(this.recommendations);
          
          // Remove any duplicate recommendations
          this.recommendations = this.removeDuplicateRecommendations(this.recommendations);
          
          // Ratings will be fetched after all recommendations are gathered
        }
        
        // If we have fewer recommendations than requested after filtering, get more
        if (this.recommendations.length < this.numRecommendations) {
          await this.getAdditionalRecommendations(this.numRecommendations - this.recommendations.length, genreString);
        }
        
        // Sort recommendations by recommendarr rating from highest to lowest
        if (this.recommendations.length > 0) {
          this.recommendations.sort((a, b) => {
            // Extract numerical values from rating strings
            const scoreA = a.rating ? this.extractScoreValue(a.rating) : 0;
            const scoreB = b.rating ? this.extractScoreValue(b.rating) : 0;
            
            // Sort in descending order (highest first)
            return scoreB - scoreA;
          });
          
          console.log("Recommendations sorted by recommendarr rating (highest first)");
        }

        if (this.recommendations.length > 0) {
          this.fetchRatingsForRecommendations()
        }
      
        // Add new recommendations to history
        this.addToRecommendationHistory(this.recommendations);
        
        // Fetch posters for each recommendation
        this.fetchPosters();
      } catch (error) {
        console.error('Failed to get recommendations:', error);
        // Provide a more helpful error message based on the error
        if (error.message && error.message.includes('API')) {
          this.error = error.message;
          // Redirect to settings if it's an API key issue
          if (error.message.includes('API key') || error.message.includes('not configured')) {
            this.goToSettings();
          }
        } else if (error.response && error.response.data && error.response.data.error) {
          const errorMsg = error.response.data.error.message || 'Unknown API error';
          this.error = `API Error: ${errorMsg}`;
          
          // Redirect to settings if it's an API key issue
          if (errorMsg.includes('API key') || 
              errorMsg.includes('authentication') || 
              errorMsg.includes('401') || 
              errorMsg.includes('provide')) {
            this.goToSettings();
          }
        } else {
          this.error = 'Failed to get recommendations. Please check your AI service settings and try again.';
        }
        this.recommendations = [];
      } finally {
        // Stop the rotating loading messages
        this.stopLoadingMessages();
        this.loading = false;
      }
    },
    
    /**
     * Get additional recommendations when filtering results in fewer than requested
     * @param {number} additionalCount - Number of additional recommendations needed
     * @param {string} genreString - Genre preferences
     * @param {number} [recursionDepth=0] - Current recursion depth to limit excessive API calls
     */
    async getAdditionalRecommendations(additionalCount, genreString, recursionDepth = 0) {
      if (additionalCount <= 0 || recursionDepth >= 10) return;
      
      console.log(`Getting ${additionalCount} additional ${this.isMovieMode ? 'movie' : 'TV show'} recommendations after filtering (recursion depth: ${recursionDepth})`);
      
      // Update base message for the message rotator to use
      const baseMessage = `Getting additional recommendations to match your request...`;
      this.currentLoadingMessage = baseMessage;
      
      try {
        // Get additional recommendations
        // Include current recommendations in the exclusion list
        const currentTitles = this.recommendations.map(rec => rec.title);
        const previousRecsList = this.isMovieMode ? this.previousMovieRecommendations : this.previousShowRecommendations;
        const updatedPrevious = [...new Set([...previousRecsList, ...currentTitles])];
        
        // Log the liked/disliked lists for debugging
        console.log(`Using ${this.likedRecommendations.length} liked and ${this.dislikedRecommendations.length} disliked items for additional recommendations`);
        
        // Request more recommendations than we need to account for filtering
        const requestCount = Math.min(additionalCount * 2, 25); // Request 100% more, up to 25 max
        
        // Use the appropriate method based on content type mode
        let additionalRecommendations;
        if (this.isMovieMode) {
          // Use movie recommendations method
          additionalRecommendations = await openAIService.getAdditionalMovieRecommendations(
            requestCount,
            updatedPrevious,
            genreString,
            this.customVibe,
            this.selectedLanguage,
            this.localMovies, // Use localMovies same as initial request
            this.likedRecommendations,
            this.dislikedRecommendations
          );
        } else {
          // Use TV show recommendations method
          additionalRecommendations = await openAIService.getAdditionalTVRecommendations(
            requestCount,
            updatedPrevious,
            genreString,
            this.customVibe,
            this.selectedLanguage,
            this.series, // Use series same as initial request
            this.likedRecommendations,
            this.dislikedRecommendations
          );
        }
        
        // Always filter the additional recommendations, including checking for partial matches
        let filteredAdditional = additionalRecommendations;
        if (filteredAdditional.length > 0) {
          filteredAdditional = await this.filterExistingShows(filteredAdditional);
        }
        
        // Combine with existing recommendations
        this.recommendations = [...this.recommendations, ...filteredAdditional];
        
        // Remove any duplicate recommendations after combining
        this.recommendations = this.removeDuplicateRecommendations(this.recommendations);
        
        // Sort recommendations by recommendarr rating from highest to lowest
        if (this.recommendations.length > 0) {
          this.recommendations.sort((a, b) => {
            // Extract numerical values from rating strings
            const scoreA = a.rating ? this.extractScoreValue(a.rating) : 0;
            const scoreB = b.rating ? this.extractScoreValue(b.rating) : 0;
            
            // Sort in descending order (highest first)
            return scoreB - scoreA;
          });
          
          console.log("Additional recommendations sorted by recommendarr rating (highest first)");
        }
        
        // If we still don't have enough, try again with incremented recursion depth
        // Even if no additional results were found, we should still try again
        if (this.recommendations.length < this.numRecommendations) {
          // Calculate how many more we need
          const stillNeeded = this.numRecommendations - this.recommendations.length;
          
          console.log(`After filtering, have ${this.recommendations.length}/${this.numRecommendations} recommendations. Need ${stillNeeded} more. Recursion depth: ${recursionDepth}`);
          
          // Recursive call with updated exclusion list and incremented recursion depth
          if (stillNeeded > 0) {
            await this.getAdditionalRecommendations(stillNeeded, genreString, recursionDepth + 1);
          }
        } else {
          console.log(`Successfully gathered all ${this.numRecommendations} recommendations at recursion depth ${recursionDepth}`);
        }
      } catch (error) {
        console.error('Error getting additional recommendations:', error);
        
        // Count this as one attempt but continue if we're not at the limit
        if (recursionDepth + 1 < 10) {
          console.log(`Retrying after error (recursion depth: ${recursionDepth + 1})`);
          // Calculate how many we still need
          const stillNeeded = this.numRecommendations - this.recommendations.length;
          if (stillNeeded > 0) {
            // Wait a short time before retrying to avoid overwhelming the API
            await new Promise(resolve => setTimeout(resolve, 1000));
            await this.getAdditionalRecommendations(stillNeeded, genreString, recursionDepth + 1);
          }
        }
      }
    },
    
    /**
     * Fetch ratings data from Sonarr/Radarr for each recommendation
     * This adds the ratings object to each recommendation if available
     */
    async fetchRatingsForRecommendations() {
      // Skip if no recommendations or services not configured
      if (!this.recommendations.length) return;
      
      const isRadarrConfigured = this.radarrConfigured || radarrService.isConfigured();
      const isSonarrConfigured = this.sonarrConfigured || sonarrService.isConfigured();
      
      if ((this.isMovieMode && !isRadarrConfigured) || (!this.isMovieMode && !isSonarrConfigured)) {
        console.log(`Skipping ratings lookup - ${this.isMovieMode ? 'Radarr' : 'Sonarr'} not configured`);
        return;
      }
      
      console.log(`Fetching ratings data for ${this.recommendations.length} recommendations from ${this.isMovieMode ? 'Radarr' : 'Sonarr'}`);
      
      // Process recommendations in batches to avoid overwhelming the API
      const batchSize = 5;
      for (let i = 0; i < this.recommendations.length; i += batchSize) {
        const batch = this.recommendations.slice(i, i + batchSize);
        
        // Process each recommendation in the batch in parallel
        await Promise.all(batch.map(async (rec) => {
          try {
            if (this.isMovieMode) {
              // Lookup movie in Radarr
              const movieData = await radarrService.lookupMovie(rec.title);
              if (movieData && movieData.ratings) {
                rec.ratings = movieData.ratings;
                console.log(`Added ratings for movie "${rec.title}":`, rec.ratings);
              }
        } else {
          // Lookup series in Sonarr
          const seriesData = await sonarrService.lookupSeries(rec.title);
          if (seriesData && seriesData.ratings) {
            // Transform Sonarr ratings to match expected structure
            // Sonarr ratings are just IMDB ratings
            rec.ratings = {
              imdb: {
                value: seriesData.ratings.value,
                votes: seriesData.ratings.votes
              }
            };
            console.log(`Added transformed ratings for series "${rec.title}":`, rec.ratings);
          }
            }
          } catch (error) {
            console.error(`Error fetching ratings for "${rec.title}":`, error);
            // Continue with other recommendations even if one fails
          }
        }));
        
        // Small delay between batches to be nice to the API
        if (i + batchSize < this.recommendations.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      console.log('Finished fetching ratings data for all recommendations');
    },
    
    /**
     * Filter out shows that already exist in the Sonarr/Radarr library or have been previously
     * recommended, liked, or disliked
     * @param {Array} recommendations - The recommended shows
     * @returns {Promise<Array>} - Filtered recommendations
     */
    async filterExistingShows(recommendations) {
      // Check if appropriate service is configured based on current mode
      if (this.isMovieMode) {
        if (!radarrService.isConfigured() || !this.movies.length) {
          return recommendations;
        }
      } else {
        if (!sonarrService.isConfigured() || !this.series.length) {
          return recommendations;
        }
      }
      
      try {
        // Create a normalized map of existing titles in the library
        const existingTitles = new Set(
          this.isMovieMode 
            ? this.localMovies.map(movie => movie.title.toLowerCase())
            : this.series.map(show => show.title.toLowerCase())
        );
        
        // Add liked recommendations to the filter set
        const likedRecommendationTitles = new Set(
          this.likedRecommendations.map(title => title.toLowerCase())
        );
        
        // Add disliked recommendations to the filter set
        const dislikedRecommendationTitles = new Set(
          this.dislikedRecommendations.map(title => title.toLowerCase())
        );
        
        // Add previous recommendations to the filter set - use the appropriate history
        const previousList = this.isMovieMode ? this.previousMovieRecommendations : this.previousShowRecommendations;
        const previousRecommendationTitles = new Set(
          previousList.map(title => title.toLowerCase())
        );
        
        // Filter out recommendations that already exist in the library, liked list, disliked list, or previous recommendations
        const filteredRecommendations = recommendations.filter(rec => {
          const normalizedTitle = rec.title.toLowerCase();
          
          // Check for exact matches
          if (existingTitles.has(normalizedTitle) || 
              likedRecommendationTitles.has(normalizedTitle) || 
              dislikedRecommendationTitles.has(normalizedTitle) || 
              previousRecommendationTitles.has(normalizedTitle)) {
            return false;
          }
          
          // Check for close partial matches as well
          // For library items
          for (const libraryTitle of existingTitles) {
            // Only check substantial titles (avoid false matches with very short titles)
            if (normalizedTitle.length > 4 && libraryTitle.length > 4) {
              // Check if one is a substring of the other (handles cases like "The Matrix" vs "Matrix")
              if (normalizedTitle.includes(libraryTitle) || libraryTitle.includes(normalizedTitle)) {
                return false;
              }
            }
          }
          
          // For liked items
          for (const likedTitle of likedRecommendationTitles) {
            if (normalizedTitle.length > 4 && likedTitle.length > 4) {
              if (normalizedTitle.includes(likedTitle) || likedTitle.includes(normalizedTitle)) {
                return false;
              }
            }
          }
          
          // For disliked items
          for (const dislikedTitle of dislikedRecommendationTitles) {
            if (normalizedTitle.length > 4 && dislikedTitle.length > 4) {
              if (normalizedTitle.includes(dislikedTitle) || dislikedTitle.includes(normalizedTitle)) {
                return false;
              }
            }
          }
          
          // For previous recommendations
          for (const prevTitle of previousRecommendationTitles) {
            if (normalizedTitle.length > 4 && prevTitle.length > 4) {
              if (normalizedTitle.includes(prevTitle) || prevTitle.includes(normalizedTitle)) {
                return false;
              }
            }
          }
          
          return true;
        });
        
        const contentType = this.isMovieMode ? 'movies' : 'shows';
        console.log(`Filtered out ${recommendations.length - filteredRecommendations.length} ${contentType} that already exist in the library, liked/disliked lists, or recommendation history`);
        return filteredRecommendations;
      } catch (error) {
        console.error(`Error filtering existing ${this.isMovieMode ? 'movies' : 'shows'}:`, error);
        return recommendations; // Return original list on error
      }
    },
    
    /**
     * Fetch posters for each recommendation in parallel
     */
    async fetchPosters() {
      // Poster handling has been moved to RecommendationResults component
      console.log('fetchPosters method called - functionality moved to RecommendationResults component');
    },
    
    /**
     * Format bytes to a human-readable size (KB, MB, GB, etc.)
     * @param {number} bytes - The size in bytes
     * @returns {string} - Formatted size string
     */
    formatFreeSpace(bytes) {
      if (bytes === 0) return '0 B';
      
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      
      return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
    },

    /**
     * Fetch root folders and quality profiles from Sonarr
     */
    async fetchFolderAndQualityOptions() {
      if (!sonarrService.isConfigured()) {
        return;
      }
      
      this.loadingFolders = true;
      
      try {
        // Fetch both root folders and quality profiles in parallel
        const [rootFolders, qualityProfiles] = await Promise.all([
          sonarrService.getRootFolders(),
          sonarrService.getQualityProfiles()
        ]);
        
        this.rootFolders = rootFolders;
        this.qualityProfiles = qualityProfiles;
        
        // Set default selections
        if (rootFolders.length > 0) {
          this.selectedRootFolder = rootFolders[0].path;
        }
        
        if (qualityProfiles.length > 0) {
          this.selectedQualityProfile = qualityProfiles[0].id;
        }
      } catch (error) {
        console.error('Error fetching Sonarr settings:', error);
      } finally {
        this.loadingFolders = false;
      }
    },

    /**
     * Open season selection modal for a series
     * @param {string} title - The series title to request
     */
    async openSeasonSelector(title) {
      if (!sonarrService.isConfigured()) {
        this.error = 'Sonarr service is not configured.';
        return;
      }
      
      try {
        // Set requesting state for this series
        this.requestingSeries = title;
        
        // Check if series already exists in Sonarr
        const existingSeries = await sonarrService.findSeriesByTitle(title);
        
        if (existingSeries && existingSeries.id) {
          // Series already exists in library
          this.requestStatus[title] = {
            success: true,
            message: 'Series already exists in your Sonarr library',
            alreadyExists: true
          };
          
          this.requestingSeries = null;
          return;
        }
        
        // Look up series info to get seasons
        const seriesInfo = await sonarrService.lookupSeries(title);
        
        // Set current series and seasons for modal
        let seasons = [];
        let showSeasonWarning = false;
        if (seriesInfo.seasons && seriesInfo.seasons.length > 0) {
          seasons = seriesInfo.seasons
            .filter(season => season.seasonNumber > 0) // Filter out specials (season 0)
            .sort((a, b) => a.seasonNumber - b.seasonNumber); // Sort by season number
        } else {
          // If no seasons are returned, show a warning but don't create fake seasons
          showSeasonWarning = true;
          // Use any seasons information from tvdbId if present
          if (seriesInfo.tvdbId) {
            console.log('No season information available for series:', title);
          }
        }
        
        this.currentSeries = {
          title: title,
          seasons: seasons,
          showSeasonWarning: showSeasonWarning
        };
        
        // If seasons are available, set only season 1 selected by default
        if (this.currentSeries.seasons.length > 0) {
          const season1 = this.currentSeries.seasons.find(s => s.seasonNumber === 1);
          this.selectedSeasons = season1 ? [1] : [this.currentSeries.seasons[0].seasonNumber];
          
          // Reset tag selection
          this.selectedTags.sonarr = [];
          this.tagInput = '';
          
          // Reload tags
          this.loadSonarrTags();
        } else {
          this.selectedSeasons = [];
        }
        
        // Fetch root folders and quality profiles
        await this.fetchFolderAndQualityOptions();
        
        // Show modal
        this.showSeasonModal = true;
        
        // Clear requesting state since modal is now open
        this.requestingSeries = null;
        
      } catch (error) {
        console.error(`Error preparing series "${title}" for Sonarr:`, error);
        
        // Store error
        this.requestStatus[title] = {
          success: false,
          message: `Error: ${error.message || 'Unknown error'}`
        };
        
        // Clear requesting state
        this.requestingSeries = null;
      }
    },
    
    /**
     * Toggle selection of a season
     * @param {number} seasonNumber - The season number to toggle
     */
    toggleSeason(seasonNumber) {
      const index = this.selectedSeasons.indexOf(seasonNumber);
      if (index === -1) {
        this.selectedSeasons.push(seasonNumber);
      } else {
        this.selectedSeasons.splice(index, 1);
      }
    },
    
    /**
     * Toggle selection of all seasons
     */
    toggleAllSeasons() {
      if (this.selectedSeasons.length === this.currentSeries.seasons.length) {
        // If all are selected, deselect all
        this.selectedSeasons = [];
      } else {
        // Otherwise, select all
        this.selectedSeasons = this.currentSeries.seasons.map(s => s.seasonNumber);
      }
    },
    
    /**
     * Close the season selection modal
     */
    closeSeasonModal() {
      this.showSeasonModal = false;
      this.currentSeries = null;
      this.selectedSeasons = [];
      this.selectedRootFolder = null;
      this.selectedQualityProfile = null;
      this.rootFolders = [];
      this.qualityProfiles = [];
    },
    
    /**
     * Open the TMDB detail modal for a recommendation
     * @param {Object} recommendation - The recommendation to show details for
     */
    openTMDBDetailModal(recommendation) {
      console.log('Opening TMDB modal for:', recommendation.title);
      
      // Set these values regardless of TMDB configuration
      this.selectedMediaTitle = recommendation.title;
      this.selectedMediaId = null; // We'll search by title
      this.showTMDBModal = true;
      console.log('Modal state set to open:', this.showTMDBModal);
    },
    
    /**
     * Close the TMDB detail modal
     */
    closeTMDBModal() {
      this.showTMDBModal = false;
      this.selectedMediaId = null;
      this.selectedMediaTitle = '';
    },
    
    /**
     * Request a series to be added to Sonarr with selected seasons and options
     */
    async confirmAddSeries() {
      if (!this.currentSeries || (!this.selectedSeasons.length && !this.currentSeries.showSeasonWarning)) {
        return;
      }
      
      try {
        // Set requesting state
        this.requestingSeries = this.currentSeries.title;
        
        // Close modal
        this.showSeasonModal = false;
        
        // If no season info is available (showSeasonWarning is true), 
        // request the series with null selectedSeasons to indicate all seasons
        if (this.currentSeries.showSeasonWarning) {
          // When there was no season info available, pass null for selectedSeasons
          // to let Sonarr handle all seasons
          const response = await sonarrService.addSeries(
            this.currentSeries.title,
            null, // Null indicates all seasons should be monitored
            this.selectedQualityProfile,
            this.selectedRootFolder,
            this.selectedTags.sonarr
          );
          
          // Store success response
          this.requestStatus[this.currentSeries.title] = {
            success: true,
            message: 'Successfully added to Sonarr with all seasons monitored',
            details: response
          };
        } else {
          // Normal flow - add series with explicitly selected seasons
          const response = await sonarrService.addSeries(
            this.currentSeries.title, 
            this.selectedSeasons,
            this.selectedQualityProfile,
            this.selectedRootFolder,
            this.selectedTags.sonarr
          );
          
          // Store success response
          this.requestStatus[this.currentSeries.title] = {
            success: true,
            message: 'Successfully added to Sonarr',
            details: response
          };
        }
        
      } catch (error) {
        console.error(`Error adding series "${this.currentSeries.title}" to Sonarr:`, error);
        
        // Store error
        this.requestStatus[this.currentSeries.title] = {
          success: false,
          message: `Error: ${error.message || 'Unknown error'}`
        };
        
      } finally {
        // Clear requesting state and current series
        this.requestingSeries = null;
        this.currentSeries = null;
        this.selectedSeasons = [];
        this.selectedRootFolder = null;
        this.selectedQualityProfile = null;
      }
    },
    
    /**
     * Request a series or movie to be added
     * @param {string} title - The title to add
     */
    requestSeries(title) {
      if (this.isMovieMode) {
        this.requestMovie(title);
      } else {
        this.openSeasonSelector(title);
      }
    },
    
    /**
     * Open movie confirmation modal
     * @param {string} title - The movie title to add
     */
    async requestMovie(title) {
      if (!radarrService.isConfigured()) {
        this.error = 'Radarr service is not configured.';
        return;
      }
      
      try {
        // Set requesting state for this movie
        this.requestingSeries = title; // Reuse the same state variable
        
        // Check if movie already exists in Radarr
        const existingMovie = await radarrService.findExistingMovieByTitle(title);
        
        if (existingMovie) {
          // Movie already exists in library
          this.requestStatus[title] = {
            success: true,
            message: 'Movie already exists in your Radarr library',
            alreadyExists: true
          };
          
          this.requestingSeries = null;
          return;
        }
        
        // Look up movie details
        const lookupData = await radarrService._apiRequest('/api/v3/movie/lookup', 'GET', null, { term: title });
        
        if (!lookupData || lookupData.length === 0) {
          throw new Error(`Movie "${title}" not found in Radarr lookup.`);
        }
        
        // Set current movie data
        this.currentMovie = {
          title: title,
          tmdbId: lookupData[0].tmdbId,
          year: lookupData[0].year
        };
        
        // Fetch available quality profiles and root folders
        this.loadingMovieFolders = true;
        
        try {
          const [qualityProfiles, rootFolders] = await Promise.all([
            radarrService.getQualityProfiles(),
            radarrService.getRootFolders()
          ]);
          
          this.movieQualityProfiles = qualityProfiles;
          this.movieRootFolders = rootFolders;
          
          // Set default selections
          if (rootFolders.length > 0) {
            this.selectedMovieRootFolder = rootFolders[0].path;
          }
          
          if (qualityProfiles.length > 0) {
            this.selectedMovieQualityProfile = qualityProfiles[0].id;
          }
          
          // Reset tag selection
          this.selectedTags.radarr = [];
          this.tagInput = '';
          
          // Load tags
          this.loadRadarrTags();
        } finally {
          this.loadingMovieFolders = false;
        }
        
        // Show the modal
        this.showMovieModal = true;
        
        // Clear requesting state
        this.requestingSeries = null;
        
      } catch (error) {
        console.error(`Error preparing movie "${title}" for Radarr:`, error);
        
        // Store error
        this.requestStatus[title] = {
          success: false,
          message: `Error: ${error.message || 'Unknown error'}`
        };
        
        // Clear requesting state
        this.requestingSeries = null;
      }
    },
    
    /**
     * Close the movie confirmation modal
     */
    closeMovieModal() {
      this.showMovieModal = false;
      this.currentMovie = null;
      this.selectedMovieRootFolder = null;
      this.selectedMovieQualityProfile = null;
      this.movieRootFolders = [];
      this.movieQualityProfiles = [];
    },
    
    /**
     * Confirm adding a movie to Radarr
     */
    async confirmAddMovie() {
      if (!this.currentMovie) {
        return;
      }
      
      try {
        // Set requesting state
        this.requestingSeries = this.currentMovie.title;
        
        // Close modal
        this.showMovieModal = false;
        
        // Add movie to Radarr with selected options
        const response = await radarrService.addMovie(
          this.currentMovie.title,
          this.selectedMovieQualityProfile,
          this.selectedMovieRootFolder,
          this.selectedTags.radarr
        );
        
        // Store success response
        this.requestStatus[this.currentMovie.title] = {
          success: true,
          message: 'Successfully added to Radarr',
          details: response
        };
        
      } catch (error) {
        console.error(`Error adding movie "${this.currentMovie.title}" to Radarr:`, error);
        
        // Store error
        this.requestStatus[this.currentMovie.title] = {
          success: false,
          message: `Error: ${error.message || 'Unknown error'}`
        };
        
      } finally {
        // Clear requesting state and current movie
        this.requestingSeries = null;
        this.currentMovie = null;
        this.selectedMovieRootFolder = null;
        this.selectedMovieQualityProfile = null;
      }
    },
    
    /**
     * Handle window resize events to update the grid layout
     */
    handleResize() {
      // This method has been simplified since shouldUseCompactMode and gridStyle
      // have been moved to RecommendationResults.vue
      this.$forceUpdate();
      console.log('Window resize handled in RequestRecommendations');
    },
    
    /**
     * Load all saved settings from server via API service
     */
    async loadSavedSettings() {
      try {
        // Fetch all settings from the server
        const settings = await apiService.getSettings();
        
        if (!settings) {
          console.log('No settings found on server');
          return;
        }
        
        console.log('Loaded settings from server:', settings);
        
        // Load number of recommendations setting
        if (settings.numRecommendations !== undefined) {
          const numRecs = parseInt(settings.numRecommendations, 10);
          if (!isNaN(numRecs) && numRecs >= 1 && numRecs <= 50) {
            this.numRecommendations = numRecs;
            console.log('Setting numRecommendations from server:', this.numRecommendations);
          }
        }
        
        // Load columns count setting
        if (settings.columnsCount !== undefined) {
          const columns = parseInt(settings.columnsCount, 10);
          if (!isNaN(columns) && columns >= 1 && columns <= 4) {
            this.columnsCount = columns;
            console.log('Setting columnsCount from server:', this.columnsCount);
          }
        }
        
        
        // Temperature setting
        if (settings.aiTemperature !== undefined) {
          const temp = parseFloat(settings.aiTemperature);
          if (!isNaN(temp) && temp >= 0 && temp <= 1) {
            this.temperature = temp;
          }
        }
        
        // Library sampling settings
        if (settings.useSampledLibrary !== undefined) {
          this.useSampledLibrary = settings.useSampledLibrary === true || settings.useSampledLibrary === 'true';
          console.log('Setting useSampledLibrary from server:', this.useSampledLibrary);
          
          // Also update in OpenAIService
          openAIService.useSampledLibrary = this.useSampledLibrary;
          
          // Save to localStorage as backup
          databaseStorageUtils.set('useSampledLibrary', this.useSampledLibrary.toString());
        }
        
        if (settings.librarySampleSize !== undefined) {
          const sampleSize = parseInt(settings.librarySampleSize, 10);
          if (!isNaN(sampleSize) && sampleSize >= 5 && sampleSize <= 1000) {
            this.sampleSize = sampleSize;
            console.log('Setting sampleSize from server:', this.sampleSize);
            
            // Also update in OpenAIService
            openAIService.sampleSize = this.sampleSize;
            
            // Save to localStorage as backup
            databaseStorageUtils.set('librarySampleSize', this.sampleSize.toString());
          }
        }
        
        // Structured output setting
        if (settings.useStructuredOutput !== undefined) {
          this.useStructuredOutput = settings.useStructuredOutput === true || settings.useStructuredOutput === 'true';
          // Also set it in the OpenAIService
          openAIService.useStructuredOutput = this.useStructuredOutput;
        }
        
        // Load custom prompt only setting
        if (Object.prototype.hasOwnProperty.call(settings, 'useCustomPromptOnly')) {
          this.useCustomPromptOnly = settings.useCustomPromptOnly === true || settings.useCustomPromptOnly === 'true';
          console.log('Setting useCustomPromptOnly from server:', this.useCustomPromptOnly);
          // Set in the OpenAIService if needed
          if (typeof openAIService.setUseCustomPromptOnly === 'function') {
            openAIService.setUseCustomPromptOnly(this.useCustomPromptOnly);
          } else {
            // If method doesn't exist, add the property directly
            openAIService.useCustomPromptOnly = this.useCustomPromptOnly;
          }
        }
        
        // Load prompt style setting
        if (settings.promptStyle) {
          this.promptStyle = settings.promptStyle;
          console.log('Setting promptStyle from server:', this.promptStyle);
          // Set in the OpenAIService
          openAIService.setPromptStyle(this.promptStyle);
        }
        
        // Plex settings
        if (settings.plexHistoryMode) {
          this.plexHistoryMode = settings.plexHistoryMode;
        }
        
        if (settings.plexOnlyMode !== undefined) {
          this.plexOnlyMode = settings.plexOnlyMode;
        }
        
        if (settings.plexUseHistory !== undefined) {
          this.plexUseHistory = settings.plexUseHistory;
        }
        
        if (settings.plexCustomHistoryDays) {
          this.plexCustomHistoryDays = parseInt(settings.plexCustomHistoryDays, 10);
        }
        
        // Jellyfin settings
        if (settings.jellyfinHistoryMode) {
          this.jellyfinHistoryMode = settings.jellyfinHistoryMode;
        }
        
        if (settings.jellyfinOnlyMode !== undefined) {
          this.jellyfinOnlyMode = settings.jellyfinOnlyMode;
        }
        
        if (settings.jellyfinUseHistory !== undefined) {
          this.jellyfinUseHistory = settings.jellyfinUseHistory;
        }
        
        if (settings.jellyfinCustomHistoryDays) {
          this.jellyfinCustomHistoryDays = parseInt(settings.jellyfinCustomHistoryDays, 10);
        }
        
        // Tautulli settings
        if (settings.tautulliHistoryMode) {
          this.tautulliHistoryMode = settings.tautulliHistoryMode;
        }
        
        if (settings.tautulliOnlyMode !== undefined) {
          this.tautulliOnlyMode = settings.tautulliOnlyMode;
        }
        
        if (settings.tautulliUseHistory !== undefined) {
          this.tautulliUseHistory = settings.tautulliUseHistory;
        }
        
        if (settings.tautulliCustomHistoryDays) {
          this.tautulliCustomHistoryDays = parseInt(settings.tautulliCustomHistoryDays, 10);
        }
        
        // Trakt settings
        console.log('Loading Trakt settings from server:', { 
          traktHistoryMode: settings.traktHistoryMode, 
          traktOnlyMode: settings.traktOnlyMode,
          traktUseHistory: settings.traktUseHistory,
          traktCustomHistoryDays: settings.traktCustomHistoryDays
        });
        
        if (settings.traktHistoryMode) {
          this.traktHistoryMode = settings.traktHistoryMode;
        }
        
        if (settings.traktOnlyMode !== undefined) {
          this.traktOnlyMode = settings.traktOnlyMode;
        }
        
        if (settings.traktUseHistory !== undefined) {
          // Make sure we convert it to a boolean in case it's stored as a string
          this.traktUseHistory = settings.traktUseHistory === true || settings.traktUseHistory === 'true';
          console.log('Trakt history use flag set to:', this.traktUseHistory, 'from value:', settings.traktUseHistory);
        } else {
          console.log('traktUseHistory setting not found in server settings, using default:', this.traktUseHistory);
        }
        
        if (settings.traktCustomHistoryDays) {
          this.traktCustomHistoryDays = parseInt(settings.traktCustomHistoryDays, 10);
        }
      } catch (error) {
        console.error('Error loading settings from server:', error);
      }
    }
  },
  async mounted() {
    console.log('RequestRecommendations component mounted');
    console.log('Props: radarrConfigured=', this.radarrConfigured);
    
    // Load all saved settings from the server
    await this.loadSavedSettings();
    
    // Check if Radarr service is configured directly
    if (this.isMovieMode) {
      // First check props
      console.log('Movie mode active, checking Radarr configuration');
      
      // Only load credentials if needed and if movies array is empty
      // This prevents double loading
      if ((!this.movies || this.movies.length === 0) && 
          (!this.radarrConfigured || !radarrService.isConfigured())) {
        console.log('radarrConfigured prop is false or no movies loaded, checking service directly');
        
        // Check if Radarr service is configured directly
        if (!radarrService.isConfigured()) {
          console.log('Radarr service not configured in memory, trying to load credentials');
          // Try to load credentials from server-side storage
          await radarrService.loadCredentials();
          console.log('After loading credentials, Radarr service configured:', radarrService.isConfigured());
        }
      }
    }
    
    // Make sure OpenAI credentials are loaded
    if (!openAIService.isConfigured()) {
      try {
        await openAIService.loadCredentials();
        console.log('After loading OpenAI credentials, service configured:', openAIService.isConfigured());
      } catch (error) {
        console.error('Error loading OpenAI credentials:', error);
      }
    }
    
    // Check if OpenAI is configured after loading credentials
    this.openaiConfigured = openAIService.isConfigured();
    
    // Initialize model selection from user-specific storage
    const currentModel = await databaseStorageUtils.get('openaiModel') || openAIService.model || 'gpt-3.5-turbo';
    
    // Set to custom by default, we'll update once models are fetched
    this.customModel = currentModel;
    this.selectedModel = 'custom';
    this.isCustomModel = true;
    
    // Add window resize listener to update grid style when screen size changes
    window.addEventListener('resize', this.handleResize);
    
    // We've already loaded temperature from server in loadSavedSettings
    // Only check storageUtils or service if the temperature is still at default (0.8)
    if (this.temperature === 0.8) {
      // Try to get from storageUtils first
      const savedTemp = await databaseStorageUtils.get('aiTemperature');
      if (savedTemp !== null) {
        const temp = parseFloat(savedTemp);
        // Validate the value is within range
        if (!isNaN(temp) && temp >= 0 && temp <= 1) {
          this.temperature = temp;
          console.log('Setting temperature from localStorage:', this.temperature);
        }
      } else if (openAIService.temperature !== 0.8) {
        // If still at default, try the service value
        this.temperature = openAIService.temperature;
        console.log('Setting temperature from OpenAIService:', this.temperature);
      }
    } else {
      console.log('Using temperature from server settings:', this.temperature);
    }
    
    // Initialize library mode preferences from service
    this.useSampledLibrary = openAIService.useSampledLibrary;
    this.sampleSize = openAIService.sampleSize;
    
    // If there are already recommendations, collapse the settings by default
    if (this.recommendations.length > 0) {
      this.settingsExpanded = false;
    } else {
      this.settingsExpanded = true;
    }
    
    // Fetch models if API is configured
    if (openAIService.isConfigured()) {
      this.fetchModels().then(() => {
        // Make sure modelOptions is an array before calling some()
        if (Array.isArray(this.modelOptions) && this.modelOptions.length > 0) {
          // Check if the current model is in the fetched models
          const modelExists = this.modelOptions.some(model => model.id === currentModel);
          
          if (modelExists) {
            // If current model exists in options, select it
            this.selectedModel = currentModel;
            this.isCustomModel = false;
          }
        } else {
          console.log('No model options available or not an array');
        }
      });
    }
    
    // We've already loaded the server settings in loadSavedSettings
    // But check storageUtils as a fallback if server settings didn't include these
    if (this.numRecommendations === 5) { // 5 is the default - if it's still default, check storageUtils
      // Restore saved recommendation count from storageUtils (if exists)
      const savedCount = await databaseStorageUtils.get('numRecommendations');
      if (savedCount !== null) {
        const numRecs = parseInt(savedCount, 10);
        // Validate the value is within range
        if (!isNaN(numRecs) && numRecs >= 1 && numRecs <= 50) {
          this.numRecommendations = numRecs;
          console.log('Setting numRecommendations from localStorage:', this.numRecommendations);
        }
      }
    }
    
    // Check for structured output setting in user-specific storage if we didn't get it from server
    const savedStructuredOutput = await databaseStorageUtils.get('useStructuredOutput');
    if (savedStructuredOutput !== null) {
      this.useStructuredOutput = savedStructuredOutput === true || savedStructuredOutput === 'true';
      openAIService.useStructuredOutput = this.useStructuredOutput;
      console.log('Setting useStructuredOutput from user storage:', this.useStructuredOutput);
    }
    
    
    if (this.columnsCount === 2) { // 2 is the default - if it's still default, check storageUtils
      // Restore saved columns count from storageUtils (if exists)
      const savedColumnsCount = await databaseStorageUtils.get('columnsCount');
      if (savedColumnsCount !== null) {
        const columns = parseInt(savedColumnsCount, 10);
        // Validate the value is within range
        if (!isNaN(columns) && columns >= 1 && columns <= 4) {
          this.columnsCount = columns;
          console.log('Setting columnsCount from localStorage:', this.columnsCount);
        }
      }
    }
    
    // Set initial movie mode from props if provided, otherwise use saved preference
    if (this.initialMovieMode) {
      this.isMovieMode = true;
    } else {
      // Restore saved content type preference (movie/TV toggle)
      this.isMovieMode = await databaseStorageUtils.get('isMovieMode', this.isMovieMode);
    }
    
    // Restore saved genre preferences if they exist
    const savedGenres = await databaseStorageUtils.getJSON('tvGenrePreferences');
    if (savedGenres) {
      this.selectedGenres = savedGenres;
    } else {
      // If not found via storageUtils, check legacy localStorage as a fallback
      const legacySavedGenres = localStorage.getItem('tvGenrePreferences');
      if (legacySavedGenres) {
        try {
          this.selectedGenres = JSON.parse(legacySavedGenres);
          // Migrate to new storage
          await databaseStorageUtils.setJSON('tvGenrePreferences', this.selectedGenres);
        } catch (error) {
          console.error('Error parsing legacy saved genres:', error);
          this.selectedGenres = [];
        }
      } else {
        this.selectedGenres = [];
      }
    }
    
    // Load custom vibe from settings
    const settings = await apiService.getSettings();
    if (settings && settings.tvCustomVibe) {
      this.customVibe = settings.tvCustomVibe;
    } else {
      // Fallback to storageUtils if not in server settings
      const savedVibe = await databaseStorageUtils.get('tvCustomVibe');
      if (savedVibe) {
        this.customVibe = savedVibe;
      }
    }
    
    // Restore saved language preference if it exists
    const savedLanguage = await databaseStorageUtils.get('tvLanguagePreference');
    if (savedLanguage) {
      this.selectedLanguage = savedLanguage;
    }
    
    // Restore saved Plex history mode if it exists
    const savedPlexHistoryMode = await databaseStorageUtils.get('plexHistoryMode');
    if (savedPlexHistoryMode) {
      this.plexHistoryMode = savedPlexHistoryMode;
    }
    
    // Restore saved Plex only mode if it exists
    const savedPlexOnlyMode = await databaseStorageUtils.get('plexOnlyMode');
    if (savedPlexOnlyMode !== null) {
      this.plexOnlyMode = savedPlexOnlyMode === 'true' || savedPlexOnlyMode === true;
    }
    
    // Restore saved Plex use history setting
    const savedPlexUseHistory = await databaseStorageUtils.get('plexUseHistory');
    if (savedPlexUseHistory !== null) {
      this.plexUseHistory = savedPlexUseHistory === 'true' || savedPlexUseHistory === true;
    }
    
    // Restore saved Plex custom history days
    const savedPlexCustomHistoryDays = await databaseStorageUtils.get('plexCustomHistoryDays');
    if (savedPlexCustomHistoryDays !== null) {
      this.plexCustomHistoryDays = parseInt(savedPlexCustomHistoryDays, 10);
    }
    
    // Initialize history arrays with empty arrays to prevent issues
    this.previousShowRecommendations = [];
    this.previousMovieRecommendations = [];
    
    try {
      console.log("Loading recommendations from server...");
      
      // Try to load recommendations from server first
      const tvRecsResponse = await apiService.getRecommendations('tv', this.username) || [];
      const movieRecsResponse = await apiService.getRecommendations('movie', this.username) || [];
      
      // When the tvRecsResponse or movieRecsResponse are empty arrays,
      // this means the server cleared the data or doesn't have any data.
      // In this case, we should:
      // 1. Use the empty arrays (don't fall back to storageUtils)
      // 2. Clear storageUtils itself to be consistent with server
      
      console.log("TV recommendations from server:", tvRecsResponse ? tvRecsResponse.length : 0, "items");
      console.log("Movie recommendations from server:", movieRecsResponse ? movieRecsResponse.length : 0, "items");
      
      // Process TV recommendations
      if (Array.isArray(tvRecsResponse)) { // Process even if empty
        if (tvRecsResponse.length > 0 && typeof tvRecsResponse[0] === 'string') {
          // Simple array of titles - this is the history list
          console.log("Loaded TV history from server (string array):", tvRecsResponse.length, "items");
          this.previousShowRecommendations = tvRecsResponse;
        } else if (tvRecsResponse.length > 0) {
          // Full recommendation objects with title property
          console.log("Loaded full TV recommendations from server:", tvRecsResponse.length, "items");
          
          // Store them as full recommendations if we're in TV mode
          if (!this.isMovieMode && tvRecsResponse.some(rec => rec.title && (rec.description || rec.fullText))) {
            this.recommendations = tvRecsResponse;
            databaseStorageUtils.setJSON('currentTVRecommendations', tvRecsResponse); // Save current to storage
          }
          
          // Extract titles for the history
          const extractedTitles = tvRecsResponse
            .map(rec => typeof rec === 'string' ? rec : rec.title)
            .filter(title => !!title);
            
          // Combine with existing history, handling duplicates
          const existingTitles = this.previousShowRecommendations || [];
          this.previousShowRecommendations = [...new Set([...existingTitles, ...extractedTitles])];
        } else {
          // Server returned empty array
          console.log("Server returned empty TV recommendations, clearing local history.");
          this.previousShowRecommendations = [];
        }
        
        // Update currently displayed history if in TV mode
        if (!this.isMovieMode) {
          this.previousRecommendations = [...this.previousShowRecommendations];
        }
        
        // Save history to storageUtils (or clear if empty)
        if (this.previousShowRecommendations.length > 0) {
          databaseStorageUtils.setJSON('previousTVRecommendations', this.previousShowRecommendations);
        } else {
          databaseStorageUtils.remove('previousTVRecommendations');
          databaseStorageUtils.remove('currentTVRecommendations'); // Also clear current if history is empty
        }
      }
      
      // Process movie recommendations
      if (Array.isArray(movieRecsResponse)) { // Process even if empty
        if (movieRecsResponse.length > 0 && typeof movieRecsResponse[0] === 'string') {
          // Simple array of titles - this is the history list
          console.log("Loaded movie history from server (string array):", movieRecsResponse.length, "items");
          this.previousMovieRecommendations = movieRecsResponse;
        } else if (movieRecsResponse.length > 0) {
          // Full recommendation objects with title property
          console.log("Loaded full movie recommendations from server:", movieRecsResponse.length, "items");
          
          // Store them as full recommendations if we're in movie mode
          if (this.isMovieMode && movieRecsResponse.some(rec => rec.title && (rec.description || rec.fullText))) {
            this.recommendations = movieRecsResponse;
            databaseStorageUtils.setJSON('currentMovieRecommendations', movieRecsResponse); // Save current to storage
          }
          
          // Extract titles for the history
          const extractedTitles = movieRecsResponse
            .map(rec => typeof rec === 'string' ? rec : rec.title)
            .filter(title => !!title);
            
          // Combine with existing history, handling duplicates
          const existingTitles = this.previousMovieRecommendations || [];
          this.previousMovieRecommendations = [...new Set([...existingTitles, ...extractedTitles])];
        } else {
          // Server returned empty array
          console.log("Server returned empty movie recommendations, clearing local history.");
          this.previousMovieRecommendations = [];
        }
        
        // Update currently displayed history if in movie mode
        if (this.isMovieMode) {
          this.previousRecommendations = [...this.previousMovieRecommendations];
        }
        
        // Save history to storageUtils (or clear if empty)
        if (this.previousMovieRecommendations.length > 0) {
          databaseStorageUtils.setJSON('previousMovieRecommendations', this.previousMovieRecommendations);
        } else {
          databaseStorageUtils.remove('previousMovieRecommendations');
          databaseStorageUtils.remove('currentMovieRecommendations'); // Also clear current if history is empty
        }
      }
      
      // Debug current history counts
      console.log("After loading from server - TV history count:", this.previousShowRecommendations.length);
      console.log("After loading from server - Movie history count:", this.previousMovieRecommendations.length);
      console.log("Currently displayed history count:", this.previousRecommendations.length);
      
      // Load liked/disliked preferences from server based on current mode
      try {
        const contentType = this.isMovieMode ? 'movie' : 'tv';
        const likedContent = await apiService.getPreferences(contentType, 'liked');
        if (Array.isArray(likedContent)) {
          this.likedRecommendations = likedContent;
          console.log(`Loaded ${likedContent.length} liked ${contentType} preferences from server`);
        }
        
        const dislikedContent = await apiService.getPreferences(contentType, 'disliked');
        if (Array.isArray(dislikedContent)) {
          this.dislikedRecommendations = dislikedContent;
          console.log(`Loaded ${dislikedContent.length} disliked ${contentType} preferences from server`);
        }
      } catch (prefError) {
        console.error("Error loading preferences from server:", prefError);
      }
      
    } catch (error) {
      console.error("Error loading from server, falling back to storageUtils:", error);
      
      // Fall back to loading from storageUtils
      // Load previous TV recommendations from storageUtils
      this.previousShowRecommendations = databaseStorageUtils.getJSON('previousTVRecommendations', []);
      
      // Load previous movie recommendations from storageUtils
      this.previousMovieRecommendations = databaseStorageUtils.getJSON('previousMovieRecommendations', []);
      
      // Also try to load current recommendations
      if (this.isMovieMode) {
        this.recommendations = databaseStorageUtils.getJSON('currentMovieRecommendations', []);
      } else {
        this.recommendations = databaseStorageUtils.getJSON('currentTVRecommendations', []);
      }
      
      // Load liked TV recommendations from storageUtils
      this.likedRecommendations = databaseStorageUtils.getJSON('likedTVRecommendations', []);
      
      // Load disliked TV recommendations from storageUtils
      this.dislikedRecommendations = databaseStorageUtils.getJSON('dislikedTVRecommendations', []);
    }
    
    // Set the active recommendations based on current mode
    if (this.isMovieMode) {
      this.previousRecommendations = [...this.previousMovieRecommendations];
    } else {
      this.previousRecommendations = [...this.previousShowRecommendations];
    }
  },
  
  // Save state when component is destroyed
  beforeUnmount() {
    // Don't save recommendations on unmount - this was causing issues when navigating to History
    // Only save to storageUtils for backup, but don't make server API calls
    try {
      if (this.isMovieMode) {
        databaseStorageUtils.setJSON('previousMovieRecommendations', this.previousMovieRecommendations);
        if (this.recommendations && this.recommendations.length > 0) {
          databaseStorageUtils.setJSON('currentMovieRecommendations', this.recommendations);
        }
      } else {
        databaseStorageUtils.setJSON('previousTVRecommendations', this.previousShowRecommendations);
        if (this.recommendations && this.recommendations.length > 0) {
          databaseStorageUtils.setJSON('currentTVRecommendations', this.recommendations);
        }
      }
      console.log('Saved recommendations to storageUtils only (no server call) before unmount');
    } catch (error) {
      console.error('Error saving recommendations to storageUtils on unmount:', error);
    }
    
    this.saveLikedDislikedLists();
    // Remove event listener
    window.removeEventListener('resize', this.handleResize);
    // Clear any running intervals
    this.stopLoadingMessages();
    
    // We don't reset the app max-width to default here, as it should persist across different views
    // The setting is stored in localStorage and will be reapplied when the user returns
  },
  
  /* eslint-disable */
  // Additional computed properties 
    filteredWatchHistory() {
      console.log('WATCH HISTORY INSPECTION - DIRECT APPROACH:');
      
      // Use the temporary watch history data we created when opening the modal
      if (this._watchHistoryData && this._watchHistoryData.length > 0) {
        console.log('Using pre-populated watch history data:', this._watchHistoryData.length, 'items');
        
        // Apply type filter if needed
        if (this.historyTypeFilter !== 'all') {
          return this._watchHistoryData.filter(item => 
            item.type === this.historyTypeFilter
          );
        }
        
        // Otherwise return all data
        return this._watchHistoryData;
      }
      
      // Initialize collections for all watch history (fallback)
      let allWatchHistory = [];
      
      // If no pre-populated data, try direct access
      console.log('Fallback: Using direct data access');
      if (this.movies && this.movies.length > 0) {
        const moviesWithMetadata = this.movies.map(movie => ({
          ...movie,
          title: movie.title,
          type: 'movie',
          source: 'plex'
        }));
        allWatchHistory = [...allWatchHistory, ...moviesWithMetadata];
      }
      
      // Initialize historyProps to fix reference error
      const historyProps = {
        plexShows: this.recentlyWatchedShows,
        jellyfinShows: this.jellyfinRecentlyWatchedShows,
        tautulliShows: this.tautulliRecentlyWatchedShows,
        traktShows: this.traktRecentlyWatchedShows
      };
      
      // Process TV shows if we're showing shows
      if (this.historyTypeFilter === 'all' || this.historyTypeFilter === 'show') {
        // Try to process each source's show history
        
        // Plex shows
        if ((this.historySourceFilter === 'all' || this.historySourceFilter === 'plex') && 
            historyProps.plexShows) {
          let plexData = historyProps.plexShows;
          
          // Handle possible structure variations
          if (Array.isArray(plexData)) {
            allWatchHistory = [...allWatchHistory, ...plexData.map(item => ({
              ...item, 
              source: 'plex', 
              type: 'show'
            }))];
          } else if (plexData.shows && Array.isArray(plexData.shows)) {
            allWatchHistory = [...allWatchHistory, ...plexData.shows.map(item => ({
              ...item, 
              source: 'plex', 
              type: 'show'
            }))];
          }
        }
        
        // Jellyfin shows
        if ((this.historySourceFilter === 'all' || this.historySourceFilter === 'jellyfin') && 
            historyProps.jellyfinShows) {
          let jellyfinData = historyProps.jellyfinShows;
          
          // Handle possible structure variations
          if (Array.isArray(jellyfinData)) {
            allWatchHistory = [...allWatchHistory, ...jellyfinData.map(item => ({
              ...item, 
              source: 'jellyfin', 
              type: 'show'
            }))];
          } else if (jellyfinData.shows && Array.isArray(jellyfinData.shows)) {
            allWatchHistory = [...allWatchHistory, ...jellyfinData.shows.map(item => ({
              ...item, 
              source: 'jellyfin', 
              type: 'show'
            }))];
          }
        }
        
        // Tautulli shows
        if ((this.historySourceFilter === 'all' || this.historySourceFilter === 'tautulli') && 
            historyProps.tautulliShows) {
          let tautulliData = historyProps.tautulliShows;
          
          // Handle possible structure variations
          if (Array.isArray(tautulliData)) {
            allWatchHistory = [...allWatchHistory, ...tautulliData.map(item => ({
              ...item, 
              source: 'tautulli', 
              type: 'show'
            }))];
          } else if (tautulliData.shows && Array.isArray(tautulliData.shows)) {
            allWatchHistory = [...allWatchHistory, ...tautulliData.shows.map(item => ({
              ...item, 
              source: 'tautulli', 
              type: 'show'
            }))];
          }
        }
        
        // Trakt shows
        if ((this.historySourceFilter === 'all' || this.historySourceFilter === 'trakt') && 
            historyProps.traktShows) {
          let traktData = historyProps.traktShows;
          
          // Handle possible structure variations
          if (Array.isArray(traktData)) {
            allWatchHistory = [...allWatchHistory, ...traktData.map(item => ({
              ...item, 
              source: 'trakt', 
              type: 'show'
            }))];
          } else if (traktData.shows && Array.isArray(traktData.shows)) {
            allWatchHistory = [...allWatchHistory, ...traktData.shows.map(item => ({
              ...item, 
              source: 'trakt', 
              type: 'show'
            }))];
          }
        }
      }
      
      console.log(`Initial combined data: ${allWatchHistory.length} items`);
      
      // Apply text search filter
      if (this.historySearchFilter && this.historySearchFilter.trim()) {
        const searchTerm = this.historySearchFilter.toLowerCase().trim();
        allWatchHistory = allWatchHistory.filter(item => {
          const title = (item.title || item.name || '').toLowerCase();
          return title.includes(searchTerm);
        });
      }
      
      // Sort by most recently watched
      allWatchHistory.sort((a, b) => {
        const dateA = a.lastWatched || a.watched || a.viewedAt || 0;
        const dateB = b.lastWatched || b.watched || b.viewedAt || 0;
        return dateB - dateA; // Compare directly as timestamps
      });
      
      console.log(`Final filtered watch history: ${allWatchHistory.length} items`);
      console.log('Movie items:', allWatchHistory.filter(item => item.type === 'movie').length);
      console.log('TV items:', allWatchHistory.filter(item => item.type === 'show').length);
      if (allWatchHistory.length > 0) {
        console.log('Sample items:', allWatchHistory.slice(0, 2));
        return allWatchHistory;
      }
      
      // Access raw movie data directly without processing
      if (this.recentlyWatchedMovies) {
        console.log('Direct movie data inspection:', this.recentlyWatchedMovies);
        if (Array.isArray(this.recentlyWatchedMovies)) {
          return this.recentlyWatchedMovies.map(item => ({...item, type: 'movie', source: 'plex'}));
        }
      }
      
      // Fallback debug data
      return [
        { title: 'Debug: Real Data Not Found', source: 'debug', type: 'movie', viewedAt: Date.now() },
        { title: 'Debug: Check Console Logs', source: 'debug', type: 'show', viewedAt: Date.now() - 86400000 }
      ];
    },
    
    // Paginated history for the current page
    paginatedHistory() {
      // Ensure filteredWatchHistory exists or use empty array
      const watchHistory = this.filteredWatchHistory || [];
      const startIndex = (this.currentHistoryPage - 1) * this.historyItemsPerPage;
      return watchHistory.slice(startIndex, startIndex + this.historyItemsPerPage);
    },
    
    // Maximum number of pages for pagination
    maxHistoryPages() {
      // Ensure filteredWatchHistory exists or use empty array
      const watchHistory = this.filteredWatchHistory || [];
      return Math.max(1, Math.ceil(watchHistory.length / this.historyItemsPerPage));
    },
    
    // Grid style based on the number of columns
    gridStyle() {
      return {
        display: 'grid',
        gridTemplateColumns: `repeat(${this.columnsCount}, 1fr)`,
        gap: '20px'
      };
    }
  /* eslint-enable */
};
</script>

<style scoped>
.user-recommendation-info {
  text-align: center;
  color: var(--text-color);
  opacity: 0.8;
  font-size: 14px;
  margin: 0 0 10px;
  font-style: italic;
}

/* Tags Styling */
.tags-section {
  flex-direction: column;
  width: 100%;
  margin-top: 15px;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 10px;
  max-height: 150px;
  overflow-y: auto;
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  border-radius: 6px;
  background-color: var(--card-bg-color);
}

.tag-item {
  background-color: rgba(0, 0, 0, 0.1);
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 13px;
}

.tag-checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  cursor: pointer;
}

.new-tag-input {
  display: flex;
  gap: 10px;
  margin-top: 8px;
}

.new-tag-input input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--input-bg-color);
  color: var(--text-color);
}

.tag-add-button {
  padding: 8px 12px;
  background-color: var(--button-primary-bg);
  color: var(--button-primary-text);
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.tag-add-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.recommendations {
  padding: 20px;
  position: relative;
  z-index: 0; /* Lower than navigation */
  box-sizing: border-box;
  overflow: hidden; /* Prevent children from overflowing */
}

.recommendation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.request-button {
  background-color: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.request-button.compact {
  padding: 5px 10px;
  font-size: 12px;
  min-width: 55px;
  justify-content: center;
}

@media (max-width: 600px) {
  .request-button.compact {
    padding: 8px 12px;
    font-size: 14px;
    min-width: 65px;
  }
}

.request-button:hover:not(:disabled) {
  background-color: #1976D2;
}

.request-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.request-button.loading {
  background-color: #64B5F6;
}

.request-button.requested {
  background-color: #4CAF50;
  cursor: default;
}

.small-spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-left-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 8px;
}

.mini-spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-left-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  box-sizing: border-box;
}
/* Added styles for quality and root folder selection */
.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 15px;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 15px;
}

.setting-item label {
  font-weight: 500;
  font-size: 14px;
}

.setting-select {
  width: 100%;
  padding: 10px;
  border-radius: 4px;
  border: 1px solid var(--input-border);
  background-color: var(--input-bg);
  color: var(--text-color);
  font-size: 14px;
}

h2 {
  margin-top: 0;
  margin-bottom: 0;
  color: var(--header-color);
  transition: color var(--transition-speed);
}

.content-type-selector {
  display: flex;
  align-items: center;
  background-color: rgba(67, 97, 238, 0.06);
  border-radius: var(--border-radius-md);
  margin-left: 15px;
  padding: 3px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
  overflow: hidden;
}

.content-type-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 14px;
  border: none;
  background: transparent;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  transition: all 0.2s ease-out;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color);
  position: relative;
  min-width: 120px;
  outline: none;
}

.content-type-button:hover {
  background-color: rgba(67, 97, 238, 0.08);
}

.content-type-button.active {
  background-color: var(--button-primary-bg);
  color: white;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.content-type-button .button-icon {
  font-size: 16px;
  margin-right: 2px;
}

@media (max-width: 600px) {
  .recommendation-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .content-type-selector {
    margin-left: 0;
    margin-top: 10px;
    width: 100%;
  }
  
  .content-type-button {
    flex: 1;
    padding: 10px 8px;
  }
}

.setup-section {
  margin-bottom: 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: var(--card-bg-color);
  padding: 30px;
  border-radius: var(--border-radius-md);
  box-shadow: var(--card-shadow);
  max-width: 600px;
  margin: 0 auto 30px;
  transition: background-color var(--transition-speed), box-shadow var(--transition-speed);
}

.action-button {
  background-color: #4285F4;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  font-size: 16px;
  min-width: 200px;
  transition: all 0.2s ease-out;
}

@media (prefers-color-scheme: dark) {
  .action-button {
    background-color: #3367D6;
  }
}

.discover-card-container {
  position: relative;
  width: 100%;
  max-width: 450px;
  margin: 20px auto;
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.discover-card-container.visible-when-collapsed {
  opacity: 1;
  transform: translateY(0);
}

/* Hide the card when settings are expanded */
.settings-content:not(.collapsed) + .discover-card-container {
  opacity: 0;
  transform: translateY(10px);
  pointer-events: none;
}

.discover-card {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #4285F4;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
  color: white;
  margin: 0 auto;
}

@media (prefers-color-scheme: dark) {
  .discover-card {
    background-color: #3367D6;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
  }
}

.discover-card-inner {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 20px;
  position: relative;
  z-index: 2;
}

.discover-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 25px rgba(66, 133, 244, 0.3);
}

@media (prefers-color-scheme: dark) {
  .discover-card:hover {
    box-shadow: 0 10px 25px rgba(51, 103, 214, 0.3);
  }
}

.discover-card:active {
  transform: translateY(0);
}

.discover-card-loading {
  background-color: #4285F4;
  cursor: default;
  min-height: 140px;
  height: auto;
}

@media (prefers-color-scheme: dark) {
  .discover-card-loading {
    background-color: #3367D6;
  }
}

.discover-icon-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 50px;
  background-color: rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  margin-right: 16px;
}

.discover-icon {
  font-size: 24px;
  z-index: 1;
}

.discover-pulse {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.15);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 0.8;
  }
  70% {
    transform: scale(1.5);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 0;
  }
}

.discover-content {
  flex: 1;
}

.discover-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 4px 0;
}

.discover-subtitle {
  font-size: 14px;
  opacity: 0.9;
  margin: 0;
}

.discover-action {
  margin-left: 16px;
}

.discover-button-circle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background-color: rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  transition: all 0.3s ease;
}

.discover-card:hover .discover-button-circle {
  background-color: rgba(255, 255, 255, 0.25);
}

.discover-arrow-icon {
  transition: transform 0.3s ease;
  stroke: white;
  height: 18px;
  width: 18px;
}

.discover-card:hover .discover-arrow-icon {
  transform: translateX(3px);
}

.discover-card-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0) 100%);
  z-index: 1;
}

.discover-loading-content {
  display: flex;
  align-items: center;
  padding: 20px;
  gap: 16px;
  width: 100%;
  z-index: 3;
}

.discover-loading-spinner {
  position: relative;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border: 3px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  border-top-color: white;
  animation: spinner 1s linear infinite;
}

@keyframes spinner {
  to {
    transform: rotate(360deg);
  }
}

.discover-loading-info {
  flex: 1;
}

.discover-loading-message {
  font-size: 16px;
  font-weight: 500;
  margin: 0 0 8px 0;
}

.discover-loading-counter {
  font-size: 14px;
  opacity: 0.9;
  margin: 0;
  transition: opacity 0.3s ease;
}

.discover-loading-counter.initializing {
  opacity: 0.7;
}

@media (max-width: 600px) {
  .discover-card-inner {
    padding: 15px;
  }
  
  .discover-icon-container {
    width: 40px;
    height: 40px;
    margin-right: 12px;
  }
  
  .discover-icon {
    font-size: 20px;
  }
  
  .discover-title {
    font-size: 16px;
  }
  
  .discover-subtitle {
    font-size: 12px;
  }
  
  .discover-loading-content {
    padding: 15px;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .discover-loading-spinner {
    margin: 0 auto 5px;
  }
  
  .discover-loading-message {
    font-size: 14px;
    text-align: center;
    width: 100%;
  }
  
  .discover-loading-counter {
    font-size: 12px;
    text-align: center;
    width: 100%;
  }
}

@media (max-width: 600px) {
  .discover-button {
    max-width: 100%;
  }
  
  .button-text {
    font-size: 15px;
  }
}

.action-button:hover:not(:disabled) {
  background-color: #3367D6;
  transform: translateY(-1px);
}

@media (prefers-color-scheme: dark) {
  .action-button:hover:not(:disabled) {
    background-color: #2A56C6;
  }
}

.action-button:active:not(:disabled) {
  transform: translateY(0);
  background-color: #2A56C6;
}

@media (prefers-color-scheme: dark) {
  .action-button:active:not(:disabled) {
    background-color: #1A46B6;
  }
}

.action-button:disabled {
  background-color: #E0E0E0;
  cursor: not-allowed;
}

@media (prefers-color-scheme: dark) {
  .action-button:disabled {
    background-color: #707070;
  }
}

.loading {
  text-align: center;
  padding: 15px;
  margin: 15px auto;
  max-width: 1000px;
  background-color: var(--card-bg-color);
  border-radius: 8px;
  box-shadow: var(--card-shadow);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.loading-message {
  margin-bottom: 8px;
  font-size: 16px;
  min-height: 24px;
  transition: opacity 0.4s ease-in-out;
  opacity: 1;
  animation: fadeInOut 10s infinite;
}

.recommendation-counter {
  font-size: 14px;
  color: #4CAF50;
  margin: 5px 0 0 0;
  font-weight: 500;
  background-color: rgba(76, 175, 80, 0.1);
  padding: 4px 12px;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  min-width: 230px;
  text-align: center;
}

.recommendation-counter.initializing {
  color: #2196F3;
  background-color: rgba(33, 150, 243, 0.1);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { opacity: 0.7; }
  50% { opacity: 1; }
  100% { opacity: 0.7; }
}

@keyframes fadeInOut {
  0% { opacity: 0.7; }
  50% { opacity: 1; }
  100% { opacity: 0.7; }
}

.spinner {
  display: inline-block;
  width: 30px;
  height: 30px;
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-left-color: #4CAF50;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  box-sizing: border-box;
}

@media (max-width: 600px) {
  .spinner {
    width: 24px;
    height: 24px;
    border-width: 2px;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error {
  padding: 20px;
  color: #f44336;
  text-align: center;
  background-color: rgba(244, 67, 54, 0.05);
  border-radius: 8px;
  margin: 15px auto;
  max-width: 1000px;
  box-shadow: var(--card-shadow);
}

.error p {
  margin-bottom: 15px;
  font-size: 16px;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5; /* Above mobile menu */
}

.modal-container {
  background-color: var(--card-bg-color);
  border-radius: 8px;
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  transition: all 0.3s ease;
  position: relative;
  z-index: 5;
}

.modal-header {
  padding: 15px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  color: var(--header-color);
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--text-color);
  opacity: 0.7;
}

.modal-close:hover {
  opacity: 1;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  max-height: 500px;
}

.modal-body h4 {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 16px;
  color: var(--text-color);
}

.modal-section {
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border-color);
}

.modal-section:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.modal-warning {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 15px;
  margin-bottom: 15px;
  background-color: rgba(255, 193, 7, 0.1);
  border: 1px solid rgba(255, 193, 7, 0.3);
  border-left: 4px solid #FFC107;
  border-radius: 6px;
}

.warning-icon {
  font-size: 20px;
  line-height: 1;
}

.warning-text {
  font-size: 14px;
  color: var(--text-color);
  line-height: 1.4;
}

.select-all {
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-color);
}

.seasons-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 10px;
}

.season-item {
  padding: 5px;
}

.season-item label {
  display: flex;
  align-items: center;
  cursor: pointer;
  font-size: 14px;
}

.season-item input {
  margin-right: 8px;
}

.episode-count {
  font-size: 12px;
  color: var(--text-color);
  opacity: 0.7;
  margin-left: 5px;
}

.modal-footer {
  padding: 15px 20px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.cancel-button {
  background-color: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-color);
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.confirm-button {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.confirm-button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.no-recommendations {
  text-align: center;
  padding: 30px;
  color: var(--text-color);
  opacity: 0.7;
  transition: color var(--transition-speed);
}

</style>
