<template>
  <div class="history-container">
    <h2>Recommendation History</h2>
    
    <div class="history-controls">
      <div class="view-toggle">
        <button 
          @click="activeView = 'tv'" 
          :class="{ active: activeView === 'tv' }"
          class="toggle-button"
        >
          <span class="toggle-icon">📺</span>
          <span>TV Shows</span>
        </button>
        <button 
          @click="activeView = 'movies'" 
          :class="{ active: activeView === 'movies' }"
          class="toggle-button"
        >
          <span class="toggle-icon">🎬</span>
          <span>Movies</span>
        </button>
        <button 
          @click="activeView = 'combined'" 
          :class="{ active: activeView === 'combined' }"
          class="toggle-button"
        >
          <span class="toggle-icon">🔄</span>
          <span>Combined</span>
        </button>
      </div>
      
      <div class="clear-buttons">
        <button 
          v-if="activeView === 'tv' || activeView === 'combined'" 
          @click="clearTVHistory" 
          class="clear-button"
        >
          <span class="clear-icon">🗑️</span>
          <span>Clear TV History</span>
        </button>
        <button 
          v-if="activeView === 'movies' || activeView === 'combined'" 
          @click="clearMovieHistory" 
          class="clear-button"
        >
          <span class="clear-icon">🗑️</span>
          <span>Clear Movie History</span>
        </button>
      </div>
    </div>
    
    <div class="history-stats">
      <div class="history-stats-row">
        <div v-if="activeView === 'tv' || activeView === 'combined'" class="stat-item">
          <span class="stat-icon">📺</span>
          <span>
            {{ hideExistingContent ? filteredTVRecommendations.length : tvRecommendations.length }} 
            TV shows{{ hideExistingContent ? ' (filtered)' : '' }}
          </span>
        </div>
        <div v-if="activeView === 'movies' || activeView === 'combined'" class="stat-item">
          <span class="stat-icon">🎬</span>
          <span>
            {{ hideExistingContent ? filteredMovieRecommendations.length : movieRecommendations.length }} 
            movies{{ hideExistingContent ? ' (filtered)' : '' }}
          </span>
        </div>
        <div v-if="activeView === 'combined'" class="stat-item total">
          <span class="stat-icon">🔄</span>
          <span>
            {{ hideExistingContent ? 
              (filteredTVRecommendations.length + filteredMovieRecommendations.length) : 
              (tvRecommendations.length + movieRecommendations.length) 
            }} 
            total items{{ hideExistingContent ? ' (filtered)' : '' }}
          </span>
        </div>
      </div>
      
      <div class="history-controls-row">
        <div class="columns-control">
          <label for="columnsAdjuster">Posters per row: {{ columnsCount }}</label>
          <input 
            type="range" 
            id="columnsAdjuster" 
            v-model.number="columnsCount" 
            min="1" 
            max="5" 
            @change="saveColumnsCount"
            class="columns-slider"
          >
        </div>
        
        <div class="filter-controls">
          <label class="filter-label">
            <input 
              type="checkbox" 
              v-model="hideExistingContent" 
              @change="applyFilters"
            >
            Hide items in your library
          </label>
          
          <label class="filter-label">
            <input 
              type="checkbox" 
              v-model="hideLikedContent" 
              @change="applyFilters"
            >
            Hide liked items
          </label>
          
          <label class="filter-label">
            <input 
              type="checkbox" 
              v-model="hideDislikedContent" 
              @change="applyFilters"
            >
            Hide disliked items
          </label>
        </div>
      </div>
    </div>
    
    <div v-if="loading" class="loading-indicator">
      <div class="spinner"></div>
      <span>Loading recommendation history...</span>
    </div>
    
    <div v-else-if="noHistory" class="no-history">
      <p>No recommendation history found. Try getting some recommendations first!</p>
    </div>
    
    <div v-else class="history-list">
      <div v-if="activeView === 'tv' || activeView === 'combined'" class="history-section">
        <h3 v-if="activeView === 'combined'">TV Show Recommendations</h3>
        <div v-if="(hideExistingContent ? filteredTVRecommendations : tvRecommendations).length === 0" class="empty-section">
          <p v-if="tvRecommendations.length === 0">No TV show recommendations in history.</p>
          <p v-else>No TV shows to display with current filter settings.</p>
        </div>
        <div v-else class="recommendation-grid" :style="{ gridTemplateColumns: gridTemplateStyle }">
          <div v-for="(show, index) in hideExistingContent ? filteredTVRecommendations : tvRecommendations" :key="`tv-${index}`" class="recommendation-item">
            <div class="poster-container">
              <div 
                class="poster" 
                :style="getPosterStyle(show, 'tv')"
                :class="{ 'poster-loading': isLoadingPoster(show, 'tv') }"
              >
                <div v-if="isLoadingPoster(show, 'tv')" class="poster-loading-overlay">
                  <div class="poster-loading-spinner"></div>
                </div>
                <div v-if="!posterExists(show, 'tv') && !isLoadingPoster(show, 'tv')" class="poster-retry">
                  <button @click="retryLoadPoster(show, 'tv')" class="retry-button">
                    <span class="retry-icon">🔄</span>
                    <span>Retry</span>
                  </button>
                </div>
              </div>
              <div class="item-title">{{ typeof show === 'string' ? show : String(show || 'Unknown') }}</div>
              <div v-if="tvShowDetails[show]" class="item-description">
                <div v-if="tvShowDetails[show].overview" class="item-overview">
                  {{ truncateText(tvShowDetails[show].overview, 120) }}
                </div>
                <div v-if="tvShowDetails[show].year" class="item-year">
                  {{ tvShowDetails[show].year }}
                </div>
              </div>
              <div v-if="sonarrConfigured" class="item-actions">
                <button 
                  @click="addToSonarr(show)" 
                  :disabled="checkingShowExistence[show] || addingSeries[show]"
                  class="add-button"
                >
                  <span v-if="addingSeries[show]" class="adding-icon">⏳</span>
                  <span v-else-if="checkingShowExistence[show]" class="checking-icon">🔍</span>
                  <span v-else>Add to Sonarr</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div v-if="activeView === 'movies' || activeView === 'combined'" class="history-section">
        <h3 v-if="activeView === 'combined'">Movie Recommendations</h3>
        <div v-if="(hideExistingContent ? filteredMovieRecommendations : movieRecommendations).length === 0" class="empty-section">
          <p v-if="movieRecommendations.length === 0">No movie recommendations in history.</p>
          <p v-else>No movies to display with current filter settings.</p>
        </div>
        <div v-else class="recommendation-grid" :style="{ gridTemplateColumns: gridTemplateStyle }">
          <div v-for="(movie, index) in hideExistingContent ? filteredMovieRecommendations : movieRecommendations" :key="`movie-${index}`" class="recommendation-item">
            <div class="poster-container">
              <div 
                class="poster" 
                :style="getPosterStyle(movie, 'movie')"
                :class="{ 'poster-loading': isLoadingPoster(movie, 'movie') }"
              >
                <div v-if="isLoadingPoster(movie, 'movie')" class="poster-loading-overlay">
                  <div class="poster-loading-spinner"></div>
                </div>
                <div v-if="!posterExists(movie, 'movie') && !isLoadingPoster(movie, 'movie')" class="poster-retry">
                  <button @click="retryLoadPoster(movie, 'movie')" class="retry-button">
                    <span class="retry-icon">🔄</span>
                    <span>Retry</span>
                  </button>
                </div>
              </div>
              <div class="item-title">{{ typeof movie === 'string' ? movie : String(movie || 'Unknown') }}</div>
              <div v-if="movieDetails[movie]" class="item-description">
                <div v-if="movieDetails[movie].overview" class="item-overview">
                  {{ truncateText(movieDetails[movie].overview, 120) }}
                </div>
                <div v-if="movieDetails[movie].year" class="item-year">
                  {{ movieDetails[movie].year }}
                </div>
              </div>
              <div v-if="radarrConfigured" class="item-actions">
                <button 
                  @click="addToRadarr(movie)" 
                  :disabled="checkingMovieExistence[movie] || addingMovie[movie]"
                  class="add-button"
                >
                  <span v-if="addingMovie[movie]" class="adding-icon">⏳</span>
                  <span v-else-if="checkingMovieExistence[movie]" class="checking-icon">🔍</span>
                  <span v-else>Add to Radarr</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Series selection modal -->
    <div v-if="showSeriesModal" class="modal-overlay" @click="closeSeriesModal">
      <div class="series-modal" @click.stop>
        <div class="modal-header">
          <h4>Add "{{ selectedSeries }}" to Sonarr</h4>
          <button class="close-button" @click="closeSeriesModal">&times;</button>
        </div>
        <div class="modal-body">
          <div v-if="seriesLoading" class="loading-series">
            <div class="poster-loading-spinner"></div>
            <p>Loading series information...</p>
          </div>
          <div v-else-if="seriesError" class="series-error">
            <p>{{ seriesError }}</p>
          </div>
          <div v-else-if="!seriesInfo.title" class="series-not-found">
            <p>Series information not found.</p>
          </div>
          <div v-else class="series-details">
            <div class="series-poster">
              <div 
                class="modal-poster" 
                :style="getPosterStyle(selectedSeries, 'tv')"
              ></div>
            </div>
            <div class="series-info">
              <h3>{{ seriesInfo.title }}</h3>
              <div class="series-year" v-if="seriesInfo.year">{{ seriesInfo.year }}</div>
              <div class="existing-warning" v-if="existingSeriesInfo">
                <strong>Note:</strong> This series is already in your library.
              </div>
              
              <div class="seasons-selector" v-if="!existingSeriesInfo && seriesInfo.seasons && seriesInfo.seasons.length > 0">
                <h4>Select Seasons</h4>
                <div class="season-actions">
                  <button @click="selectAllSeasons" class="season-action-button">Select All</button>
                  <button @click="selectNoSeasons" class="season-action-button">Deselect All</button>
                </div>
                <div class="seasons-list">
                  <div v-for="season in seriesInfo.seasons" :key="season.seasonNumber" class="season-item">
                    <label class="checkbox-label">
                      <input 
                        type="checkbox" 
                        v-model="selectedSeasons[season.seasonNumber]"
                      >
                      {{ season.seasonNumber === 0 ? 'Specials' : `Season ${season.seasonNumber}` }}
                    </label>
                  </div>
                </div>
              </div>
              
              <div class="quality-folder-selector" v-if="!existingSeriesInfo">
                <div class="quality-profile">
                  <label for="qualityProfile">Quality Profile:</label>
                  <select id="qualityProfile" v-model="selectedQualityProfile">
                    <option v-for="profile in qualityProfiles" :key="profile.id" :value="profile.id">
                      {{ profile.name }}
                    </option>
                  </select>
                </div>
                
                <div class="root-folder">
                  <label for="rootFolder">Root Folder:</label>
                  <select id="rootFolder" v-model="selectedRootFolder">
                    <option v-for="folder in rootFolders" :key="folder.path" :value="folder.path">
                      {{ folder.path }}
                    </option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeSeriesModal" class="cancel-button">Cancel</button>
          <button 
            v-if="!existingSeriesInfo" 
            @click="confirmAddSeries" 
            :disabled="addingSeries[selectedSeries] || !seriesInfo.title || Object.values(selectedSeasons).every(val => !val)"
            class="add-modal-button"
          >
            {{ addingSeries[selectedSeries] ? 'Adding...' : 'Add Series' }}
          </button>
        </div>
      </div>
    </div>
    
    <!-- Movie selection modal -->
    <div v-if="showMovieModal" class="modal-overlay" @click="closeMovieModal">
      <div class="movie-modal" @click.stop>
        <div class="modal-header">
          <h4>Add "{{ selectedMovie }}" to Radarr</h4>
          <button class="close-button" @click="closeMovieModal">&times;</button>
        </div>
        <div class="modal-body">
          <div v-if="movieLoading" class="loading-movie">
            <div class="poster-loading-spinner"></div>
            <p>Loading movie information...</p>
          </div>
          <div v-else-if="movieError" class="movie-error">
            <p>{{ movieError }}</p>
          </div>
          <div v-else-if="!movieInfo.title" class="movie-not-found">
            <p>Movie information not found.</p>
          </div>
          <div v-else class="movie-details">
            <div class="movie-poster">
              <div 
                class="modal-poster" 
                :style="getPosterStyle(selectedMovie, 'movie')"
              ></div>
            </div>
            <div class="movie-info">
              <h3>{{ movieInfo.title }}</h3>
              <div class="movie-year" v-if="movieInfo.year">{{ movieInfo.year }}</div>
              <div class="existing-warning" v-if="existingMovieInfo">
                <strong>Note:</strong> This movie is already in your library.
              </div>
              
              <div class="quality-folder-selector" v-if="!existingMovieInfo">
                <div class="quality-profile">
                  <label for="movieQualityProfile">Quality Profile:</label>
                  <select id="movieQualityProfile" v-model="selectedMovieQualityProfile">
                    <option v-for="profile in movieQualityProfiles" :key="profile.id" :value="profile.id">
                      {{ profile.name }}
                    </option>
                  </select>
                </div>
                
                <div class="root-folder">
                  <label for="movieRootFolder">Root Folder:</label>
                  <select id="movieRootFolder" v-model="selectedMovieRootFolder">
                    <option v-for="folder in movieRootFolders" :key="folder.path" :value="folder.path">
                      {{ folder.path }}
                    </option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeMovieModal" class="cancel-button">Cancel</button>
          <button 
            v-if="!existingMovieInfo" 
            @click="confirmAddMovie" 
            :disabled="addingMovie[selectedMovie] || !movieInfo.title"
            class="add-modal-button"
          >
            {{ addingMovie[selectedMovie] ? 'Adding...' : 'Add Movie' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import imageService from '../services/ImageService.js';
import sonarrService from '../services/SonarrService.js';
import radarrService from '../services/RadarrService.js';
import apiService from '../services/ApiService.js';

// Debug services availability
console.log('History component - Services loaded:');
console.log('imageService available:', !!imageService);
console.log('sonarrService available:', !!sonarrService);
console.log('radarrService available:', !!radarrService);
console.log('apiService available:', !!apiService);

export default {
  name: 'RecommendationHistory',
  props: {
    sonarrConfigured: {
      type: Boolean,
      default: false
    },
    radarrConfigured: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      activeView: 'combined',
      tvRecommendations: [],
      movieRecommendations: [],
      filteredTVRecommendations: [],
      filteredMovieRecommendations: [],
      loading: true,
      columnsCount: 4,
      posters: new Map(),
      loadingPosters: new Map(),
      hideExistingContent: true,
      hideLikedContent: true,
      hideDislikedContent: true,
      
      // TV/Movie details
      tvShowDetails: {},
      movieDetails: {},
      loadingDetails: {},
      existingTVShows: new Set(),
      existingMovies: new Set(),
      likedTVShows: new Set(),
      dislikedTVShows: new Set(),
      likedMovies: new Set(),
      dislikedMovies: new Set(),
      
      // Sonarr/Radarr status
      checkingShowExistence: {},
      checkingMovieExistence: {},
      addingSeries: {},
      addingMovie: {},
      
      // Series modal
      showSeriesModal: false,
      selectedSeries: '',
      seriesInfo: {},
      existingSeriesInfo: null,
      seriesLoading: false,
      seriesError: null,
      selectedSeasons: {},
      qualityProfiles: [],
      rootFolders: [],
      selectedQualityProfile: null,
      selectedRootFolder: null,
      
      // Movie modal
      showMovieModal: false,
      selectedMovie: '',
      movieInfo: {},
      existingMovieInfo: null,
      movieLoading: false,
      movieError: null,
      movieQualityProfiles: [],
      movieRootFolders: [],
      selectedMovieQualityProfile: null,
      selectedMovieRootFolder: null
    };
  },
  computed: {
    noHistory() {
      if (this.activeView === 'tv') {
        return this.tvRecommendations.length === 0;
      } else if (this.activeView === 'movies') {
        return this.movieRecommendations.length === 0;
      } else {
        return this.tvRecommendations.length === 0 && this.movieRecommendations.length === 0;
      }
    },
    gridTemplateStyle() {
      return `repeat(${this.columnsCount}, 1fr)`;
    }
  },
  created() {
    this.loadRecommendationHistory();
    this.loadColumnsCount();
    this.loadFilterPreferences();
    this.loadLikedDislikedContent();
  },
  async mounted() {
    console.log('History component mounted');
    
    // Make sure services are loaded before proceeding
    await sonarrService.loadCredentials();
    await radarrService.loadCredentials();
    
    // Check if services are configured after loading credentials
    const sonarrReady = sonarrService.isConfigured();
    const radarrReady = radarrService.isConfigured();
    
    console.log('Service configuration status:');
    console.log('- sonarrConfigured prop:', this.sonarrConfigured);
    console.log('- radarrConfigured prop:', this.radarrConfigured);
    console.log('- Sonarr ready after credential load:', sonarrReady);
    console.log('- Radarr ready after credential load:', radarrReady);
    
    // Load library content first to check if items exist in library
    await this.loadLibraryContent();
    
    // Then fetch posters after library content is loaded
    this.fetchAllPosters();
  },
  watch: {
    existingTVShows() {
      this.applyFilters();
    },
    existingMovies() {
      this.applyFilters();
    },
    likedTVShows() {
      this.applyFilters();
    },
    dislikedTVShows() {
      this.applyFilters();
    },
    likedMovies() {
      this.applyFilters();
    },
    dislikedMovies() {
      this.applyFilters();
    },
    async hideExistingContent() {
      this.applyFilters();
      // Save to localStorage
      localStorage.setItem('historyHideExisting', this.hideExistingContent.toString());
      
      // Save to server
      try {
        const settings = await apiService.getSettings();
        settings.historyHideExisting = this.hideExistingContent;
        await apiService.saveSettings(settings);
      } catch (error) {
        console.error('Failed to save historyHideExisting setting to server:', error);
      }
    },
    async hideLikedContent() {
      this.applyFilters();
      // Save to localStorage
      localStorage.setItem('historyHideLiked', this.hideLikedContent.toString());
      
      // Save to server
      try {
        const settings = await apiService.getSettings();
        settings.historyHideLiked = this.hideLikedContent;
        await apiService.saveSettings(settings);
      } catch (error) {
        console.error('Failed to save historyHideLiked setting to server:', error);
      }
    },
    async hideDislikedContent() {
      this.applyFilters();
      // Save to localStorage
      localStorage.setItem('historyHideDisliked', this.hideDislikedContent.toString());
      
      // Save to server
      try {
        const settings = await apiService.getSettings();
        settings.historyHideDisliked = this.hideDislikedContent;
        await apiService.saveSettings(settings);
      } catch (error) {
        console.error('Failed to save historyHideDisliked setting to server:', error);
      }
    },
    tvRecommendations() {
      this.applyFilters();
    },
    movieRecommendations() {
      this.applyFilters();
    }
  },
  methods: {
    // Helper function to normalize and convert objects to strings
    normalizeArray(arr) {
      if (!arr) return [];
      // First filter out null/undefined values
      return arr
        .filter(item => item !== null && item !== undefined)
        .map(item => {
          // If item is an object, get its title property or convert to string
          if (typeof item === 'object') {
            console.log('Found object in recommendations:', item);
            // Try to get title property if it exists
            if (item.title) {
              return item.title;
            } else {
              // Otherwise convert to JSON string
              return JSON.stringify(item);
            }
          }
          // If already a string or other primitive, convert to string
          return String(item || '');
        })
        .filter(str => str.trim() !== ''); // Remove empty strings
    },
    
    async loadRecommendationHistory() {
      this.loading = true;
      
      try {
        // First try to load TV recommendations from server
        const tvRecommendations = await apiService.getRecommendations('tv');
        if (tvRecommendations && tvRecommendations.length > 0) {
          console.log('Loaded TV recommendations from server:', tvRecommendations.length);
          // Normalize recommendations to ensure they're all strings
          this.tvRecommendations = this.normalizeArray(tvRecommendations);
          console.log('Normalized TV recommendations:', this.tvRecommendations);
          // Update localStorage with server data
          localStorage.setItem('previousTVRecommendations', JSON.stringify(this.tvRecommendations));
        } else {
          // Fallback to localStorage if server returns empty
          const tvHistory = localStorage.getItem('previousTVRecommendations');
          if (tvHistory) {
            const parsed = JSON.parse(tvHistory);
            this.tvRecommendations = this.normalizeArray(parsed);
            console.log('Loaded TV recommendations from localStorage:', this.tvRecommendations.length);
            // Save to server for future use
            apiService.saveRecommendations('tv', this.tvRecommendations);
          }
        }
        
        // Then try to load movie recommendations from server
        const movieRecommendations = await apiService.getRecommendations('movie');
        if (movieRecommendations && movieRecommendations.length > 0) {
          console.log('Loaded movie recommendations from server:', movieRecommendations.length);
          // Normalize recommendations to ensure they're all strings
          this.movieRecommendations = this.normalizeArray(movieRecommendations);
          console.log('Normalized movie recommendations:', this.movieRecommendations);
          // Update localStorage with server data
          localStorage.setItem('previousMovieRecommendations', JSON.stringify(this.movieRecommendations));
        } else {
          // Fallback to localStorage if server returns empty
          const movieHistory = localStorage.getItem('previousMovieRecommendations');
          if (movieHistory) {
            const parsed = JSON.parse(movieHistory);
            this.movieRecommendations = this.normalizeArray(parsed);
            console.log('Loaded movie recommendations from localStorage:', this.movieRecommendations.length);
            // Save to server for future use
            apiService.saveRecommendations('movie', this.movieRecommendations);
          }
        }
      } catch (error) {
        console.error('Error loading recommendations from server:', error);
        
        // Fallback to localStorage on error
        const tvHistory = localStorage.getItem('previousTVRecommendations');
        if (tvHistory) {
          const parsed = JSON.parse(tvHistory);
          this.tvRecommendations = this.normalizeArray(parsed);
          console.log('Loaded TV recommendations from localStorage (after server error)');
        }
        
        const movieHistory = localStorage.getItem('previousMovieRecommendations');
        if (movieHistory) {
          const parsed = JSON.parse(movieHistory);
          this.movieRecommendations = this.normalizeArray(parsed);
          console.log('Loaded movie recommendations from localStorage (after server error)');
        }
      } finally {
        this.loading = false;
      }
    },
    
    async loadColumnsCount() {
      try {
        // First try to load from server settings
        const settings = await apiService.getSettings();
        if (settings && settings.historyColumnsCount) {
          console.log('Loaded history columns count from server:', settings.historyColumnsCount);
          this.columnsCount = settings.historyColumnsCount;
          // Update localStorage
          localStorage.setItem('historyColumnsCount', settings.historyColumnsCount.toString());
        } else {
          // Fall back to localStorage
          const savedCount = localStorage.getItem('historyColumnsCount');
          if (savedCount) {
            this.columnsCount = parseInt(savedCount);
            // Save to server for future use
            if (settings) {
              settings.historyColumnsCount = parseInt(savedCount);
              await apiService.saveSettings(settings);
            }
          }
        }
      } catch (error) {
        console.error('Error loading columns count from server:', error);
        // Fall back to localStorage
        const savedCount = localStorage.getItem('historyColumnsCount');
        if (savedCount) {
          this.columnsCount = parseInt(savedCount);
        }
      }
    },
    
    async saveColumnsCount() {
      // Save to localStorage
      localStorage.setItem('historyColumnsCount', this.columnsCount.toString());
      
      // Save to server
      try {
        const settings = await apiService.getSettings();
        settings.historyColumnsCount = this.columnsCount;
        await apiService.saveSettings(settings);
      } catch (error) {
        console.error('Failed to save historyColumnsCount setting to server:', error);
      }
    },
    
    async loadFilterPreferences() {
      try {
        // Try to load filter preferences from server first
        const settings = await apiService.getSettings();
        
        // Load hide existing content preference
        if (settings && settings.historyHideExisting !== undefined) {
          console.log('Loaded historyHideExisting from server:', settings.historyHideExisting);
          this.hideExistingContent = settings.historyHideExisting;
          // Update localStorage
          localStorage.setItem('historyHideExisting', settings.historyHideExisting.toString());
        } else {
          // Fall back to localStorage
          const hideExisting = localStorage.getItem('historyHideExisting');
          if (hideExisting !== null) {
            this.hideExistingContent = hideExisting === 'true';
            // Save to server for future use
            if (settings) {
              settings.historyHideExisting = hideExisting === 'true';
              await apiService.saveSettings(settings);
            }
          }
        }
        
        // Load hide liked content preference
        if (settings && settings.historyHideLiked !== undefined) {
          console.log('Loaded historyHideLiked from server:', settings.historyHideLiked);
          this.hideLikedContent = settings.historyHideLiked;
          // Update localStorage
          localStorage.setItem('historyHideLiked', settings.historyHideLiked.toString());
        } else {
          // Fall back to localStorage
          const hideLiked = localStorage.getItem('historyHideLiked');
          if (hideLiked !== null) {
            this.hideLikedContent = hideLiked === 'true';
            // Save to server for future use
            if (settings) {
              settings.historyHideLiked = hideLiked === 'true';
              await apiService.saveSettings(settings);
            }
          }
        }
        
        // Load hide disliked content preference
        if (settings && settings.historyHideDisliked !== undefined) {
          console.log('Loaded historyHideDisliked from server:', settings.historyHideDisliked);
          this.hideDislikedContent = settings.historyHideDisliked;
          // Update localStorage
          localStorage.setItem('historyHideDisliked', settings.historyHideDisliked.toString());
        } else {
          // Fall back to localStorage
          const hideDisliked = localStorage.getItem('historyHideDisliked');
          if (hideDisliked !== null) {
            this.hideDislikedContent = hideDisliked === 'true';
            // Save to server for future use
            if (settings) {
              settings.historyHideDisliked = hideDisliked === 'true';
              await apiService.saveSettings(settings);
            }
          }
        }
      } catch (error) {
        console.error('Error loading filter preferences from server:', error);
        
        // Fall back to localStorage on error
        // Load existing content preference
        const hideExisting = localStorage.getItem('historyHideExisting');
        if (hideExisting !== null) {
          this.hideExistingContent = hideExisting === 'true';
        }
        
        // Load liked content preference
        const hideLiked = localStorage.getItem('historyHideLiked');
        if (hideLiked !== null) {
          this.hideLikedContent = hideLiked === 'true';
        }
        
        // Load disliked content preference
        const hideDisliked = localStorage.getItem('historyHideDisliked');
        if (hideDisliked !== null) {
          this.hideDislikedContent = hideDisliked === 'true';
        }
      }
    },
    
    async loadLikedDislikedContent() {
      try {
        // Try to load liked/disliked content from server first
        
        // Load liked TV shows
        const likedTVFromServer = await apiService.getPreferences('tv', 'liked');
        if (likedTVFromServer && likedTVFromServer.length > 0) {
          console.log('Loaded liked TV shows from server:', likedTVFromServer.length);
          this.likedTVShows = new Set(likedTVFromServer.map(show => show.toLowerCase()));
          // Update localStorage
          localStorage.setItem('likedTVRecommendations', JSON.stringify(likedTVFromServer));
        } else {
          // Fall back to localStorage
          const likedTV = localStorage.getItem('likedTVRecommendations');
          if (likedTV) {
            const parsed = JSON.parse(likedTV);
            this.likedTVShows = new Set(parsed.map(show => show.toLowerCase()));
            console.log('Loaded liked TV shows from localStorage:', parsed.length);
            // Save to server for future use
            apiService.savePreferences('tv', 'liked', parsed);
          }
        }
        
        // Load disliked TV shows
        const dislikedTVFromServer = await apiService.getPreferences('tv', 'disliked');
        if (dislikedTVFromServer && dislikedTVFromServer.length > 0) {
          console.log('Loaded disliked TV shows from server:', dislikedTVFromServer.length);
          this.dislikedTVShows = new Set(dislikedTVFromServer.map(show => show.toLowerCase()));
          // Update localStorage
          localStorage.setItem('dislikedTVRecommendations', JSON.stringify(dislikedTVFromServer));
        } else {
          // Fall back to localStorage
          const dislikedTV = localStorage.getItem('dislikedTVRecommendations');
          if (dislikedTV) {
            const parsed = JSON.parse(dislikedTV);
            this.dislikedTVShows = new Set(parsed.map(show => show.toLowerCase()));
            console.log('Loaded disliked TV shows from localStorage:', parsed.length);
            // Save to server for future use
            apiService.savePreferences('tv', 'disliked', parsed);
          }
        }
        
        // Load liked movies
        const likedMoviesFromServer = await apiService.getPreferences('movie', 'liked');
        if (likedMoviesFromServer && likedMoviesFromServer.length > 0) {
          console.log('Loaded liked movies from server:', likedMoviesFromServer.length);
          this.likedMovies = new Set(likedMoviesFromServer.map(movie => movie.toLowerCase()));
          // Update localStorage
          localStorage.setItem('likedMovieRecommendations', JSON.stringify(likedMoviesFromServer));
        } else {
          // Fall back to localStorage
          const likedMovies = localStorage.getItem('likedMovieRecommendations');
          if (likedMovies) {
            const parsed = JSON.parse(likedMovies);
            this.likedMovies = new Set(parsed.map(movie => movie.toLowerCase()));
            console.log('Loaded liked movies from localStorage:', parsed.length);
            // Save to server for future use
            apiService.savePreferences('movie', 'liked', parsed);
          }
        }
        
        // Load disliked movies
        const dislikedMoviesFromServer = await apiService.getPreferences('movie', 'disliked');
        if (dislikedMoviesFromServer && dislikedMoviesFromServer.length > 0) {
          console.log('Loaded disliked movies from server:', dislikedMoviesFromServer.length);
          this.dislikedMovies = new Set(dislikedMoviesFromServer.map(movie => movie.toLowerCase()));
          // Update localStorage
          localStorage.setItem('dislikedMovieRecommendations', JSON.stringify(dislikedMoviesFromServer));
        } else {
          // Fall back to localStorage
          const dislikedMovies = localStorage.getItem('dislikedMovieRecommendations');
          if (dislikedMovies) {
            const parsed = JSON.parse(dislikedMovies);
            this.dislikedMovies = new Set(parsed.map(movie => movie.toLowerCase()));
            console.log('Loaded disliked movies from localStorage:', parsed.length);
            // Save to server for future use
            apiService.savePreferences('movie', 'disliked', parsed);
          }
        }
      } catch (error) {
        console.error('Error loading liked/disliked content from server:', error);
        
        // Fall back to localStorage on error
        const likedTV = localStorage.getItem('likedTVRecommendations');
        if (likedTV) {
          this.likedTVShows = new Set(JSON.parse(likedTV).map(show => show.toLowerCase()));
        }
        
        const dislikedTV = localStorage.getItem('dislikedTVRecommendations');
        if (dislikedTV) {
          this.dislikedTVShows = new Set(JSON.parse(dislikedTV).map(show => show.toLowerCase()));
        }
        
        const likedMovies = localStorage.getItem('likedMovieRecommendations');
        if (likedMovies) {
          this.likedMovies = new Set(JSON.parse(likedMovies).map(movie => movie.toLowerCase()));
        }
        
        const dislikedMovies = localStorage.getItem('dislikedMovieRecommendations');
        if (dislikedMovies) {
          this.dislikedMovies = new Set(JSON.parse(dislikedMovies).map(movie => movie.toLowerCase()));
        }
      }
    },
    
    toggleHideExisting() {
      this.hideExistingContent = !this.hideExistingContent;
    },
    
    toggleHideLiked() {
      this.hideLikedContent = !this.hideLikedContent;
    },
    
    toggleHideDisliked() {
      this.hideDislikedContent = !this.hideDislikedContent;
    },
    
    async loadLibraryContent() {
      console.log('Loading library content in History component');
      
      if (this.sonarrConfigured) {
        console.log('Loading Sonarr library content');
        await this.loadSonarrLibrary();
      } else {
        console.log('Skipping Sonarr library load - not configured');
      }
      
      if (this.radarrConfigured) {
        console.log('Loading Radarr library content');
        await this.loadRadarrLibrary();
      } else {
        console.log('Skipping Radarr library load - not configured');
      }
      
      console.log('Library content loaded, fetching details');
      this.fetchAllDetails();
    },
    
    async loadSonarrLibrary() {
      try {
        // Check if Sonarr is actually configured
        if (!sonarrService.isConfigured()) {
          console.warn('Sonarr service is not properly configured with API key and URL');
          return;
        }
        
        console.log('Requesting series list from Sonarr');
        const series = await sonarrService.getSeries();
        console.log(`Received ${series.length} series from Sonarr`);
        
        const titles = new Set(series.map(show => show.title.toLowerCase()));
        this.existingTVShows = titles;
      } catch (error) {
        console.error('Error loading Sonarr library:', error);
      }
    },
    
    async loadRadarrLibrary() {
      try {
        // Check if Radarr is actually configured
        if (!radarrService.isConfigured()) {
          console.warn('Radarr service is not properly configured with API key and URL');
          return;
        }
        
        console.log('Requesting movie list from Radarr');
        const movies = await radarrService.getMovies();
        console.log(`Received ${movies.length} movies from Radarr`);
        
        const titles = new Set(movies.map(movie => movie.title.toLowerCase()));
        this.existingMovies = titles;
      } catch (error) {
        console.error('Error loading Radarr library:', error);
      }
    },
    
    applyFilters() {
      // Filter TV recommendations
      let filteredTV = [...this.tvRecommendations];
      
      // Apply existing filter
      if (this.hideExistingContent && this.existingTVShows.size > 0) {
        filteredTV = filteredTV.filter(show => {
          if (show === null || show === undefined) return true; // Skip null/undefined
          const showStr = typeof show === 'string' ? show : String(show);
          return !this.existingTVShows.has(showStr.toLowerCase());
        });
      }
      
      // Apply liked filter
      if (this.hideLikedContent && this.likedTVShows.size > 0) {
        filteredTV = filteredTV.filter(show => {
          if (show === null || show === undefined) return true; // Skip null/undefined
          const showStr = typeof show === 'string' ? show : String(show);
          return !this.likedTVShows.has(showStr.toLowerCase());
        });
      }
      
      // Apply disliked filter
      if (this.hideDislikedContent && this.dislikedTVShows.size > 0) {
        filteredTV = filteredTV.filter(show => {
          if (show === null || show === undefined) return true; // Skip null/undefined
          const showStr = typeof show === 'string' ? show : String(show);
          return !this.dislikedTVShows.has(showStr.toLowerCase());
        });
      }
      
      this.filteredTVRecommendations = filteredTV;
      
      // Filter movie recommendations
      let filteredMovies = [...this.movieRecommendations];
      
      // Apply existing filter
      if (this.hideExistingContent && this.existingMovies.size > 0) {
        filteredMovies = filteredMovies.filter(movie => {
          if (movie === null || movie === undefined) return true; // Skip null/undefined
          const movieStr = typeof movie === 'string' ? movie : String(movie);
          return !this.existingMovies.has(movieStr.toLowerCase());
        });
      }
      
      // Apply liked filter
      if (this.hideLikedContent && this.likedMovies.size > 0) {
        filteredMovies = filteredMovies.filter(movie => {
          if (movie === null || movie === undefined) return true; // Skip null/undefined
          const movieStr = typeof movie === 'string' ? movie : String(movie);
          return !this.likedMovies.has(movieStr.toLowerCase());
        });
      }
      
      // Apply disliked filter
      if (this.hideDislikedContent && this.dislikedMovies.size > 0) {
        filteredMovies = filteredMovies.filter(movie => {
          if (movie === null || movie === undefined) return true; // Skip null/undefined
          const movieStr = typeof movie === 'string' ? movie : String(movie);
          return !this.dislikedMovies.has(movieStr.toLowerCase());
        });
      }
      
      this.filteredMovieRecommendations = filteredMovies;
    },
    
    async clearTVHistory() {
      if (confirm('Are you sure you want to clear your TV show recommendation history?')) {
        // Clear from localStorage
        localStorage.removeItem('previousTVRecommendations');
        this.tvRecommendations = [];
        
        // Clear from server
        try {
          await apiService.saveRecommendations('tv', []);
          console.log('Cleared TV recommendations from server');
        } catch (error) {
          console.error('Failed to clear TV recommendations from server:', error);
        }
      }
    },
    
    async clearMovieHistory() {
      if (confirm('Are you sure you want to clear your movie recommendation history?')) {
        // Clear from localStorage
        localStorage.removeItem('previousMovieRecommendations');
        this.movieRecommendations = [];
        
        // Clear from server
        try {
          await apiService.saveRecommendations('movie', []);
          console.log('Cleared movie recommendations from server');
        } catch (error) {
          console.error('Failed to clear movie recommendations from server:', error);
        }
      }
    },
    
    // Poster management
    async fetchAllPosters() {
      console.log('fetchAllPosters called in History component');
      console.log('TV recommendations:', this.tvRecommendations.length);
      console.log('Movie recommendations:', this.movieRecommendations.length);
      console.log('Sonarr configured:', this.sonarrConfigured);
      console.log('Radarr configured:', this.radarrConfigured);
      
      // Check if Sonarr/Radarr are configured (needed for poster fetching)
      if (!this.sonarrConfigured && !this.radarrConfigured) {
        console.warn('Neither Sonarr nor Radarr are configured - posters cannot be fetched');
        return;
      }
      
      // TV show posters - only try if Sonarr is configured
      if (this.sonarrConfigured) {
        for (const show of this.tvRecommendations) {
          if (show !== null && show !== undefined) {
            console.log(`Fetching poster for TV show: ${show}`);
            await this.fetchPoster(show, 'tv');
          }
        }
      } else {
        console.warn('Sonarr not configured - skipping TV poster fetching');
      }
      
      // Movie posters - only try if Radarr is configured
      if (this.radarrConfigured) {
        for (const movie of this.movieRecommendations) {
          if (movie !== null && movie !== undefined) {
            console.log(`Fetching poster for movie: ${movie}`);
            await this.fetchPoster(movie, 'movie');
          }
        }
      } else {
        console.warn('Radarr not configured - skipping movie poster fetching');
      }
    },
    
    async fetchPoster(title, type) {
      // Handle null/undefined
      if (title === null || title === undefined) {
        console.warn(`Attempted to fetch poster for null/undefined ${type} title`);
        return;
      }
      
      // Convert to string if it's not already
      if (typeof title !== 'string') {
        title = String(title);
      }
      
      const key = type === 'tv' ? title : `movie_${title}`;
      
      // If already loading, skip
      if (this.loadingPosters.get(key)) {
        return;
      }
      
      // If already loaded, skip
      if (this.posters.has(key)) {
        return;
      }
      
      // Mark as loading
      this.loadingPosters.set(key, true);
      
      try {
        let posterUrl;
        console.log(`Fetching ${type} poster for "${title}" via imageService`);
        if (type === 'tv') {
          posterUrl = await imageService.getPosterForShow(title);
          console.log(`TV Poster result for "${title}":`, posterUrl ? 'Found poster' : 'No poster found');
        } else {
          posterUrl = await imageService.getPosterForMovie(title);
          console.log(`Movie Poster result for "${title}":`, posterUrl ? 'Found poster' : 'No poster found');
        }
        
        // Store the poster URL or fallback if not found
        if (posterUrl) {
          // Check if it's a proxied URL
          if (posterUrl.includes('/api/image-proxy?url=')) {
            // Try to extract the original URL as fallback in case proxy fails
            try {
              const originalUrl = decodeURIComponent(posterUrl.split('url=')[1]);
              console.log(`Using direct URL for ${type} "${title}": ${originalUrl}`);
              // Set the original URL instead of the proxy
              this.posters.set(key, originalUrl);
            } catch (err) {
              console.log(`Could not extract original URL, using proxy: ${posterUrl}`);
              this.posters.set(key, posterUrl);
            }
          } else {
            this.posters.set(key, posterUrl);
          }
        } else {
          // Set fallback image when no poster is found
          const fallbackUrl = imageService.getFallbackImageUrl(title);
          this.posters.set(key, fallbackUrl);
          console.log(`Using fallback image for ${type} "${title}"`);
        }
      } catch (error) {
        console.error(`Error fetching poster for ${type} "${title}":`, error);
        // Use fallback image on error
        const fallbackUrl = imageService.getFallbackImageUrl(title);
        this.posters.set(key, fallbackUrl);
      } finally {
        this.loadingPosters.set(key, false);
      }
    },
    
    getPosterStyle(title, type) {
      // Handle null/undefined
      if (title === null || title === undefined) {
        return {
          backgroundColor: '#333'
        };
      }
      
      // Convert to string if it's not already
      if (typeof title !== 'string') {
        title = String(title);
      }
      
      const key = type === 'tv' ? title : `movie_${title}`;
      
      // If poster is loading, return empty
      if (this.loadingPosters.get(key)) {
        return {};
      }
      
      // If we have a poster URL, use it
      const posterUrl = this.posters.get(key);
      if (posterUrl) {
        return {
          backgroundImage: `url("${posterUrl}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        };
      }
      
      // Otherwise, use fallback
      const fallbackUrl = imageService.getFallbackImageUrl(title);
      return {
        backgroundImage: `url("${fallbackUrl}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      };
    },
    
    isLoadingPoster(title, type) {
      // Handle null/undefined
      if (title === null || title === undefined) {
        return false;
      }
      
      // Convert to string if it's not already
      if (typeof title !== 'string') {
        title = String(title);
      }
      
      const key = type === 'tv' ? title : `movie_${title}`;
      return !!this.loadingPosters.get(key);
    },
    
    posterExists(title, type) {
      // Handle null/undefined
      if (title === null || title === undefined) {
        return false;
      }
      
      // Convert to string if it's not already
      if (typeof title !== 'string') {
        title = String(title);
      }
      
      const key = type === 'tv' ? title : `movie_${title}`;
      return !!this.posters.get(key);
    },
    
    async retryLoadPoster(title, type) {
      // Handle null/undefined
      if (title === null || title === undefined) {
        console.warn(`Attempted to retry load poster for null/undefined ${type} title`);
        return;
      }
      
      // Convert to string if it's not already
      if (typeof title !== 'string') {
        title = String(title);
      }
      
      const key = type === 'tv' ? title : `movie_${title}`;
      
      // Remove existing poster and mark as loading
      this.posters.delete(key);
      this.loadingPosters.set(key, true);
      
      // Fetch with skipCache=true
      try {
        let posterUrl;
        console.log(`Retrying ${type} poster for "${title}" via imageService with skipCache=true`);
        if (type === 'tv') {
          posterUrl = await imageService.getPosterForShow(title, true);
        } else {
          posterUrl = await imageService.getPosterForMovie(title, true);
        }
        
        // Store the poster URL or fallback if not found
        if (posterUrl) {
          // Check if it's a proxied URL
          if (posterUrl.includes('/api/image-proxy?url=')) {
            // Try to extract the original URL as fallback in case proxy fails
            try {
              const originalUrl = decodeURIComponent(posterUrl.split('url=')[1]);
              console.log(`Using direct URL after retry for ${type} "${title}": ${originalUrl}`);
              // Set the original URL instead of the proxy
              this.posters.set(key, originalUrl);
            } catch (err) {
              console.log(`Could not extract original URL after retry, using proxy: ${posterUrl}`);
              this.posters.set(key, posterUrl);
            }
          } else {
            this.posters.set(key, posterUrl);
          }
        } else {
          // Set fallback image when no poster is found
          const fallbackUrl = imageService.getFallbackImageUrl(title);
          this.posters.set(key, fallbackUrl);
          console.log(`Using fallback image for ${type} "${title}" after retry`);
        }
      } catch (error) {
        console.error(`Error retrying poster for ${type} "${title}":`, error);
        // Use fallback image on error
        const fallbackUrl = imageService.getFallbackImageUrl(title);
        this.posters.set(key, fallbackUrl);
      } finally {
        this.loadingPosters.set(key, false);
      }
    },
    
    // Fetch all details automatically
    async fetchAllDetails() {
      this.fetchAllTVDetails();
      this.fetchAllMovieDetails();
    },
    
    async fetchAllTVDetails() {
      if (!this.sonarrConfigured) return;
      
      const titlesToFetch = this.hideExistingContent ? this.filteredTVRecommendations : this.tvRecommendations;
      
      for (const title of titlesToFetch) {
        // Skip null/undefined titles
        if (title === null || title === undefined) continue;
        
        // Convert to string if needed
        const titleStr = typeof title === 'string' ? title : String(title);
        
        // Only fetch if not already loaded
        if (!this.tvShowDetails[titleStr] && !this.loadingDetails[titleStr]) {
          // Fetch details with a slight delay to avoid overwhelming the API
          await this.fetchTVShowDetails(titleStr);
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
    },
    
    async fetchAllMovieDetails() {
      if (!this.radarrConfigured) return;
      
      const titlesToFetch = this.hideExistingContent ? this.filteredMovieRecommendations : this.movieRecommendations;
      
      for (const title of titlesToFetch) {
        // Skip null/undefined titles
        if (title === null || title === undefined) continue;
        
        // Convert to string if needed
        const titleStr = typeof title === 'string' ? title : String(title);
        
        // Only fetch if not already loaded
        if (!this.movieDetails[titleStr] && !this.loadingDetails[titleStr]) {
          // Fetch details with a slight delay to avoid overwhelming the API
          await this.fetchMovieDetails(titleStr);
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
    },
    
    async fetchTVShowDetails(title) {
      // Handle null/undefined
      if (title === null || title === undefined) {
        console.warn('Attempted to fetch TV details for null/undefined title');
        return;
      }
      
      // Convert to string if it's not already
      if (typeof title !== 'string') {
        title = String(title);
      }
      
      // If already loading, skip
      if (this.loadingDetails[title]) return;
      
      // Mark as loading
      this.loadingDetails = { ...this.loadingDetails, [title]: true };
      
      try {
        // Get series details from Sonarr
        const seriesInfo = await sonarrService.findSeriesByTitle(title);
        if (seriesInfo) {
          this.tvShowDetails = {
            ...this.tvShowDetails,
            [title]: {
              overview: seriesInfo.overview || null,
              year: seriesInfo.year || null,
              network: seriesInfo.network || null,
              status: seriesInfo.status || null
            }
          };
        }
      } catch (error) {
        console.error(`Error fetching TV show details for "${title}":`, error);
      } finally {
        this.loadingDetails = { ...this.loadingDetails, [title]: false };
      }
    },
    
    async fetchMovieDetails(title) {
      // Handle null/undefined
      if (title === null || title === undefined) {
        console.warn('Attempted to fetch movie details for null/undefined title');
        return;
      }
      
      // Convert to string if it's not already
      if (typeof title !== 'string') {
        title = String(title);
      }
      
      // If already loading, skip
      if (this.loadingDetails[title]) return;
      
      // Mark as loading
      this.loadingDetails = { ...this.loadingDetails, [title]: true };
      
      try {
        // Get movie details from Radarr
        const movieInfo = await radarrService.findMovieByTitle(title);
        if (movieInfo) {
          this.movieDetails = {
            ...this.movieDetails,
            [title]: {
              overview: movieInfo.overview || null,
              year: movieInfo.year || null,
              studio: movieInfo.studio || null,
              runtime: movieInfo.runtime || null
            }
          };
        }
      } catch (error) {
        console.error(`Error fetching movie details for "${title}":`, error);
      } finally {
        this.loadingDetails = { ...this.loadingDetails, [title]: false };
      }
    },
    
    // Helper to truncate text
    truncateText(text, maxLength) {
      if (!text) return '';
      if (text.length <= maxLength) return text;
      return text.slice(0, maxLength) + '...';
    },
    
    // Sonarr integration
    async addToSonarr(title) {
      this.selectedSeries = title;
      this.showSeriesModal = true;
      this.seriesLoading = true;
      this.existingSeriesInfo = null;
      this.seriesInfo = {};
      this.seriesError = null;
      this.selectedSeasons = {};
      this.qualityProfiles = [];
      this.rootFolders = [];
      
      // Mark as checking for existence
      this.checkingShowExistence = { ...this.checkingShowExistence, [title]: true };
      
      try {
        // First check if the series already exists
        const existingSeries = await sonarrService.findExistingSeriesByTitle(title);
        if (existingSeries) {
          this.existingSeriesInfo = existingSeries;
          console.log('Series already exists:', existingSeries);
        }
        
        // Get series information from Sonarr
        const seriesLookup = await sonarrService.findSeriesByTitle(title);
        if (seriesLookup) {
          this.seriesInfo = seriesLookup;
          
          // Initialize seasons with all selected
          if (seriesLookup.seasons) {
            const updatedSeasons = { ...this.selectedSeasons };
            seriesLookup.seasons.forEach(season => {
              updatedSeasons[season.seasonNumber] = true;
            });
            this.selectedSeasons = updatedSeasons;
          }
          
          // Get quality profiles and root folders
          this.qualityProfiles = await sonarrService.getQualityProfiles();
          this.rootFolders = await sonarrService.getRootFolders();
          
          // Default selections
          if (this.qualityProfiles.length > 0) {
            this.selectedQualityProfile = this.qualityProfiles[0].id;
          }
          
          if (this.rootFolders.length > 0) {
            this.selectedRootFolder = this.rootFolders[0].path;
          }
        } else {
          this.seriesError = `Could not find information for "${title}"`;
        }
      } catch (error) {
        console.error('Error getting series information:', error);
        this.seriesError = `Error: ${error.message || 'Failed to get series information'}`;
      } finally {
        this.seriesLoading = false;
        this.checkingShowExistence = { ...this.checkingShowExistence, [title]: false };
      }
    },
    
    closeSeriesModal() {
      this.showSeriesModal = false;
    },
    
    selectAllSeasons() {
      if (this.seriesInfo.seasons) {
        const updatedSeasons = { ...this.selectedSeasons };
        this.seriesInfo.seasons.forEach(season => {
          updatedSeasons[season.seasonNumber] = true;
        });
        this.selectedSeasons = updatedSeasons;
      }
    },
    
    selectNoSeasons() {
      if (this.seriesInfo.seasons) {
        const updatedSeasons = { ...this.selectedSeasons };
        this.seriesInfo.seasons.forEach(season => {
          updatedSeasons[season.seasonNumber] = false;
        });
        this.selectedSeasons = updatedSeasons;
      }
    },
    
    async confirmAddSeries() {
      if (!this.selectedSeries || !this.seriesInfo) return;
      
      // Mark as adding
      this.addingSeries = { ...this.addingSeries, [this.selectedSeries]: true };
      
      try {
        // Convert selectedSeasons to array format expected by SonarrService
        const seasons = Object.entries(this.selectedSeasons)
          .filter(([, selected]) => selected)
          .map(([seasonNumber]) => parseInt(seasonNumber));
        
        // Add the series
        const result = await sonarrService.addSeries(
          this.selectedSeries,
          seasons,
          this.selectedQualityProfile,
          this.selectedRootFolder
        );
        
        if (result && result.id) {
          // Update existing TV shows set and filters
          const seriesTitle = this.selectedSeries.toLowerCase();
          this.existingTVShows = new Set([...this.existingTVShows, seriesTitle]);
          this.applyFilters();
          
          // Close modal
          this.closeSeriesModal();
          
          // Load Sonarr library to refresh all items
          this.loadSonarrLibrary();
        } else {
          throw new Error('Failed to add series. Please check Sonarr logs.');
        }
      } catch (error) {
        console.error('Error adding series:', error);
        // Show error message in modal instead of alert
        this.seriesError = `Error adding series: ${error.message || 'Unknown error'}`;
      } finally {
        this.addingSeries = { ...this.addingSeries, [this.selectedSeries]: false };
      }
    },
    
    // Radarr integration
    async addToRadarr(title) {
      this.selectedMovie = title;
      this.showMovieModal = true;
      this.movieLoading = true;
      this.existingMovieInfo = null;
      this.movieInfo = {};
      this.movieError = null;
      this.movieQualityProfiles = [];
      this.movieRootFolders = [];
      
      // Mark as checking for existence
      this.checkingMovieExistence = { ...this.checkingMovieExistence, [title]: true };
      
      try {
        // First check if the movie already exists
        const existingMovie = await radarrService.findExistingMovieByTitle(title);
        if (existingMovie) {
          this.existingMovieInfo = existingMovie;
          console.log('Movie already exists:', existingMovie);
        }
        
        // Get movie information from Radarr
        const movieLookup = await radarrService.findMovieByTitle(title);
        if (movieLookup) {
          this.movieInfo = movieLookup;
          
          // Get quality profiles and root folders
          this.movieQualityProfiles = await radarrService.getQualityProfiles();
          this.movieRootFolders = await radarrService.getRootFolders();
          
          // Default selections
          if (this.movieQualityProfiles.length > 0) {
            this.selectedMovieQualityProfile = this.movieQualityProfiles[0].id;
          }
          
          if (this.movieRootFolders.length > 0) {
            this.selectedMovieRootFolder = this.movieRootFolders[0].path;
          }
        } else {
          this.movieError = `Could not find information for "${title}"`;
        }
      } catch (error) {
        console.error('Error getting movie information:', error);
        this.movieError = `Error: ${error.message || 'Failed to get movie information'}`;
      } finally {
        this.movieLoading = false;
        this.checkingMovieExistence = { ...this.checkingMovieExistence, [title]: false };
      }
    },
    
    closeMovieModal() {
      this.showMovieModal = false;
    },
    
    async confirmAddMovie() {
      if (!this.selectedMovie || !this.movieInfo) return;
      
      // Mark as adding
      this.addingMovie = { ...this.addingMovie, [this.selectedMovie]: true };
      
      try {
        // Add the movie
        const result = await radarrService.addMovie(
          this.selectedMovie,
          this.selectedMovieQualityProfile,
          this.selectedMovieRootFolder
        );
        
        if (result && result.id) {
          // Update existing movies set and filters
          const movieTitle = this.selectedMovie.toLowerCase();
          this.existingMovies = new Set([...this.existingMovies, movieTitle]);
          this.applyFilters();
          
          // Close modal
          this.closeMovieModal();
          
          // Load Radarr library to refresh all items
          this.loadRadarrLibrary();
        } else {
          throw new Error('Failed to add movie. Please check Radarr logs.');
        }
      } catch (error) {
        console.error('Error adding movie:', error);
        // Show error message in modal instead of alert
        this.movieError = `Error adding movie: ${error.message || 'Unknown error'}`;
      } finally {
        this.addingMovie = { ...this.addingMovie, [this.selectedMovie]: false };
      }
    }
  }
};
</script>

<style scoped>
.history-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

h2 {
  margin-bottom: 20px;
  color: var(--header-color);
  font-size: 24px;
  text-align: center;
}

.history-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 15px;
}

.view-toggle {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.toggle-button, .clear-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 15px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid var(--border-color);
  background-color: var(--card-bg-color);
  color: var(--text-color);
}

.toggle-button:hover, .clear-button:hover {
  border-color: var(--button-primary-bg);
}

.toggle-button.active {
  background-color: var(--button-primary-bg);
  color: var(--button-primary-text);
  border-color: var(--button-primary-bg);
}

.toggle-icon, .clear-icon, .stat-icon, .item-icon {
  font-size: 16px;
}

.clear-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.clear-button {
  background-color: rgba(255, 59, 48, 0.1);
  border-color: rgba(255, 59, 48, 0.3);
  color: var(--text-color);
}

.clear-button:hover {
  background-color: rgba(255, 59, 48, 0.2);
  border-color: rgba(255, 59, 48, 0.5);
}

.history-stats {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 20px;
  padding: 15px;
  background-color: var(--card-bg-color);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.history-stats-row, .history-controls-row {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
}

.history-controls-row {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  gap: 20px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  padding: 5px 10px;
  border-radius: 15px;
  background-color: rgba(76, 175, 80, 0.1);
}

.stat-item.total {
  background-color: rgba(33, 150, 243, 0.1);
  font-weight: bold;
}

.columns-control {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.filter-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.columns-control label, .filter-label {
  font-size: 14px;
  color: var(--text-color);
}

.filter-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
}

.columns-slider {
  width: 100%;
  height: 6px;
  -webkit-appearance: none;
  background: var(--border-color);
  outline: none;
  border-radius: 3px;
  cursor: pointer;
}

.columns-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--button-primary-bg);
  cursor: pointer;
}

.columns-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--button-primary-bg);
  cursor: pointer;
  border: none;
}

.loading-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 50px 0;
  gap: 15px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(76, 175, 80, 0.2);
  border-left-color: var(--button-primary-bg);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.no-history, .empty-section {
  text-align: center;
  padding: 40px 0;
  color: var(--text-color);
  opacity: 0.7;
}

.history-section {
  margin-bottom: 30px;
}

.history-section h3 {
  margin-bottom: 15px;
  font-size: 18px;
  color: var(--header-color);
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 10px;
}

.recommendation-grid {
  display: grid;
  gap: 10px;
}

.recommendation-item {
  background-color: var(--card-bg-color);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  transition: all 0.2s ease;
  overflow: hidden;
  height: 100%;
  max-width: 100%;
}

.recommendation-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  border-color: var(--button-primary-bg);
}

.poster-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.poster {
  position: relative;
  width: 100%;
  padding-bottom: 150%; /* 2:3 aspect ratio for movie posters */
  background-color: var(--card-bg-color);
  transition: all 0.2s ease;
}

.poster-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.5);
}

.poster-loading-spinner {
  width: 30px;
  height: 30px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.poster-retry {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.6);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.poster:hover .poster-retry {
  opacity: 1;
}


.retry-button {
  background-color: rgba(76, 175, 80, 0.8);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: background-color 0.2s ease;
}

.retry-button:hover {
  background-color: rgba(76, 175, 80, 1);
}

.retry-icon {
  font-size: 14px;
}

.item-title {
  padding: 8px 8px 4px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-color);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-description {
  padding: 0 8px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-overview {
  font-size: 11px;
  color: var(--text-color);
  opacity: 0.8;
  text-align: left;
  line-height: 1.3;
}

.item-year {
  font-size: 11px;
  color: var(--text-color);
  opacity: 0.8;
  text-align: left;
  font-weight: 500;
}

.item-actions {
  padding: 0 8px 8px;
  display: flex;
  justify-content: center;
}

.add-button {
  width: 100%;
  background-color: var(--button-primary-bg);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 5px 10px;
  font-size: 11px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.add-button:hover:not(:disabled) {
  background-color: rgba(76, 175, 80, 0.8);
}

.add-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.adding-icon, .checking-icon {
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { opacity: 0.6; }
  50% { opacity: 1; }
  100% { opacity: 0.6; }
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
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.series-modal, .movie-modal {
  background-color: var(--card-bg-color);
  border-radius: 8px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h4 {
  margin: 0;
  font-size: 18px;
  color: var(--header-color);
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--text-color);
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  max-height: 60vh;
}

.loading-series, .loading-movie {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  gap: 15px;
}

.series-error, .movie-error, .series-not-found, .movie-not-found {
  color: #e74c3c;
  text-align: center;
  padding: 20px 0;
}

.series-details, .movie-details {
  display: flex;
  gap: 20px;
}

.series-poster, .movie-poster {
  flex: 0 0 120px;
}

.modal-poster {
  width: 120px;
  height: 180px;
  border-radius: 4px;
  overflow: hidden;
  background-color: var(--card-bg-color);
  background-size: cover;
  background-position: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.series-info, .movie-info {
  flex: 1;
}

.series-info h3, .movie-info h3 {
  margin-top: 0;
  margin-bottom: 5px;
  color: var(--header-color);
  font-size: 18px;
  border-bottom: none;
  padding-bottom: 0;
}

.series-year, .movie-year {
  color: var(--text-color);
  opacity: 0.7;
  margin-bottom: 15px;
}

.existing-warning {
  background-color: rgba(255, 193, 7, 0.2);
  border: 1px solid rgba(255, 193, 7, 0.5);
  color: #856404;
  padding: 10px;
  border-radius: 4px;
  margin: 10px 0;
}

.seasons-selector {
  margin-top: 15px;
}

.seasons-selector h4 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 16px;
  color: var(--header-color);
}

.season-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.season-action-button {
  background-color: var(--button-secondary-bg);
  border: 1px solid var(--border-color);
  color: var(--text-color);
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}

.seasons-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 10px;
}

.season-item {
  font-size: 13px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
}

.quality-folder-selector {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.quality-profile, .root-folder {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.quality-profile label, .root-folder label {
  font-size: 14px;
  font-weight: 500;
}

.quality-profile select, .root-folder select {
  padding: 8px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  background-color: var(--input-bg);
  color: var(--text-color);
}

.modal-footer {
  padding: 15px 20px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.cancel-button {
  background-color: var(--button-secondary-bg);
  border: 1px solid var(--border-color);
  color: var(--button-secondary-text);
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.add-modal-button {
  background-color: var(--button-primary-bg);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.add-modal-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .history-controls {
    flex-direction: column;
    align-items: stretch;
  }
  
  .view-toggle, .clear-buttons {
    width: 100%;
  }
  
  .toggle-button, .clear-button {
    flex-grow: 1;
    justify-content: center;
  }
  
  .series-details, .movie-details {
    flex-direction: column;
  }
  
  .series-poster, .movie-poster {
    align-self: center;
    margin-bottom: 15px;
  }
  
  .modal-poster {
    width: 150px;
    height: 225px;
  }
}
</style>