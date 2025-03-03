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
      <div v-if="activeView === 'tv' || activeView === 'combined'" class="stat-item">
        <span class="stat-icon">📺</span>
        <span>{{ tvRecommendations.length }} TV shows in history</span>
      </div>
      <div v-if="activeView === 'movies' || activeView === 'combined'" class="stat-item">
        <span class="stat-icon">🎬</span>
        <span>{{ movieRecommendations.length }} movies in history</span>
      </div>
      <div v-if="activeView === 'combined'" class="stat-item total">
        <span class="stat-icon">🔄</span>
        <span>{{ tvRecommendations.length + movieRecommendations.length }} total items in history</span>
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
        <div v-if="tvRecommendations.length === 0" class="empty-section">
          <p>No TV show recommendations in history.</p>
        </div>
        <div v-else class="recommendation-grid">
          <div v-for="(show, index) in tvRecommendations" :key="`tv-${index}`" class="recommendation-item">
            <div class="item-content">
              <span class="item-icon">📺</span>
              <span class="item-title">{{ show }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div v-if="activeView === 'movies' || activeView === 'combined'" class="history-section">
        <h3 v-if="activeView === 'combined'">Movie Recommendations</h3>
        <div v-if="movieRecommendations.length === 0" class="empty-section">
          <p>No movie recommendations in history.</p>
        </div>
        <div v-else class="recommendation-grid">
          <div v-for="(movie, index) in movieRecommendations" :key="`movie-${index}`" class="recommendation-item">
            <div class="item-content">
              <span class="item-icon">🎬</span>
              <span class="item-title">{{ movie }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'RecommendationHistory',
  data() {
    return {
      activeView: 'combined',
      tvRecommendations: [],
      movieRecommendations: [],
      loading: true
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
    }
  },
  created() {
    this.loadRecommendationHistory();
  },
  methods: {
    loadRecommendationHistory() {
      this.loading = true;
      
      // Load TV recommendations from localStorage
      const tvHistory = localStorage.getItem('previousTVRecommendations');
      if (tvHistory) {
        this.tvRecommendations = JSON.parse(tvHistory);
      }
      
      // Load movie recommendations from localStorage
      const movieHistory = localStorage.getItem('previousMovieRecommendations');
      if (movieHistory) {
        this.movieRecommendations = JSON.parse(movieHistory);
      }
      
      this.loading = false;
    },
    clearTVHistory() {
      if (confirm('Are you sure you want to clear your TV show recommendation history?')) {
        localStorage.removeItem('previousTVRecommendations');
        this.tvRecommendations = [];
      }
    },
    clearMovieHistory() {
      if (confirm('Are you sure you want to clear your movie recommendation history?')) {
        localStorage.removeItem('previousMovieRecommendations');
        this.movieRecommendations = [];
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
  flex-wrap: wrap;
  gap: 15px;
  margin-bottom: 20px;
  padding: 15px;
  background-color: var(--card-bg-color);
  border-radius: 8px;
  border: 1px solid var(--border-color);
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
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 15px;
}

.recommendation-item {
  background-color: var(--card-bg-color);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 12px;
  transition: all 0.2s ease;
}

.recommendation-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  border-color: var(--button-primary-bg);
}

.item-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.item-title {
  font-size: 14px;
  color: var(--text-color);
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
  
  .recommendation-grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  }
}
</style>