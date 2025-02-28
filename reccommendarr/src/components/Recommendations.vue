<template>
  <div class="recommendations">
    <h2>TV Show Recommendations</h2>
    
    <div v-if="!openaiConfigured" class="setup-section">
      <p class="info-message">First, connect to OpenAI to get personalized recommendations.</p>
      <OpenAIConnection @configured="handleOpenAIConfigured" />
    </div>
    
    <div v-else>
      <div class="actions">
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
        <p>Analyzing your TV show library and generating recommendations...</p>
      </div>
      
      <div v-else-if="error" class="error">
        {{ error }}
      </div>
      
      <div v-else-if="recommendations.length > 0" class="recommendation-list">
        <div v-for="(rec, index) in recommendations" :key="index" class="recommendation-card">
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
      
      <div v-else-if="recommendationsRequested" class="no-recommendations">
        <p>No recommendations could be generated. Try again or check your TV show library.</p>
      </div>
    </div>
  </div>
</template>

<script>
import OpenAIConnection from './OpenAIConnection.vue';
import openAIService from '../services/OpenAIService';

export default {
  name: 'ShowRecommendations',
  components: {
    OpenAIConnection
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
  data() {
    return {
      openaiConfigured: false,
      recommendations: [],
      loading: false,
      error: null,
      recommendationsRequested: false
    };
  },
  methods: {
    handleOpenAIConfigured() {
      this.openaiConfigured = true;
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
        this.error = 'OpenAI service is not configured. Please provide an API key.';
        return;
      }
      
      this.loading = true;
      this.error = null;
      this.recommendationsRequested = true;
      
      try {
        // Get recommendations from OpenAI based on Sonarr library
        this.recommendations = await openAIService.getRecommendations(this.series);
      } catch (error) {
        console.error('Failed to get recommendations:', error);
        this.error = 'Failed to get recommendations. Please check your OpenAI API key and try again.';
        this.recommendations = [];
      } finally {
        this.loading = false;
      }
    }
  },
  mounted() {
    // Check if OpenAI is already configured
    this.openaiConfigured = openAIService.isConfigured();
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
  color: #2c3e50;
}

.setup-section {
  margin-bottom: 30px;
}

.info-message {
  margin-bottom: 15px;
  font-size: 16px;
  color: #555;
}

.actions {
  margin-bottom: 20px;
  display: flex;
  justify-content: center;
}

.action-button {
  background-color: #4CAF50;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  font-size: 16px;
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
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.recommendation-card {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 20px;
}

.recommendation-card h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #2c3e50;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.recommendation-card h4 {
  margin: 15px 0 5px 0;
  color: #555;
  font-size: 14px;
}

.recommendation-card p {
  margin: 0;
  color: #666;
  line-height: 1.5;
}

.description, .reasoning, .streaming {
  margin-bottom: 15px;
}

.no-recommendations {
  text-align: center;
  padding: 30px;
  color: #666;
}
</style>