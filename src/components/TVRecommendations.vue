<template>
  <div class="recommendations">
    <h2>TV Show Recommendations</h2>
    
    <div v-if="!openaiConfigured" class="setup-section">
      <h3 class="setup-title">AI Connection Required</h3>
      <p class="info-message">To generate TV show recommendations, you need to configure an AI service first.</p>
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
          <div class="settings-container">
            <div class="settings-layout">
              <div class="settings-left">
                <div class="info-section">
                  <h3 class="info-section-title">Current Configuration</h3>
                  <div class="model-info">
                    <div class="model-header">
                      <span class="current-model">Model:</span>
                      <button 
                        @click="fetchModels" 
                        class="fetch-models-button"
                        :disabled="fetchingModels"
                        title="Refresh models from API"
                      >
                        <span v-if="fetchingModels" class="loading-icon">⟳</span>
                        <span v-else>⟳</span>
                      </button>
                    </div>
                    <div class="model-select-container">
                      <select v-model="selectedModel" @change="updateModel" class="model-select">
                        <option value="" disabled>{{ modelOptions.length === 0 ? 'No models available' : 'Select a model' }}</option>
                        <option v-for="model in modelOptions" :key="model.id" :value="model.id">{{ model.id }}</option>
                        <option value="custom">Custom/Other...</option>
                      </select>
                      <div v-if="fetchError" class="fetch-error">{{ fetchError }}</div>
                      <div class="model-select-custom" v-if="isCustomModel">
                        <input 
                          type="text" 
                          v-model="customModel" 
                          placeholder="Enter model name" 
                          class="custom-model-input"
                          @blur="updateCustomModel"
                          @keyup.enter="updateCustomModel"
                        />
                      </div>
                    </div>
                    
                    <div class="temperature-control">
                      <label for="temperature-slider">Temperature: <span class="temp-value">{{ temperature.toFixed(1) }}</span></label>
                      <div class="slider-container">
                        <div class="temp-labels">
                          <div class="temp-label-right">Creative</div>
                          <input 
                          type="range" 
                          id="temperature-slider"
                          v-model.number="temperature"
                          min="0" 
                          max="1"
                          step="0.1"
                          class="temp-slider"
                          @change="updateTemperature"
                        />
                        <div class="temp-label-left">Precise</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="history-info">
                    <span>{{ previousRecommendations.length }} shows in history</span>
                    <button 
                      v-if="previousRecommendations.length > 0" 
                      @click="clearRecommendationHistory" 
                      class="clear-history-button"
                      title="Clear recommendation history"
                    >
                      Clear History
                    </button>
                  </div>
                </div>
                
                <div class="count-selector">
                  <label for="recommendationsSlider">Number of recommendations: <span class="count-display">{{ numRecommendations }}</span></label>
                  <div class="slider-container">
                    <input 
                      type="range" 
                      id="recommendationsSlider"
                      v-model.number="numRecommendations"
                      min="1" 
                      max="50"
                      class="count-slider"
                      @change="saveRecommendationCount"
                    >
                  </div>
                </div>
                
                <div class="count-selector">
                  <label for="columnsSlider">Posters per row: <span class="count-display">{{ columnsCount }}</span></label>
                  <div class="slider-container">
                    <input 
                      type="range" 
                      id="columnsSlider"
                      v-model.number="columnsCount"
                      min="1" 
                      max="4"
                      class="count-slider"
                      @change="saveColumnsCount"
                    >
                  </div>
                </div>
              </div>
              
              <div class="settings-right">
                <div class="genre-selector">
                  <label>Genre preferences:</label>
                  <div class="genre-checkboxes">
                    <div class="genre-checkbox-item" v-for="genre in availableGenres" :key="genre.value">
                      <label class="checkbox-label">
                        <input 
                          type="checkbox" 
                          :value="genre.value" 
                          v-model="selectedGenres"
                          @change="saveGenrePreference"
                        >
                        {{ genre.label }}
                      </label>
                    </div>
                    <div v-if="selectedGenres.length > 0" class="selected-genres-summary">
                      <div class="selected-genres-count">{{ selectedGenres.length }} genre{{ selectedGenres.length > 1 ? 's' : '' }} selected</div>
                      <button @click="clearGenres" class="clear-genres-button">Clear All</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="action-button-container">
              <button 
                @click="getRecommendations" 
                :disabled="loading"
                class="action-button"
              >
                {{ loading ? 'Getting Recommendations...' : 'Get Recommendations' }}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <p>Analyzing your TV show library and generating recommendations...</p>
      </div>
      
      <div v-else-if="error" class="error">
        {{ error }}
      </div>
      
      <div v-else-if="recommendations.length > 0" class="recommendation-list" :style="gridStyle">
        <div v-for="(rec, index) in recommendations" :key="index" class="recommendation-card">
          <!-- Clean title for poster lookup -->
          <div class="card-content">
            <div class="poster-container">
              <div 
                class="poster" 
                :style="getPosterStyle(rec.title)"
                :title="rec.title"
              >
                <div v-if="!hasPoster(rec.title)" class="title-fallback">
                  {{ getInitials(rec.title) }}
                </div>
                <button 
                  v-if="isPosterFallback(rec.title)" 
                  class="retry-poster-button" 
                  :class="{ 'loading': loadingPosters.get(cleanTitle(rec.title)) }"
                  @click.stop="retryPoster(rec.title)"
                  title="Retry loading poster"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M23 12c0 6.075-4.925 11-11 11S1 18.075 1 12 5.925 1 12 1s11 4.925 11 11z"/>
                    <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"/>
                    <path d="M12 8v4l3 3"/>
                    <path d="M7 6.7l1.5 1.5M17 6.7L15.5 8.2M7 17.3l1.5-1.5M17 17.3l-1.5-1.5"/>
                  </svg>
                </button>
              </div>
            </div>
            
            <div class="details-container">
              <div class="card-header">
                <h3>{{ rec.title }}</h3>
                <button 
                  @click="requestSeries(rec.title)" 
                  class="request-button compact"
                  :class="{'loading': requestingSeries === rec.title, 'requested': requestStatus[rec.title]?.success}"
                  :disabled="requestingSeries || requestStatus[rec.title]?.success">
                  <span v-if="requestingSeries === rec.title">
                    <div class="small-spinner"></div>
                  </span>
                  <span v-else-if="requestStatus[rec.title]?.success">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </span>
                  <span v-else>Add</span>
                </button>
              </div>
              
              <div class="content-container">
                <div v-if="rec.description" class="description">
                  <span class="label">Description:</span>
                  <p>{{ rec.description }}</p>
                </div>
                
                <div v-if="rec.reasoning" class="reasoning">
                  <span class="label">Why you might like it:</span>
                  <p>{{ rec.reasoning }}</p>
                </div>
                
                <div v-if="rec.streaming" class="streaming">
                  <span class="label">Available on:</span>
                  <p>{{ rec.streaming }}</p>
                </div>
                
                <div v-if="!rec.description && !rec.reasoning" class="full-text">
                  <p>{{ rec.fullText }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div v-else-if="recommendationsRequested" class="no-recommendations">
        <p>No recommendations could be generated. Try again or check your TV show library.</p>
      </div>
    </div>
  </div>
    <!-- Season Selection Modal -->
    <div v-if="showSeasonModal && currentSeries" class="modal-overlay">
      <div class="modal-container">
        <div class="modal-header">
          <h3>Add "{{ currentSeries.title }}" to Sonarr</h3>
          <button class="modal-close" @click="closeSeasonModal">×</button>
        </div>
        
        <div class="modal-body">
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
        
        <div class="modal-footer">
          <button class="cancel-button" @click="closeSeasonModal">Cancel</button>
          <button 
            class="confirm-button" 
            @click="confirmAddSeries"
            :disabled="!selectedSeasons.length"
          >
            Add to Sonarr
          </button>
        </div>
      </div>
    </div>
  </template>

<script>
import openAIService from '../services/OpenAIService';
import imageService from '../services/ImageService';
import sonarrService from '../services/SonarrService';
import axios from 'axios';

export default {
  name: 'TVRecommendations',
  components: {
  },
  props: {
    series: {
      type: Array,
      required: true
    },
    sonarrConfigured: {
      type: Boolean,
      required: true
    }
  },
  computed: {
    gridStyle() {
      return {
        gridTemplateColumns: `repeat(${this.columnsCount}, 1fr)`
      };
    }
  },
  data() {
    return {
      openaiConfigured: false,
      recommendations: [],
      loading: false,
      error: null,
      recommendationsRequested: false,
      posters: new Map(), // Using a reactive Map for poster URLs
      loadingPosters: new Map(), // Track which posters are being loaded
      numRecommendations: 5, // Default number of recommendations to request
      columnsCount: 2, // Default number of posters per row
      selectedGenres: [], // Multiple genre selections 
      availableGenres: [
        { value: 'action', label: 'Action' },
        { value: 'adventure', label: 'Adventure' },
        { value: 'animation', label: 'Animation' },
        { value: 'comedy', label: 'Comedy' },
        { value: 'crime', label: 'Crime' },
        { value: 'documentary', label: 'Documentary' },
        { value: 'drama', label: 'Drama' },
        { value: 'fantasy', label: 'Fantasy' },
        { value: 'horror', label: 'Horror' },
        { value: 'mystery', label: 'Mystery' },
        { value: 'romance', label: 'Romance' },
        { value: 'sci-fi', label: 'Sci-Fi' },
        { value: 'thriller', label: 'Thriller' }
      ],
      requestingSeries: null, // Track which series is being requested
      requestStatus: {}, // Track request status for each series
      previousRecommendations: [], // Track previous recommendations to avoid duplicates
      maxStoredRecommendations: 500, // Maximum number of previous recommendations to store
      showSeasonModal: false, // Control visibility of season selection modal
      currentSeries: null, // Current series being added
      selectedSeasons: [], // Selected seasons for the current series
      selectedModel: '', // Current selected model
      customModel: '', // For custom model input
      isCustomModel: false, // Whether the custom model input is visible
      modelOptions: [], // Available models from API
      fetchingModels: false, // Loading state for fetching models
      fetchError: null, // Error when fetching models
      temperature: 0.5 // AI temperature parameter
    };
  },
  methods: {
    goToSettings() {
      this.$emit('navigate', 'settings');
    },
    // Clean title for consistent poster lookup
    cleanTitle(title) {
      return title.replace(/[:.!?]+$/, '').trim();
    },
    
    // Check if we have a poster for this title
    hasPoster(title) {
      const clean = this.cleanTitle(title);
      return this.posters.has(clean);
    },
    
    // Check if poster is a fallback and should have retry button
    isPosterFallback(title) {
      const clean = this.cleanTitle(title);
      const posterUrl = this.posters.get(clean);
      
      // If it's loading, don't show retry button
      if (this.loadingPosters.get(clean)) {
        return false;
      }
      
      // If we have a poster URL and it's an SVG data URL (our fallback)
      return posterUrl && posterUrl.startsWith('data:image/svg+xml;base64,');
    },
    
    // Retry loading a poster for a specific title
    async retryPoster(title) {
      const clean = this.cleanTitle(title);
      
      // Set loading state for this poster
      this.loadingPosters.set(clean, true);
      
      try {
        // Try to get the poster with cache disabled
        const posterUrl = await imageService.getPosterForShow(clean, true);
        
        if (posterUrl) {
          // Update poster in state
          this.posters.set(clean, posterUrl);
        } else {
          // If still no poster, set fallback
          this.posters.set(clean, imageService.getFallbackImageUrl(clean));
        }
      } catch (error) {
        console.error(`Error retrying poster for "${clean}":`, error);
        // Keep fallback in case of error
        this.posters.set(clean, imageService.getFallbackImageUrl(clean));
      } finally {
        // Clear loading state
        this.loadingPosters.delete(clean);
      }
    },
    
    // Get poster style for CSS
    getPosterStyle(title) {
      const clean = this.cleanTitle(title);
      const posterUrl = this.posters.get(clean);
      
      if (posterUrl) {
        return { backgroundImage: `url(${posterUrl})` };
      }
      
      // Generate fallback color
      const hash = this.simpleHash(clean);
      const hue = hash % 360;
      return { backgroundColor: `hsl(${hue}, 70%, 40%)` };
    },
    
    // Get initials for fallback display
    getInitials(title) {
      if (!title) return '';
      
      return title
        .split(' ')
        .filter(word => word.length > 0)
        .map(word => word[0].toUpperCase())
        .slice(0, 2)
        .join('');
    },
    
    // Simple hash function for consistent colors
    simpleHash(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
      }
      return Math.abs(hash);
    },
    // Save recommendation count to localStorage
    saveRecommendationCount() {
      localStorage.setItem('numRecommendations', this.numRecommendations);
    },
    
    // Save columns count to localStorage
    saveColumnsCount() {
      localStorage.setItem('columnsCount', this.columnsCount);
    },
    
    // Save genre preferences to localStorage when they change
    saveGenrePreference() {
      localStorage.setItem('tvGenrePreferences', JSON.stringify(this.selectedGenres));
    },
    
    // Clear all selected genres
    clearGenres() {
      this.selectedGenres = [];
      this.saveGenrePreference();
    },
    
    // Save previous recommendations to localStorage
    savePreviousRecommendations() {
      localStorage.setItem('previousTVRecommendations', JSON.stringify(this.previousRecommendations));
    },
    
    // Add current recommendations to the history
    addToRecommendationHistory(newRecommendations) {
      // Extract just the titles for storage
      const titlesToAdd = newRecommendations.map(rec => rec.title);
      
      // Combine with existing recommendations, remove duplicates
      const combinedRecommendations = [...this.previousRecommendations, ...titlesToAdd];
      
      // Keep only unique recommendations
      const uniqueRecommendations = [...new Set(combinedRecommendations)];
      
      // If over the limit, remove oldest recommendations
      if (uniqueRecommendations.length > this.maxStoredRecommendations) {
        this.previousRecommendations = uniqueRecommendations.slice(
          uniqueRecommendations.length - this.maxStoredRecommendations
        );
      } else {
        this.previousRecommendations = uniqueRecommendations;
      }
      
      // Save to localStorage
      this.savePreviousRecommendations();
    },
    
    // Clear recommendation history
    clearRecommendationHistory() {
      // Ask for confirmation
      if (confirm(`Clear your history of ${this.previousRecommendations.length} previously recommended shows?`)) {
        this.previousRecommendations = [];
        this.savePreviousRecommendations();
      }
    },
    
    // Update the model selection
    updateModel() {
      if (this.selectedModel === 'custom') {
        this.isCustomModel = true;
        // If we already have a custom model set, use that as the initial value
        if (openAIService.model && !this.availableModels.includes(openAIService.model)) {
          this.customModel = openAIService.model;
        }
      } else {
        this.isCustomModel = false;
        // Save the selected model
        localStorage.setItem('openaiModel', this.selectedModel);
        openAIService.model = this.selectedModel;
      }
    },
    
    // Update the custom model name
    updateCustomModel() {
      if (this.customModel.trim()) {
        localStorage.setItem('openaiModel', this.customModel);
        openAIService.model = this.customModel;
      }
    },
    
    // Update temperature and save to localStorage
    updateTemperature() {
      // Save to localStorage
      localStorage.setItem('aiTemperature', this.temperature.toString());
      
      // Update in OpenAI service
      openAIService.temperature = this.temperature;
    },
    
    // Fetch available models from the API
    async fetchModels() {
      if (!openAIService.isConfigured()) {
        this.fetchError = 'API service is not configured. Please set up your API key first.';
        return;
      }
      
      this.fetchingModels = true;
      this.fetchError = null;
      
      try {
        // Use the baseUrl from OpenAIService to build the models endpoint
        const modelsEndpoint = `${openAIService.baseUrl}/models`;
        
        // Set up headers based on the API endpoint
        const headers = {};
        
        // Add authentication header based on the API endpoint
        if (openAIService.baseUrl === 'https://api.anthropic.com/v1') {
          headers['x-api-key'] = openAIService.apiKey;
          headers['anthropic-dangerous-direct-browser-access'] = 'true';
          headers['anthropic-version'] = '2023-06-01';
        } else {
          headers['Authorization'] = `Bearer ${openAIService.apiKey}`;
        }
        
        const response = await axios.get(modelsEndpoint, { headers });
        
        if (response.data && response.data.data) {
          // Get the list of models
          this.modelOptions = response.data.data;
          
          // Sort models alphabetically
          this.modelOptions.sort((a, b) => a.id.localeCompare(b.id));
        } else {
          this.fetchError = 'Invalid response format from API';
        }
      } catch (error) {
        console.error('Error fetching models:', error);
        this.fetchError = error.response?.data?.error?.message || 
                         'Failed to fetch models. Check your API key and URL.';
      } finally {
        this.fetchingModels = false;
      }
    },
    
    async getRecommendations() {
      // Verify we have a series list and OpenAI is configured
      if (!this.sonarrConfigured) {
        this.error = 'You need to connect to Sonarr first to get recommendations based on your library.';
        return;
      }
      
      if (this.series.length === 0) {
        this.error = 'Your Sonarr library is empty. Add some TV shows to get recommendations.';
        return;
      }
      
      if (!openAIService.isConfigured()) {
        this.error = 'AI service is not configured. Please provide an API key.';
        return;
      }
      
      this.loading = true;
      this.error = null;
      this.recommendationsRequested = true;
      
      try {
        // Get recommendations from OpenAI based on Sonarr library with user preferences
        // Convert selectedGenres array to a comma-separated string for the API
        const genreString = this.selectedGenres.length > 0 
          ? this.selectedGenres.join(', ')
          : '';
        
        // Pass the previous recommendations to be excluded
        this.recommendations = await openAIService.getRecommendations(
          this.series, 
          this.numRecommendations,
          genreString,
          this.previousRecommendations
        );
        
        // Update loading message to include genres if selected
        const loadingMessage = document.querySelector('.loading p');
        if (loadingMessage && this.selectedGenres.length > 0) {
          loadingMessage.textContent = `Analyzing your TV library and generating ${genreString} recommendations...`;
        }
        
        // Add new recommendations to history
        this.addToRecommendationHistory(this.recommendations);
        
        // Fetch posters for each recommendation
        this.fetchPosters();
      } catch (error) {
        console.error('Failed to get recommendations:', error);
        this.error = 'Failed to get recommendations. Please check your AI service settings and try again.';
        this.recommendations = [];
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * Fetch posters for each recommendation in parallel
     */
    async fetchPosters() {
      // Reset posters
      this.posters.clear();
      
      // Create requests for all recommendations
      const posterPromises = this.recommendations.map(async (rec) => {
        try {
          // Extract clean title (removing any punctuation at the end)
          const cleanTitle = rec.title.replace(/[:.!?]+$/, '').trim();
          
          const posterUrl = await imageService.getPosterForShow(cleanTitle);
          
          if (posterUrl) {
            // Update posters state using Map methods
            this.posters.set(cleanTitle, posterUrl);
          } else {
            // Set fallback image
            this.posters.set(cleanTitle, imageService.getFallbackImageUrl(cleanTitle));
          }
        } catch (error) {
          console.error(`Error fetching poster for "${rec.title}":`, error);
          // Fallback image
          this.posters.set(rec.title, imageService.getFallbackImageUrl(rec.title));
        }
      });
      
      // Wait for all requests to complete
      await Promise.all(posterPromises);
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
        this.currentSeries = {
          title: title,
          seasons: seriesInfo.seasons
            .filter(season => season.seasonNumber > 0) // Filter out specials (season 0)
            .sort((a, b) => a.seasonNumber - b.seasonNumber) // Sort by season number
        };
        
        // Set all seasons selected by default
        this.selectedSeasons = this.currentSeries.seasons.map(s => s.seasonNumber);
        
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
    },
    
    /**
     * Request a series to be added to Sonarr with selected seasons
     */
    async confirmAddSeries() {
      if (!this.currentSeries || !this.selectedSeasons.length) {
        return;
      }
      
      try {
        // Set requesting state
        this.requestingSeries = this.currentSeries.title;
        
        // Close modal
        this.showSeasonModal = false;
        
        // Add series to Sonarr with selected seasons
        const response = await sonarrService.addSeries(
          this.currentSeries.title, 
          this.selectedSeasons
        );
        
        // Store success response
        this.requestStatus[this.currentSeries.title] = {
          success: true,
          message: 'Successfully added to Sonarr',
          details: response
        };
        
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
      }
    },
    
    /**
     * Request a series to be added to Sonarr (entry point)
     * @param {string} title - The series title to add
     */
    requestSeries(title) {
      this.openSeasonSelector(title);
    }
  },
  mounted() {
    // Check if OpenAI is already configured
    this.openaiConfigured = openAIService.isConfigured();
    
    // Initialize model selection
    const currentModel = openAIService.model || 'gpt-3.5-turbo';
    
    // Set to custom by default, we'll update once models are fetched
    this.customModel = currentModel;
    this.selectedModel = 'custom';
    this.isCustomModel = true;
    
    // Initialize temperature from localStorage or OpenAIService
    const savedTemp = localStorage.getItem('aiTemperature');
    if (savedTemp) {
      this.temperature = parseFloat(savedTemp);
      // Validate the value is within range
      if (isNaN(this.temperature) || this.temperature < 0) {
        this.temperature = 0;
      } else if (this.temperature > 1) {
        this.temperature = 1;
      }
    } else if (openAIService.temperature) {
      this.temperature = openAIService.temperature;
    }
    
    // Fetch models if API is configured
    if (openAIService.isConfigured()) {
      this.fetchModels().then(() => {
        // Check if the current model is in the fetched models
        const modelExists = this.modelOptions.some(model => model.id === currentModel);
        
        if (modelExists) {
          // If current model exists in options, select it
          this.selectedModel = currentModel;
          this.isCustomModel = false;
        }
      });
    }
    
    // Restore saved recommendation count from localStorage (if exists)
    const savedCount = localStorage.getItem('numRecommendations');
    if (savedCount) {
      this.numRecommendations = parseInt(savedCount, 10);
      // Validate the value is within range
      if (isNaN(this.numRecommendations) || this.numRecommendations < 1) {
        this.numRecommendations = 1;
      } else if (this.numRecommendations > 50) {
        this.numRecommendations = 50;
      }
    }
    
    // Restore saved columns count from localStorage (if exists)
    const savedColumnsCount = localStorage.getItem('columnsCount');
    if (savedColumnsCount) {
      this.columnsCount = parseInt(savedColumnsCount, 10);
      // Validate the value is within range
      if (isNaN(this.columnsCount) || this.columnsCount < 1) {
        this.columnsCount = 2; // Default to 2 if invalid
      } else if (this.columnsCount > 4) {
        this.columnsCount = 4;
      }
    }
    
    // Restore saved genre preferences if they exist
    const savedGenres = localStorage.getItem('tvGenrePreferences');
    if (savedGenres) {
      try {
        this.selectedGenres = JSON.parse(savedGenres);
      } catch (error) {
        console.error('Error parsing saved genres:', error);
        this.selectedGenres = [];
      }
    }
    
    // Load previous TV recommendations from localStorage
    const savedPreviousRecommendations = localStorage.getItem('previousTVRecommendations');
    if (savedPreviousRecommendations) {
      try {
        this.previousRecommendations = JSON.parse(savedPreviousRecommendations);
      } catch (error) {
        console.error('Error parsing previous TV recommendations:', error);
        this.previousRecommendations = [];
      }
    }
  },
  
  // Save previous recommendations when component is destroyed
  beforeUnmount() {
    this.savePreviousRecommendations();
  }
};
</script>

<style scoped>
.recommendations {
  padding: 20px;
}

h2 {
  margin-top: 0;
  margin-bottom: 20px;
  color: var(--header-color);
  transition: color var(--transition-speed);
}

.setup-section {
  margin-bottom: 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: var(--card-bg-color);
  padding: 30px;
  border-radius: 8px;
  box-shadow: var(--card-shadow);
  max-width: 600px;
  margin: 0 auto 30px;
  transition: background-color var(--transition-speed), box-shadow var(--transition-speed);
}

.setup-title {
  margin-top: 0;
  margin-bottom: 15px;
  color: var(--header-color);
  font-size: 20px;
  text-align: center;
  transition: color var(--transition-speed);
}

.info-message {
  margin-bottom: 10px;
  font-size: 16px;
  color: var(--text-color);
  opacity: 0.9;
  text-align: center;
  transition: color var(--transition-speed);
}

.setup-details {
  margin-bottom: 20px;
  font-size: 14px;
  color: var(--text-color);
  opacity: 0.7;
  text-align: center;
  transition: color var(--transition-speed);
}

.settings-button {
  min-width: 200px;
  margin-top: 10px;
  font-size: 15px;
}

.actions {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.recommendations-settings {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 15px;
  width: 100%;
  max-width: 1000px;
}

.settings-container {
  background-color: var(--card-bg-color);
  border-radius: 8px;
  box-shadow: var(--card-shadow);
  width: 100%;
  box-sizing: border-box;
  padding: 20px;
  transition: background-color var(--transition-speed), box-shadow var(--transition-speed);
}

.settings-layout {
  display: flex;
  gap: 20px;
  margin-bottom: 15px;
}

.settings-left, .settings-right {
  flex: 1;
}

@media (max-width: 768px) {
  .settings-layout {
    flex-direction: column;
  }
}

.action-button-container {
  display: flex;
  justify-content: center;
  margin-top: 10px;
}

.info-section {
  background-color: rgba(0, 0, 0, 0.03);
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 20px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.info-section-title {
  margin: 0 0 10px 0;
  font-size: 15px;
  color: var(--header-color);
  font-weight: 600;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.model-info {
  padding: 6px 0;
  font-size: 14px;
  margin-bottom: 8px;
}

.current-model {
  color: var(--text-color);
  transition: color var(--transition-speed);
  font-weight: 500;
}

.model-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.fetch-models-button {
  background: none;
  border: none;
  color: var(--button-primary-bg);
  font-size: 16px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.fetch-models-button:hover:not(:disabled) {
  background-color: rgba(0, 0, 0, 0.05);
}

.fetch-models-button:disabled {
  color: #ccc;
  cursor: not-allowed;
}

.loading-icon {
  display: inline-block;
  animation: spin 1s infinite linear;
}

.fetch-error {
  color: #f44336;
  font-size: 12px;
  margin-top: 4px;
}

.model-select-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.model-select {
  padding: 6px 10px;
  border-radius: 4px;
  border: 1px solid var(--input-border);
  background-color: var(--input-bg);
  color: var(--input-text);
  font-size: 14px;
  width: 100%;
  transition: border-color 0.2s;
}

.model-select:focus {
  border-color: var(--button-primary-bg);
  outline: none;
}

.model-select-custom {
  margin-top: 5px;
}

.custom-model-input {
  padding: 6px 10px;
  border-radius: 4px;
  border: 1px solid var(--input-border);
  background-color: var(--input-bg);
  color: var(--input-text);
  font-size: 14px;
  width: 100%;
}

.custom-model-input:focus {
  border-color: var(--button-primary-bg);
  outline: none;
}

.temperature-control {
  margin-top: 15px;
}

.temperature-control label {
  font-size: 14px;
  color: var(--text-color);
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.temp-value {
  font-weight: bold;
  color: #4CAF50;
  background-color: #f0f0f0;
  border-radius: 4px;
  padding: 2px 8px;
}

.temp-slider {
  width: 100%;
  -webkit-appearance: none;
  height: 6px;
  border-radius: 5px;
  background: #ddd;
  outline: none;
  margin: 0;
  padding: 0;
  position: relative;
}

.temp-slider::-webkit-slider-runnable-track {
  height: 6px;
  border-radius: 5px;
}

.temp-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #4CAF50;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transition: background 0.2s, transform 0.2s;
  margin-top: -6px;
}

.temp-slider::-webkit-slider-thumb:hover {
  background: #43a047;
  transform: scale(1.1);
}

.temp-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #4CAF50;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transition: background 0.2s, transform 0.2s;
  border: none;
}

.temp-labels {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: var(--text-color);
  opacity: 0.7;
  width: 100%;
}

.temp-label-left {
  margin-left: 10px;
  width: 50px;
}

.temp-label-right {
  margin-right: 10px;
  width: 50px;
}

.temp-slider {
  flex: 1;
  margin: 0 10px;
}

.genre-checkboxes {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 5px;
  max-height: 180px;
  overflow-y: auto;
  padding: 10px;
  border: 1px solid var(--input-border);
  border-radius: 4px;
  margin-bottom: 8px;
  background-color: var(--input-bg);
}

.genre-checkbox-item {
  display: flex;
  align-items: center;
}

.checkbox-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  font-weight: normal;
  margin: 0;
  font-size: 14px;
}

.checkbox-label input[type="checkbox"] {
  margin-right: 8px;
  cursor: pointer;
}

.selected-genres-summary {
  grid-column: 1 / -1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 10px;
  margin-top: 10px;
  border-top: 1px solid var(--border-color);
}

.selected-genres-count {
  font-size: 13px;
  color: var(--button-primary-bg);
  font-weight: 500;
}

.clear-genres-button {
  background: none;
  border: none;
  color: #f44336;
  font-size: 13px;
  padding: 2px 6px;
  cursor: pointer;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.clear-genres-button:hover {
  opacity: 1;
  text-decoration: underline;
}

.count-selector, .genre-selector {
  display: flex;
  flex-direction: column;
  width: 100%;
  box-sizing: border-box;
  transition: background-color var(--transition-speed), box-shadow var(--transition-speed);
}

.count-selector {
  margin-bottom: 25px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border-color);
}

.select-container {
  position: relative;
  width: 100%;
}

select {
  width: 100%;
  padding: 10px;
  appearance: none;
  background-color: var(--input-bg);
  color: var(--input-text);
  border: 1px solid var(--input-border);
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: border-color 0.2s, background-color var(--transition-speed), color var(--transition-speed);
}

select:hover {
  border-color: var(--button-primary-bg);
}

.select-arrow {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  font-size: 10px;
  color: var(--input-text);
}

.count-selector label, .genre-selector label {
  font-size: 14px;
  color: var(--text-color);
  font-weight: 500;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: color var(--transition-speed);
}

.slider-container {
  width: 100%;
  padding: 0 5px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.count-slider {
  width: 100%;
  -webkit-appearance: none;
  height: 6px;
  border-radius: 5px;
  background: #ddd;
  outline: none;
  margin: 0;
  padding: 0;
  vertical-align: middle;
}

.count-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #4CAF50;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transition: background 0.2s, transform 0.2s;
  margin-top: -7px; /* Fix vertical alignment */
}

.count-slider::-webkit-slider-thumb:hover {
  background: #43a047;
  transform: scale(1.1);
}

.count-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #4CAF50;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transition: background 0.2s, transform 0.2s;
  border: none;
}

.count-slider::-moz-range-thumb:hover {
  background: #43a047;
  transform: scale(1.1);
}

.count-slider::-webkit-slider-runnable-track {
  width: 100%;
  height: 6px;
  cursor: pointer;
  background: #ddd;
  border-radius: 5px;
  margin: 0;
  padding: 0;
}

.count-slider::-moz-range-track {
  width: 100%;
  height: 6px;
  cursor: pointer;
  background: #ddd;
  border-radius: 5px;
  margin: 0;
  padding: 0;
}

.count-display {
  font-size: 16px;
  font-weight: bold;
  min-width: 25px;
  text-align: center;
  color: #4CAF50;
  background-color: #f0f0f0;
  border-radius: 4px;
  padding: 2px 8px;
  margin-left: 10px;
}

.action-button {
  background-color: var(--button-primary-bg);
  color: var(--button-primary-text);
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  font-size: 16px;
  min-width: 200px;
  transition: background-color var(--transition-speed), color var(--transition-speed);
}

.action-button:hover:not(:disabled) {
  filter: brightness(1.1);
}

.action-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
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

.spinner {
  display: inline-block;
  width: 30px;
  height: 30px;
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-left-color: #4CAF50;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error {
  padding: 15px;
  color: #f44336;
  text-align: center;
}

.recommendation-list {
  display: grid;
  gap: 20px;
  margin-top: 20px;
  grid-template-columns: 1fr;
}

@media (min-width: 768px) {
  /* Grid columns controlled by :style binding using the gridStyle computed property */
}

.recommendation-card {
  background-color: var(--card-bg-color);
  border-radius: 8px;
  box-shadow: var(--card-shadow);
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow var(--transition-speed), background-color var(--transition-speed);
  height: 225px; /* Fixed height for consistent cards */
}

.recommendation-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

.card-content {
  display: flex;
  flex-direction: row;
  height: 100%;
}

.poster-container {
  position: relative;
  display: flex;
  justify-content: center;
  flex: 0 0 150px;
  padding: 0;
  width: auto;
  height: 100%;
}

.poster {
  width: 150px;
  height: 225px;
  background-size: cover;
  background-position: center;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.title-fallback {
  color: white;
  font-size: 36px;
  font-weight: bold;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.retry-poster-button {
  position: absolute;
  bottom: 10px;
  right: 10px;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0.8;
  transition: opacity 0.2s, transform 0.2s;
  padding: 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.retry-poster-button:hover {
  opacity: 1;
  transform: scale(1.1);
}

.retry-poster-button svg {
  width: 20px;
  height: 20px;
  stroke: white;
}

@keyframes rotation {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(359deg);
  }
}

.retry-poster-button.loading svg {
  animation: rotation 1s infinite linear;
}

.details-container {
  flex: 1;
  padding: 15px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
}

.recommendation-card h3 {
  margin: 0;
  color: var(--header-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color var(--transition-speed);
  font-size: 18px;
}

.content-container {
  overflow-y: auto;
  flex: 1;
  max-height: 160px; /* Allow scrolling for long content */
  scrollbar-width: thin;
}

.content-container::-webkit-scrollbar {
  width: 6px;
}

.content-container::-webkit-scrollbar-thumb {
  background-color: rgba(0,0,0,0.2);
  border-radius: 3px;
}

.content-container::-webkit-scrollbar-track {
  background: rgba(0,0,0,0.05);
}

.label {
  font-weight: 600;
  font-size: 13px;
  color: var(--text-color);
  opacity: 0.9;
  margin-right: 5px;
}

.recommendation-card p {
  margin: 0;
  color: var(--text-color);
  line-height: 1.4;
  transition: color var(--transition-speed);
  font-size: 14px;
}

.description, .reasoning, .streaming {
  margin-bottom: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.history-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  font-size: 14px;
  color: var(--text-color);
}

.clear-history-button {
  background: none;
  border: none;
  color: #f44336;
  font-size: 13px;
  padding: 2px 6px;
  cursor: pointer;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.clear-history-button:hover {
  opacity: 1;
  text-decoration: underline;
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
  z-index: 1000;
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
}

.modal-body h4 {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 16px;
  color: var(--text-color);
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
</style>