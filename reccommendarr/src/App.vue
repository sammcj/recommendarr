<template>
  <div class="app-container">
    <header>
      <img alt="Vue logo" src="./assets/logo.png" class="logo">
      <h1>Reccommendarr</h1>
    </header>
    
    <main>
      <SonarrConnection v-if="!sonarrConnected" @connected="handleSonarrConnected" />
      
      <div v-if="sonarrConnected">
        <AppNavigation 
          :activeTab="activeTab" 
          @navigate="handleNavigate"
          @logout="handleLogout" 
        />
        
        <div class="content">
          <ShowRecommendations 
            v-if="activeTab === 'recommendations'" 
            :series="series"
            :sonarrConfigured="sonarrConnected"
            @navigate="handleNavigate" 
          />
          
          <AISettings
            v-if="activeTab === 'settings'"
            @settings-updated="handleSettingsUpdated"
          />
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import SonarrConnection from './components/SonarrConnection.vue'
// SeriesList removed - focusing on recommendations only
import AppNavigation from './components/Navigation.vue'
import ShowRecommendations from './components/Recommendations.vue'
import AISettings from './components/AISettings.vue'
import sonarrService from './services/SonarrService'

export default {
  name: 'App',
  components: {
    SonarrConnection,
    AppNavigation,
    ShowRecommendations,
    AISettings
  },
  data() {
    return {
      sonarrConnected: false,
      activeTab: 'recommendations',
      series: []
    }
  },
  created() {
    // Check if Sonarr is already configured on startup
    if (sonarrService.isConfigured()) {
      this.checkSonarrConnection();
    }
  },
  methods: {
    async checkSonarrConnection() {
      try {
        const success = await sonarrService.testConnection();
        if (success) {
          this.sonarrConnected = true;
          this.fetchSeriesData();
        }
      } catch (error) {
        console.error('Failed to connect with stored Sonarr credentials:', error);
      }
    },
    handleSonarrConnected() {
      this.sonarrConnected = true;
      this.fetchSeriesData();
    },
    handleNavigate(tab) {
      this.activeTab = tab;
      
      // If we're switching to recommendations, ensure we have series data
      if (tab === 'recommendations' && this.series.length === 0) {
        this.fetchSeriesData();
      }
    },
    async fetchSeriesData() {
      try {
        this.series = await sonarrService.getSeries();
      } catch (error) {
        console.error('Failed to fetch series data for recommendations:', error);
      }
    },
    handleSettingsUpdated() {
      // When settings are updated, show a brief notification or just stay on the settings page
      console.log('AI settings updated successfully');
    },
    handleLogout() {
      // Clear all stored credentials
      localStorage.removeItem('sonarrBaseUrl');
      localStorage.removeItem('sonarrApiKey');
      localStorage.removeItem('openaiApiKey');
      localStorage.removeItem('openaiModel');
      
      // Reset service configurations
      sonarrService.configure('', '');
      
      // Reset UI state
      this.sonarrConnected = false;
      this.series = [];
      this.activeTab = 'recommendations';
    }
  }
}
</script>

<style>
:root {
  /* Light theme (default) */
  --bg-color: #f5f5f5;
  --main-bg-color: #ffffff;
  --text-color: #2c3e50;
  --header-color: #2c3e50;
  --border-color: #ddd;
  --card-bg-color: #ffffff;
  --card-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  --nav-bg-color: #2c3e50;
  --nav-text-color: #ccc;
  --nav-active-bg: rgba(255, 255, 255, 0.2);
  --nav-hover-bg: rgba(255, 255, 255, 0.1);
  --nav-active-text: #ffffff;
  --input-bg: #ffffff;
  --input-border: #ddd;
  --input-text: #333;
  --button-primary-bg: #4CAF50;
  --button-primary-text: white;
  --button-secondary-bg: #f0f0f0;
  --button-secondary-text: #333;
  
  /* Transition for theme changes */
  --transition-speed: 0.3s;
}

body.dark-theme {
  /* Dark theme */
  --bg-color: #1a1a1a;
  --main-bg-color: #2a2a2a;
  --text-color: #e0e0e0;
  --header-color: #e0e0e0;
  --border-color: #444;
  --card-bg-color: #333;
  --card-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  --nav-bg-color: #222;
  --nav-text-color: #aaa;
  --nav-active-bg: rgba(255, 255, 255, 0.15);
  --nav-hover-bg: rgba(255, 255, 255, 0.05);
  --nav-active-text: #ffffff;
  --input-bg: #3a3a3a;
  --input-border: #555;
  --input-text: #e0e0e0;
  --button-primary-bg: #388E3C;
  --button-primary-text: white;
  --button-secondary-bg: #444;
  --button-secondary-text: #e0e0e0;
}

body {
  margin: 0;
  background-color: var(--bg-color);
  color: var(--text-color);
  transition: background-color var(--transition-speed), color var(--transition-speed);
}

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: var(--text-color);
}

.app-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

header {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 40px;
}

.logo {
  height: 60px;
  margin-right: 15px;
  transition: filter var(--transition-speed);
}

body.dark-theme .logo {
  filter: brightness(0.9);
}

h1 {
  margin: 0;
  font-size: 28px;
  color: var(--header-color);
  transition: color var(--transition-speed);
}

main {
  background-color: var(--main-bg-color);
  border-radius: 8px;
  box-shadow: var(--card-shadow);
  overflow: hidden;
  transition: background-color var(--transition-speed), box-shadow var(--transition-speed);
}

.content {
  min-height: 400px;
}
</style>
