<template>
  <div class="recommendations">
    <h2>Movie Recommendations</h2>
    
    <div v-if="!openaiConfigured" class="setup-section">
      <h3 class="setup-title">AI Connection Required</h3>
      <p class="info-message">To generate movie recommendations, you need to configure an AI service first.</p>
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
            
            <div class="genre-selector">
              <label for="genreSelect">Genre preference:</label>
              <div class="select-container">
                <select id="genreSelect" v-model="selectedGenre" @change="saveGenrePreference">
                  <option value="">All genres (based on your library)</option>
                  <option value="action">Action</option>
                  <option value="adventure">Adventure</option>
                  <option value="animation">Animation</option>
                  <option value="comedy">Comedy</option>
                  <option value="crime">Crime</option>
                  <option value="documentary">Documentary</option>
                  <option value="drama">Drama</option>
                  <option value="fantasy">Fantasy</option>
                  <option value="horror">Horror</option>
                  <option value="mystery">Mystery</option>
                  <option value="romance">Romance</option>
                  <option value="sci-fi">Sci-Fi</option>
                  <option value="thriller">Thriller</option>
                </select>
                <div class="select-arrow">▼</div>
              </div>
            </div>
          </div>
        </div>
        
        <button 
          @click="getRecommendations" 
          :disabled="loading"
          class="action-button"
        >
          {{ loading ? 'Getting Recommendations...' : 'Get Recommendations' }}
        </button>
      </div>
      
      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <p>Analyzing your movie library and generating recommendations...</p>
      </div>
      
      <div v-else-if="error" class="error">
        {{ error }}
      </div>
      
      <div v-else-if="recommendations.length > 0" class="recommendation-list">
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
              <h3>{{ rec.title }}</h3>
              
              <div v-if="rec.description" class="description">
                <h4>Description:</h4>
                <p>{{ rec.description }}</p>
              </div>
              
              <div v-if="rec.reasoning" class="reasoning">
                <h4>Why you might like it:</h4>
                <p>{{ rec.reasoning }}</p>
              </div>
              
              <div v-if="rec.streaming" class="streaming">
                <h4>Available on:</h4>
                <p>{{ rec.streaming }}</p>
              </div>
              
              <div v-if="!rec.description && !rec.reasoning" class="full-text">
                <p>{{ rec.fullText }}</p>
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
</template>

<script>
import openAIService from '../services/OpenAIService';
import imageService from '../services/ImageService';

export default {
  name: 'MovieRecommendations',
  components: {
  },
  props: {
    movies: {
      type: Array,
      required: true
    },
    radarrConfigured: {
      type: Boolean,
      required: true
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
      selectedGenre: '' // Default to all genres
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
        // Try to get the movie poster with cache disabled
        const posterUrl = await imageService.getPosterForMovie(clean, true);
        
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
    
    // Save genre preference to localStorage when it changes
    saveGenrePreference() {
      localStorage.setItem('movieGenrePreference', this.selectedGenre);
    },
    
    async getRecommendations() {
      // Verify we have a movies list and OpenAI is configured
      if (!this.radarrConfigured) {
        this.error = 'You need to connect to Radarr first to get recommendations based on your library.';
        return;
      }
      
      if (this.movies.length === 0) {
        this.error = 'Your Radarr library is empty. Add some movies to get recommendations.';
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
        // Get recommendations from OpenAI based on Radarr library with user preferences
        this.recommendations = await openAIService.getMovieRecommendations(
          this.movies, 
          this.numRecommendations,
          this.selectedGenre
        );
        
        // Update loading message to include genre if selected
        const loadingMessage = document.querySelector('.loading p');
        if (loadingMessage && this.selectedGenre) {
          loadingMessage.textContent = `Analyzing your movie library and generating ${this.selectedGenre} recommendations...`;
        }
        
        // Fetch posters for each recommendation
        this.fetchPosters();
      } catch (error) {
        console.error('Failed to get movie recommendations:', error);
        this.error = 'Failed to get recommendations. Please check your AI API settings and try again.';
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
          
          const posterUrl = await imageService.getPosterForMovie(cleanTitle);
          
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
    }
  },
  mounted() {
    // Check if OpenAI is already configured
    this.openaiConfigured = openAIService.isConfigured();
    
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
    
    // Restore saved genre preference if exists
    const savedGenre = localStorage.getItem('movieGenrePreference');
    if (savedGenre) {
      this.selectedGenre = savedGenre;
    }
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
  max-width: 500px;
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
  padding: 30px;
}

.spinner {
  display: inline-block;
  width: 40px;
  height: 40px;
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-left-color: #4CAF50;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 15px;
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
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

@media (min-width: 768px) {
  .recommendation-list {
    grid-template-columns: repeat(auto-fill, minmax(500px, 1fr));
  }
}

.recommendation-card {
  background-color: var(--card-bg-color);
  border-radius: 8px;
  box-shadow: var(--card-shadow);
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow var(--transition-speed), background-color var(--transition-speed);
}

.recommendation-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
}

.card-content {
  display: flex;
  flex-direction: column;
}

@media (min-width: 480px) {
  .card-content {
    flex-direction: row;
  }
}

.poster-container {
  position: relative;
  width: 100%;
  display: flex;
  justify-content: center;
  padding: 10px 0;
}

@media (min-width: 480px) {
  .poster-container {
    flex: 0 0 150px;
    padding: 0;
    width: auto;
  }
}

.poster {
  width: 120px;
  height: 180px;
  background-size: cover;
  background-position: center;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

@media (min-width: 480px) {
  .poster {
    width: 150px;
    height: 225px;
  }
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
  padding: 20px;
  overflow: hidden;
}

.recommendation-card h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: var(--header-color);
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color var(--transition-speed), border-color var(--transition-speed);
}

.recommendation-card h4 {
  margin: 15px 0 5px 0;
  color: var(--text-color);
  opacity: 0.8;
  font-size: 14px;
  transition: color var(--transition-speed);
}

.recommendation-card p {
  margin: 0;
  color: var(--text-color);
  line-height: 1.5;
  transition: color var(--transition-speed);
}

.description, .reasoning, .streaming {
  margin-bottom: 15px;
}

.no-recommendations {
  text-align: center;
  padding: 30px;
  color: var(--text-color);
  opacity: 0.7;
  transition: color var(--transition-speed);
}
</style>