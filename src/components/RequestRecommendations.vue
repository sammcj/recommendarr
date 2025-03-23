<template>
  <div class="recommendations">
    <div class="recommendation-header">
      <h2>{{ isMovieMode ? 'Movie Recommendations' : 'TV Show Recommendations' }}</h2>
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
          <div class="settings-container">
            <div class="settings-header" @click="toggleSettings">
              <h3>Configuration <span class="toggle-icon">{{ settingsExpanded ? '▼' : '▶' }}</span></h3>
            </div>
            <div class="settings-content" :class="{ 'collapsed': !settingsExpanded }">
              <div class="settings-layout">
              <div class="settings-left">
                <div class="info-section">
                  <h3 class="info-section-title collapsible-header" @click="toggleConfiguration">
                    Current Configuration
                    <span class="toggle-icon">{{ configurationExpanded ? '▼' : '▶' }}</span>
                  </h3>
                  <div class="model-info config-content" :class="{ 'collapsed': !configurationExpanded }" v-show="configurationExpanded">
                    <div class="model-header">
                      <span class="current-model">Model:</span>
                      <button 
                        @click.stop="fetchModels" 
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
                      <div v-if="fetchError" class="fetch-error" @click="goToSettings">{{ fetchError }} <span class="error-link">Click to configure API settings</span></div>
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
                      <div class="slider-header">
                        <label for="temperature-slider">Temperature</label>
                        <span class="slider-value">{{ temperature.toFixed(1) }}</span>
                      </div>
                      <div class="modern-slider-container">
                        <div class="slider-labels">
                          <span>Creative</span>
                          <span>Precise</span>
                        </div>
                        <div class="slider-track-container">
                          <input 
                            type="range" 
                            id="temperature-slider"
                            v-model.number="temperature"
                            min="0" 
                            max="1"
                            step="0.1"
                            class="modern-slider"
                            @change="updateTemperature"
                          />
                          <div class="slider-track" :style="{ width: `${temperature * 100}%` }"></div>
                        </div>
                      </div>
                    </div>
                    
                    <div class="library-mode-toggle">
                      <label class="checkbox-label">
                        <input 
                          type="checkbox" 
                          v-model="useSampledLibrary" 
                          @change="saveLibraryModePreference"
                        >
                        Use Sampled Library Mode
                      </label>
                      <div class="setting-description">
                        Samples a subset of your library to reduce token usage while still providing relevant recommendations.
                      </div>
                    </div>
                    
                    <div v-if="useSampledLibrary" class="sample-size-control">
                        <div class="slider-header">
                          <label for="sampleSizeSlider">Sample size</label>
                          <span class="slider-value">{{ sampleSize }}</span>
                        </div>
                        <div class="modern-slider-container">
                          <div class="slider-track-container">
                            <input 
                              type="range" 
                              id="sampleSizeSlider"
                              v-model.number="sampleSize"
                              min="5" 
                              max="1000"
                              class="modern-slider"
                              @change="saveSampleSize"
                            >
                            <div class="slider-track"></div>
                          </div>
                          <div class="slider-range-labels">
                            <span>5</span>
                            <span>1000</span>
                          </div>
                        </div>
                      </div>

                      <div class="experimental-toggle">
                        <label class="checkbox-label">
                          <input 
                            type="checkbox" 
                            v-model="useStructuredOutput" 
                            @change="saveStructuredOutputPreference"
                          >
                          Use Structured Output (Experimental)
                        </label>
                        <div class="setting-description">
                          Uses OpenAI's JSON schema feature for more reliable and consistent LLM results formatting.
                          Check if your model supports Structured Outputs. Disable if you are seeing failures or inconsistent recommendation counts.
                          <span class="experimental-badge">BETA</span>
                        </div>
                      </div>
                    </div>
                  
                    <div class="config-section">
                      <div class="section-label">Display Options:</div>
                      
                      <div class="config-item">
                        <div class="slider-header">
                          <label for="recommendationsSlider">Number of recommendations</label>
                          <div class="header-right">
                            <span class="slider-value">{{ numRecommendations }}</span>
                            <span class="toggle-icon" @click.stop="toggleRecNumber">{{ recNumberExpanded ? '▼' : '▶' }}</span>
                          </div>
                        </div>
                        <div class="rec-number-content" :class="{ 'collapsed': !recNumberExpanded }" v-show="recNumberExpanded">
                          <div class="modern-slider-container">
                            <div class="slider-track-container">
                              <input 
                                type="range" 
                                id="recommendationsSlider"
                                v-model.number="numRecommendations"
                                min="1" 
                                max="50"
                                class="modern-slider"
                                @change="saveRecommendationCount"
                              >
                              <div class="slider-track" :style="{ width: `${(numRecommendations - 1) / 49 * 100}%` }"></div>
                            </div>
                            <div class="slider-range-labels">
                              <span>1</span>
                              <span>50</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div class="config-item">
                        <div class="slider-header">
                          <label for="columnsSlider">Posters per row</label>
                          <div class="header-right">
                            <span class="slider-value">{{ columnsCount }}</span>
                            <span class="toggle-icon" @click.stop="togglePostersPerRow">{{ postersPerRowExpanded ? '▼' : '▶' }}</span>
                          </div>
                        </div>
                        <div class="posters-row-content" :class="{ 'collapsed': !postersPerRowExpanded }" v-show="postersPerRowExpanded">
                          <div class="modern-slider-container">
                            <div class="slider-track-container">
                              <input 
                                type="range" 
                                id="columnsSlider"
                                v-model.number="columnsCount"
                                min="1" 
                                max="10"
                                class="modern-slider"
                                @input="handleResize" 
                                @change="saveColumnsCount"
                              >
                              <div class="slider-track"></div>
                            </div>
                            <div class="slider-range-labels">
                              <span>1</span>
                              <span>10</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div class="history-info">
                    <span>{{ previousRecommendations.length }} {{ isMovieMode ? 'movies' : 'shows' }} in history</span>
                    <button 
                      v-if="previousRecommendations.length > 0" 
                      @click="clearRecommendationHistory" 
                      class="clear-history-button"
                      title="Clear recommendation history"
                    >
                      Clear History
                    </button>
                  </div>
                  
                  <!-- <div class="watch-history-section">
                    <h3 class="info-section-title collapsible-header" @click="toggleWatchHistory">
                      Watch History
                      <span class="toggle-icon">{{ watchHistoryExpanded ? '▼' : '▶' }}</span>
                    </h3>
                    <div class="watch-history-content" :class="{ 'collapsed': !watchHistoryExpanded }" v-show="watchHistoryExpanded">
                      <div class="watch-history-info">
                        <p>View your watch history currently being used for recommendations</p>
                        <button 
                          @click="openWatchHistoryModal" 
                          class="view-history-button"
                          title="View watch history"
                        >
                          View Watch History
                        </button>
                      </div>
                    </div>
                  </div> -->
                </div>
              </div>
              
              <div class="settings-right">
                <div class="genre-selector">
                  <div class="section-header collapsible-header" @click="toggleGenrePreferences">
                    <label>Genre preferences</label>
                    <div class="header-right">
                      <span v-if="selectedGenres && selectedGenres.length > 0" class="genre-badge">{{ selectedGenres.length }}</span>
                      <span class="toggle-icon">{{ genrePreferencesExpanded ? '▼' : '▶' }}</span>
                    </div>
                  </div>
                  <div class="genre-content" :class="{ 'collapsed': !genrePreferencesExpanded }" v-show="genrePreferencesExpanded">
                    <div class="genre-tags-container">
                      <div 
                        v-for="genre in availableGenres" 
                        :key="genre.value"
                        :class="['genre-tag', {'selected': selectedGenres && selectedGenres.includes(genre.value)}]"
                        @click="toggleGenre(genre.value)"
                      >
                        {{ genre.label }}
                      </div>
                      <button 
                        v-if="selectedGenres && selectedGenres.length > 0" 
                        @click="clearGenres" 
                        class="clear-all-button"
                        title="Clear all selected genres"
                      >
                        Clear all
                      </button>
                    </div>
                  </div>
                </div>
                
                <div class="vibe-selector">
                  <div class="section-header collapsible-header" @click="toggleCustomVibe">
                    <label for="customVibe">Recommendation Style</label>
                    <div class="header-right">
                      <button 
                        v-if="customVibe" 
                        @click.stop="clearCustomVibe" 
                        class="clear-prompt-button"
                        title="Clear prompt"
                      >
                        Clear
                      </button>
                      <span class="toggle-icon">{{ customVibeExpanded ? '▼' : '▶' }}</span>
                    </div>
                  </div>
                  <div class="vibe-content" :class="{ 'collapsed': !customVibeExpanded }" v-show="customVibeExpanded">
                    <div class="prompt-style-selector">
                      <label for="promptStyle">Prompt Style:</label>
                      <div class="select-container">
                        <select 
                          id="promptStyle" 
                          v-model="promptStyle"
                          @change="savePromptStyle"
                          class="prompt-style-select"
                        >
                          <option value="vibe">Vibe-Based</option>
                          <option value="analytical">Analytical</option>
                          <option value="creative">Creative</option>
                          <option value="technical">Technical</option>
                        </select>
                        <svg class="select-arrow-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M6 9L12 15L18 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                      </div>
                      
                      <div class="prompt-option-toggle">
                        <div class="toggle-header">
                          <span class="toggle-label">Only base results on custom prompt</span>
                          <label class="switch">
                            <input 
                              type="checkbox" 
                              v-model="useCustomPromptOnly" 
                              @change="saveCustomPromptOnlyPreference"
                            >
                            <span class="slider round"></span>
                          </label>
                        </div>
                        <div class="setting-description">
                          Recommendations will be based solely on the "Additional Keywords/Themes" field. Library and watch history will not be included in the prompt.
                        </div>
                      </div>
                      
                      <!-- Prompt Style Help Text -->
                      <div class="prompt-style-help">
                        <div v-if="promptStyle === 'vibe'" class="prompt-style-info">
                          <h4>Vibe-Based Style</h4>
                          <p>Focuses on the emotional atmosphere and sensory experience of content in your library. Recommendations prioritize matching the <em>feeling</em> and mood of your favorite shows/movies rather than just genre or plot similarities.</p>
                          <p>Best for: Finding content that <em>feels</em> similar to what you love, capturing specific tones and atmospheres.</p>
                        </div>
                        <div v-if="promptStyle === 'analytical'" class="prompt-style-info">
                          <h4>Analytical Style</h4>
                          <p>Performs a detailed examination of narrative structures, thematic patterns, and formal techniques. Recommendations are based on substantive analysis of cinematic/television elements that connect works on a deeper level.</p>
                          <p>Best for: Intellectual exploration and discovering content with similar artistic approaches or thematic depth.</p>
                        </div>
                        <div v-if="promptStyle === 'creative'" class="prompt-style-info">
                          <h4>Creative Style</h4>
                          <p>Looks beyond conventional categorizations to find unexpected connections between works. Prioritizes emotional journeys, artistic vision, and creative storytelling approaches.</p>
                          <p>Best for: Discovering surprising recommendations that might not seem related at first glance but share creative DNA.</p>
                        </div>
                        <div v-if="promptStyle === 'technical'" class="prompt-style-info">
                          <h4>Technical Style</h4>
                          <p>Focuses on production craft, filmmaking/television techniques, and technical execution. Analyzes directorial methods, cinematography, editing styles, and production elements.</p>
                          <p>Best for: Appreciation of craft elements and finding content with similar production quality or technical innovation.</p>
                        </div>
                      </div>
                    </div>
                    
                    <div class="vibe-input-container">
                      <label for="customVibe">Additional Keywords/Themes:</label>
                      <textarea 
                        id="customVibe" 
                        v-model="customVibe"
                        @change="saveCustomVibe"
                        @input="this.recommendationsRequested = false"
                        placeholder="e.g., cozy mysteries, dark comedy, mind-bending, nostalgic 90s feel..."
                        class="vibe-input"
                        rows="2"
                      ></textarea>
                    </div>
                    <div class="setting-tip">
                      <svg class="tip-icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z" stroke="currentColor" stroke-width="1.5"/>
                        <path d="M10 14V10M10 6H10.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                      </svg>
                      <span>Choose a prompt style and add specific themes or preferences</span>
                    </div>
                  </div>
                </div>
                
                <div class="language-selector">
                  <div class="section-header collapsible-header" @click="toggleContentLanguage">
                    <label for="languageSelect">Content language</label>
                    <div class="header-right">
                      <span v-if="selectedLanguage" class="language-badge">{{ getLanguageName(selectedLanguage) }}</span>
                      <span class="toggle-icon">{{ contentLanguageExpanded ? '▼' : '▶' }}</span>
                    </div>
                  </div>
                  <div class="language-content" :class="{ 'collapsed': !contentLanguageExpanded }" v-show="contentLanguageExpanded">
                    <div class="select-wrapper">
                      <select 
                        id="languageSelect" 
                        v-model="selectedLanguage"
                        @change="saveLanguagePreference"
                        class="language-select"
                      >
                        <option value="">Any language</option>
                        <option v-for="lang in availableLanguages" :key="lang.code" :value="lang.code">
                          {{ lang.name }}
                        </option>
                      </select>
                      <svg class="select-arrow-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 9L12 15L18 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </div>
                    <div class="setting-tip">
                      <svg class="tip-icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z" stroke="currentColor" stroke-width="1.5"/>
                        <path d="M10 14V10M10 6H10.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                      </svg>
                      <span>Focus recommendations on content in a specific language</span>
                    </div>
                  </div>
                </div>
                
                <div v-if="plexConfigured" class="plex-options">
                  <div class="service-header collapsible-header" @click="togglePlexHistory">
                    <label>Plex Watch History:</label>
                    <div class="header-right">
                      <div class="service-controls">
                        <label class="toggle-switch">
                          <input 
                            type="checkbox" 
                            v-model="plexUseHistory" 
                            @change="savePlexUseHistory"
                            @click.stop
                          >
                          <span class="toggle-slider"></span>
                          <span class="toggle-label">{{ plexUseHistory ? 'Include' : 'Exclude' }}</span>
                        </label>
                      </div>
                      <span class="toggle-icon">{{ plexHistoryExpanded ? '▼' : '▶' }}</span>
                    </div>
                  </div>
                  
                  <div v-if="plexUseHistory" class="service-settings plex-content" :class="{ 'collapsed': !plexHistoryExpanded }" v-show="plexHistoryExpanded">
                    <div class="plex-history-toggle">
                      <div class="history-selection">
                        <label class="toggle-option">
                          <input 
                            type="radio" 
                            v-model="plexHistoryMode" 
                            value="all"
                            @change="savePlexHistoryMode"
                          >
                          All watch history
                        </label>
                        <label class="toggle-option">
                          <input 
                            type="radio" 
                            v-model="plexHistoryMode" 
                            value="recent"
                            @change="savePlexHistoryMode"
                          >
                          Recent (30 days)
                        </label>
                      </div>
                      
                      <div v-if="plexHistoryMode === 'custom'" class="days-slider-container">
                        <div class="slider-header">
                          <label for="plexDaysSlider">Days of history</label>
                          <span class="slider-value">{{ plexCustomHistoryDays }}</span>
                        </div>
                        <div class="modern-slider-container">
                          <div class="slider-track-container">
                            <input 
                              type="range" 
                              id="plexDaysSlider"
                              v-model.number="plexCustomHistoryDays"
                              min="1" 
                              max="365"
                              class="modern-slider"
                              @change="savePlexCustomHistoryDays"
                            >
                            <div class="slider-track" :style="{ width: `${(plexCustomHistoryDays - 1) / 364 * 100}%` }"></div>
                          </div>
                          <div class="slider-range-labels">
                            <span>1</span>
                            <span>365</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div class="plex-only-toggle">
                      <label class="checkbox-label">
                        <input 
                          type="checkbox" 
                          v-model="plexOnlyMode" 
                          @change="savePlexOnlyMode"
                          :disabled="!plexUseHistory"
                        >
                        Use only Plex history for recommendations (ignore library)
                      </label>
                    </div>
                    <br>
                    <button 
                      class="action-button plex-user-select-button"
                      @click="$emit('openPlexUserSelect')"
                      style="padding: 6px 12px; font-size: 13px; background-color: #E5A00D; color: white;"
                    >
                      Change User
                    </button>
                  </div>
                </div>
                
                <div v-if="jellyfinConfigured" class="jellyfin-options">
                  <div class="service-header collapsible-header" @click="toggleJellyfinHistory">
                    <label>Jellyfin Watch History:</label>
                    <div class="header-right">
                      <div class="service-controls">
                        <label class="toggle-switch">
                          <input 
                            type="checkbox" 
                            v-model="jellyfinUseHistory" 
                            @change="saveJellyfinUseHistory"
                            @click.stop
                          >
                          <span class="toggle-slider"></span>
                          <span class="toggle-label">{{ jellyfinUseHistory ? 'Include' : 'Exclude' }}</span>
                        </label>
                      </div>
                      <span class="toggle-icon">{{ jellyfinHistoryExpanded ? '▼' : '▶' }}</span>
                    </div>
                  </div>
                  
                  <div v-if="jellyfinUseHistory" class="service-settings jellyfin-content" :class="{ 'collapsed': !jellyfinHistoryExpanded }" v-show="jellyfinHistoryExpanded">
                    <div class="jellyfin-history-toggle">
                      <div class="history-selection">
                        <label class="toggle-option">
                          <input 
                            type="radio" 
                            v-model="jellyfinHistoryMode" 
                            value="all"
                            @change="saveJellyfinHistoryMode"
                          >
                          All watch history
                        </label>
                        <label class="toggle-option">
                          <input 
                            type="radio" 
                            v-model="jellyfinHistoryMode" 
                            value="recent"
                            @change="saveJellyfinHistoryMode"
                          >
                          Recent (30 days)
                        </label>
                        <label class="toggle-option">
                          <input 
                            type="radio" 
                            v-model="jellyfinHistoryMode" 
                            value="custom"
                            @change="saveJellyfinHistoryMode"
                          >
                          Custom period
                        </label>
                      </div>
                      
                      <div v-if="jellyfinHistoryMode === 'custom'" class="days-slider-container">
                        <div class="slider-header">
                          <label for="jellyfinDaysSlider">Days of history</label>
                          <span class="slider-value">{{ jellyfinCustomHistoryDays }}</span>
                        </div>
                        <div class="modern-slider-container">
                          <div class="slider-track-container">
                            <input 
                              type="range" 
                              id="jellyfinDaysSlider"
                              v-model.number="jellyfinCustomHistoryDays"
                              min="1" 
                              max="365"
                              class="modern-slider"
                              @change="saveJellyfinCustomHistoryDays"
                            >
                            <div class="slider-track" :style="{ width: `${(jellyfinCustomHistoryDays - 1) / 364 * 100}%` }"></div>
                          </div>
                          <div class="slider-range-labels">
                            <span>1</span>
                            <span>365</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div class="jellyfin-only-toggle">
                      <label class="checkbox-label">
                        <input 
                          type="checkbox" 
                          v-model="jellyfinOnlyMode" 
                          @change="saveJellyfinOnlyMode"
                          :disabled="!jellyfinUseHistory"
                        >
                        Use only Jellyfin history for recommendations (ignore library)
                      </label>
                    </div>
                    
                    <button 
                      class="action-button jellyfin-user-select-button"
                      @click="$emit('openJellyfinUserSelect')"
                      style="padding: 6px 12px; font-size: 13px; background-color: #34A853; color: white;"
                    >
                      Change User
                    </button>
                  </div>
                </div>
                
                <div v-if="tautulliConfigured" class="tautulli-options">
                  <div class="service-header collapsible-header" @click="toggleTautulliHistory">
                    <label>Tautulli Watch History:</label>
                    <div class="header-right">
                      <div class="service-controls">
                        <label class="toggle-switch">
                          <input 
                            type="checkbox" 
                            v-model="tautulliUseHistory" 
                            @change="saveTautulliUseHistory"
                            @click.stop
                          >
                          <span class="toggle-slider"></span>
                          <span class="toggle-label">{{ tautulliUseHistory ? 'Include' : 'Exclude' }}</span>
                        </label>
                      </div>
                      <span class="toggle-icon">{{ tautulliHistoryExpanded ? '▼' : '▶' }}</span>
                    </div>
                  </div>
                  
                  <div v-if="tautulliUseHistory" class="service-settings tautulli-content" :class="{ 'collapsed': !tautulliHistoryExpanded }" v-show="tautulliHistoryExpanded">
                    <div class="tautulli-history-toggle">
                      <div class="history-selection">
                        <label class="toggle-option">
                          <input 
                            type="radio" 
                            v-model="tautulliHistoryMode" 
                            value="all"
                            @change="saveTautulliHistoryMode"
                          >
                          All watch history
                        </label>
                        <label class="toggle-option">
                          <input 
                            type="radio" 
                            v-model="tautulliHistoryMode" 
                            value="recent"
                            @change="saveTautulliHistoryMode"
                          >
                          Recent (30 days)
                        </label>
                        <label class="toggle-option">
                          <input 
                            type="radio" 
                            v-model="tautulliHistoryMode" 
                            value="custom"
                            @change="saveTautulliHistoryMode"
                          >
                          Custom period
                        </label>
                      </div>
                      
                      <div v-if="tautulliHistoryMode === 'custom'" class="days-slider-container">
                        <div class="slider-header">
                          <label for="tautulliDaysSlider">Days of history</label>
                          <span class="slider-value">{{ tautulliCustomHistoryDays }}</span>
                        </div>
                        <div class="modern-slider-container">
                          <div class="slider-track-container">
                            <input 
                              type="range" 
                              id="tautulliDaysSlider"
                              v-model.number="tautulliCustomHistoryDays"
                              min="1" 
                              max="365"
                              class="modern-slider"
                              @change="saveTautulliCustomHistoryDays"
                            >
                            <div class="slider-track" :style="{ width: `${(tautulliCustomHistoryDays - 1) / 364 * 100}%` }"></div>
                          </div>
                          <div class="slider-range-labels">
                            <span>1</span>
                            <span>365</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div class="tautulli-only-toggle">
                      <label class="checkbox-label">
                        <input 
                          type="checkbox" 
                          v-model="tautulliOnlyMode" 
                          @change="saveTautulliOnlyMode"
                          :disabled="!tautulliUseHistory"
                        >
                        Use only Tautulli history for recommendations (ignore library)
                      </label>
                    </div>
                    
                    <button 
                      class="action-button tautulli-user-select-button"
                      @click="$emit('openTautulliUserSelect')"
                      style="padding: 6px 12px; font-size: 13px; background-color: #34A853; color: white;"
                    >
                      Change User
                    </button>
                  </div>
                </div>
                
                <div v-if="traktConfigured" class="trakt-options">
                  <div class="service-header collapsible-header" @click="toggleTraktHistory">
                    <label>Trakt Watch History:</label>
                    <div class="header-right">
                      <div class="service-controls">
                        <label class="toggle-switch">
                          <input 
                            type="checkbox" 
                            v-model="traktUseHistory" 
                            @change="saveTraktUseHistory"
                            @click.stop
                          >
                          <span class="toggle-slider"></span>
                          <span class="toggle-label">{{ traktUseHistory ? 'Include' : 'Exclude' }}</span>
                        </label>
                      </div>
                      <span class="toggle-icon">{{ traktHistoryExpanded ? '▼' : '▶' }}</span>
                    </div>
                  </div>
                  
                  <div v-if="traktUseHistory" class="service-settings trakt-content" :class="{ 'collapsed': !traktHistoryExpanded }" v-show="traktHistoryExpanded">
                    <div class="trakt-history-toggle">
                      <div class="history-selection">
                        <label class="toggle-option">
                          <input 
                            type="radio" 
                            v-model="traktHistoryMode" 
                            value="all"
                            @change="saveTraktHistoryMode"
                          >
                          All watch history
                        </label>
                        <label class="toggle-option">
                          <input 
                            type="radio" 
                            v-model="traktHistoryMode" 
                            value="recent"
                            @change="saveTraktHistoryMode"
                          >
                          Recent (30 days)
                        </label>
                        <label class="toggle-option">
                          <input 
                            type="radio" 
                            v-model="traktHistoryMode" 
                            value="custom"
                            @change="saveTraktHistoryMode"
                          >
                          Custom period
                        </label>
                      </div>
                      
                      <div v-if="traktHistoryMode === 'custom'" class="days-slider-container">
                        <div class="slider-header">
                          <label for="traktDaysSlider">Days of history</label>
                          <span class="slider-value">{{ traktCustomHistoryDays }}</span>
                        </div>
                        <div class="modern-slider-container">
                          <div class="slider-track-container">
                            <input 
                              type="range" 
                              id="traktDaysSlider"
                              v-model.number="traktCustomHistoryDays"
                              min="1" 
                              max="365"
                              class="modern-slider"
                              @change="saveTraktCustomHistoryDays"
                            >
                            <div class="slider-track" :style="{ width: `${(traktCustomHistoryDays - 1) / 364 * 100}%` }"></div>
                          </div>
                          <div class="slider-range-labels">
                            <span>1</span>
                            <span>365</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div class="trakt-only-toggle">
                      <label class="checkbox-label">
                        <input 
                          type="checkbox" 
                          v-model="traktOnlyMode" 
                          @change="saveTraktOnlyMode"
                          :disabled="!traktUseHistory"
                        >
                        Use only Trakt history for recommendations (ignore library)
                      </label>
                    </div>
                    
                    <button 
                      class="action-button trakt-refresh-button"
                      @click="$emit('refreshTraktHistory')"
                      style="padding: 6px 12px; font-size: 13px; background-color: #ED2224; color: white; margin-top: 15px;"
                    >
                      Refresh Trakt History
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
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
      
      <div v-if="!error && recommendations.length > 0" class="recommendation-list" :style="gridStyle">
        <div v-for="(rec, index) in recommendations" :key="index" class="recommendation-card" :class="{ 'compact-mode': shouldUseCompactMode, 'expanded': expandedCards.has(index) }">
          <!-- Clean title for poster lookup -->
          <div class="card-content" 
            @click="openTMDBDetailModal(rec)" 
            :class="{ 'clickable': isTMDBAvailable, 'compact-layout': shouldUseCompactMode }"
            :title="isTMDBAvailable ? 'Click for more details' : ''"
          >
            <!-- Expand info button for compact mode moved to end of card -->
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
                  @click.stop.prevent="retryPoster(rec.title)"
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
              
              <div v-if="rec.rating" class="rating-badge" 
                :class="getScoreClass(rec.rating)"
                :data-rating="extractScore(rec.rating) + '%'">
              </div>
            </div>
            
            <div class="details-container">
              <div class="card-header">
                <h3>{{ rec.title }}</h3>
                <div class="card-actions">
                  <div class="like-dislike-buttons">
                    <button 
                      @click.stop="likeRecommendation(rec.title)" 
                      class="action-btn like-btn"
                      :class="{'active': isLiked(rec.title)}"
                      title="Like this recommendation">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                      </svg>
                    </button>
                    <button 
                      @click.stop="dislikeRecommendation(rec.title)" 
                      class="action-btn dislike-btn"
                      :class="{'active': isDisliked(rec.title)}"
                      title="Dislike this recommendation">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm10-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"></path>
                      </svg>
                    </button>
                  </div>
                  <button 
                    @click.stop="requestSeries(rec.title)" 
                    class="request-button"
                    :class="{'loading': requestingSeries === rec.title, 'requested': requestStatus[rec.title]?.success}"
                    :disabled="requestingSeries || requestStatus[rec.title]?.success"
                    :title="isMovieMode ? 'Add to Radarr' : 'Add to Sonarr'">
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
              </div>
              
              <div class="content-container">
                <div v-if="rec.description" class="description">
                  <p>{{ rec.description }}</p>
                </div>
                
                <div v-if="rec.reasoning" class="reasoning">
                  <div class="reasoning-header">
                    <div class="reasoning-icon">✨</div>
                    <span class="reasoning-label">Why you might like it</span>
                  </div>
                  <div class="reasoning-content">
                    <p>{{ rec.reasoning }}</p>
                  </div>
                </div>
                
                <div v-if="rec.rating" class="rating-info"></div>
                
                
                <div v-if="!rec.description && !rec.reasoning" class="full-text">
                  <p>{{ rec.fullText }}</p>
                </div>
              </div>
              
              <!-- Full-width expand button at bottom of card for compact mode -->
              <button v-if="shouldUseCompactMode" 
                      class="full-width-expand-button" 
                      @click.stop="toggleCardExpansion(index)"
                      :title="expandedCards.has(index) ? 'Hide details' : 'Show more details'"
                      :class="{ 'expanded': expandedCards.has(index) }">
                <span>{{ expandedCards.has(index) ? 'Show Less' : 'Show More' }}</span>
                <svg v-if="!expandedCards.has(index)" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="7 13 12 18 17 13"></polyline>
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="7 11 12 6 17 11"></polyline>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
      
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
import imageService from '../services/ImageService';
import sonarrService from '../services/SonarrService';
import radarrService from '../services/RadarrService';
import apiService from '../services/ApiService';
import TMDBDetailModal from './TMDBDetailModal.vue';

export default {
  name: 'TVRecommendations',
  components: {
    TMDBDetailModal
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
    shouldUseCompactMode() {
      // Improved compact mode detection that works better on all screen sizes
      
      // Already responsive on mobile with single column
      if (window.innerWidth <= 600) return false;
      
      // Get the current app container width based on responsive design
      let containerWidth;
      if (window.innerWidth >= 2560) {
        // Very large screens (4K, etc)
        containerWidth = Math.min(window.innerWidth * 0.8, 3000);
      } else if (window.innerWidth >= 1920) {
        // Large screens
        containerWidth = Math.min(window.innerWidth * 0.85, 2400);
      } else {
        // Standard screens
        containerWidth = Math.min(window.innerWidth * 0.95, 1600);
      }
      
      // Account for container padding and card gaps
      const containerPadding = 40; // Container padding (20px on each side)
      const cardGap = 20; // Gap between cards (from CSS)
      const availableWidth = containerWidth - containerPadding;
      
      // Calculate the width each card would have, accounting for gaps
      const gapSpace = (this.columnsCount - 1) * cardGap;
      const cardWidth = (availableWidth - gapSpace) / this.columnsCount;
      
      // Use compact mode if cards would be narrower than 340px
      // For larger screens with more columns, we might want a slightly different threshold
      const compactThreshold = (this.columnsCount >= 6) ? 300 : 340;
      
      // Debug message to help troubleshoot
      console.log(`Card width calculation: ${cardWidth}px with ${this.columnsCount} columns, threshold: ${compactThreshold}px`);
      
      return cardWidth < compactThreshold;
    },
    
    gridStyle() {
      // Get screen width and user's column preference
      const screenWidth = window.innerWidth;
      const userColumnCount = this.columnsCount;
      
      // On mobile devices, we use a simpler approach
      if (screenWidth <= 600) {
        return {
          gridTemplateColumns: '1fr', // Single column for mobile
          gap: '15px'
        };
      }
      
      // For tablets (small screens)
      if (screenWidth <= 840) {
        const columns = Math.min(2, userColumnCount);
        return {
          gridTemplateColumns: `repeat(${columns}, 1fr)`
        };
      }
      
      // For larger screens: use exact number of columns based on user preference
      return {
        gridTemplateColumns: `repeat(${userColumnCount}, 1fr)`
      };
    },
    
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
    
    // Computed property to check if TMDB integration is available
    isTMDBAvailable() {
      return imageService.isTMDBAvailable();
    }
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
      openaiConfigured: openAIService.isConfigured(), // Initialize with current configuration state
      recommendations: [],
      expandedCards: new Set(), // Track which cards are in expanded view
      loading: false,
      error: null,
      recommendationsRequested: false,
      posters: new Map(), // Using a reactive Map for poster URLs
      loadingPosters: new Map(), // Track which posters are being loaded
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
      useCustomPromptOnly: false, // Whether to base recommendations solely on custom prompt
      useStructuredOutput: false, // Whether to use OpenAI's structured output feature - default to off
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
    // Handle window resize for responsive features like compact mode
    handleWindowResize() {
      // This triggers a reactivity update for the shouldUseCompactMode computed property
      this.$forceUpdate();
    },
    
    // Toggle card expansion in compact mode
    toggleCardExpansion(index) {
      if (this.expandedCards.has(index)) {
        this.expandedCards.delete(index);
      } else {
        this.expandedCards.add(index);
      }
      // Force a reactivity update since Set mutations aren't automatically detected
      this.$forceUpdate();
    },
    
    // Watch history modal methods
    async openWatchHistoryModal() {
      this.showWatchHistoryModal = true;
      this.currentHistoryPage = 1;
      this.historySourceFilter = 'all';
      this.historyTypeFilter = 'all';
      this.historySearchFilter = '';
      
      // Log data directly when modal is opened
      console.log('MODAL OPENED - DIRECT DATA CHECK:');
      console.log('Movies data when modal opened:', this.movies);
      console.log('Shows data when modal opened:', this.recentlyWatchedShows);
      
      // Create temporary watch history data for testing
      // This will be a "global" property that the computed property can access
      this._watchHistoryData = [];
      
      // Add movies from the movies prop
      if (this.movies && this.movies.length > 0) {
        this._watchHistoryData = this.movies.map(movie => ({
          ...movie,
          title: movie.title,
          type: 'movie',
          source: 'plex',
          // Convert Unix timestamp to readable date if needed
          watchedDate: movie.viewedAt ? new Date(movie.viewedAt * 1000).toISOString() : new Date().toISOString()
        }));
        console.log('Created watch history data with movies:', this._watchHistoryData.length);
      }
      
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
          const movieRecsResponse = await apiService.getRecommendationsReadOnly('movie') || [];
          if (Array.isArray(movieRecsResponse) && movieRecsResponse.length > 0) {
            console.log(`Loaded ${movieRecsResponse.length} movie recommendations from server on activation (read-only)`);
            this.previousMovieRecommendations = movieRecsResponse;
            this.previousRecommendations = [...this.previousMovieRecommendations];
          }
        } else {
          const tvRecsResponse = await apiService.getRecommendationsReadOnly('tv') || [];
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
        
        // Reload the previous recommendations from the server after switching content type
        try {
          console.log("Content type changed, reloading recommendations from server...");
          if (isMovie) {
            // Switching to movie mode - reload movie recommendations
            const movieRecsResponse = await apiService.getRecommendations('movie') || [];
            if (Array.isArray(movieRecsResponse) && movieRecsResponse.length > 0) {
              console.log(`Loaded ${movieRecsResponse.length} movie recommendations from server after content type change`);
              this.previousMovieRecommendations = movieRecsResponse;
              this.previousRecommendations = [...this.previousMovieRecommendations];
            }
          } else {
            // Switching to TV mode - reload TV recommendations
            const tvRecsResponse = await apiService.getRecommendations('tv') || [];
            if (Array.isArray(tvRecsResponse) && tvRecsResponse.length > 0) {
              console.log(`Loaded ${tvRecsResponse.length} TV recommendations from server after content type change`);
              this.previousShowRecommendations = tvRecsResponse;
              this.previousRecommendations = [...this.previousShowRecommendations];
            }
          }
        } catch (error) {
          console.error("Error reloading recommendations after content type change:", error);
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
        // Fallback to localStorage
        localStorage.setItem('contentTypePreference', this.isMovieMode ? 'movies' : 'tvshows');
        localStorage.setItem('isMovieMode', this.isMovieMode.toString());
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
        // Try to get the poster with cache disabled based on content type
        const posterUrl = this.isMovieMode
          ? await imageService.getPosterForMovie(clean, true)
          : await imageService.getPosterForShow(clean, true);
        
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
    async saveRecommendationCount() {
      try {
        console.log('Saving numRecommendations to server:', this.numRecommendations);
        await apiService.saveSettings({ numRecommendations: this.numRecommendations });
        
        // Also save to localStorage as a backup
        localStorage.setItem('numRecommendations', this.numRecommendations.toString());
      } catch (error) {
        console.error('Error saving recommendation count to server:', error);
        // Fallback to localStorage only
        localStorage.setItem('numRecommendations', this.numRecommendations.toString());
      }
    },
    
    
    async saveColumnsCount() {
      try {
        console.log('Saving columnsCount to server:', this.columnsCount);
        await apiService.saveSettings({ columnsCount: this.columnsCount });
        
        // Also save to localStorage as a backup
        localStorage.setItem('columnsCount', this.columnsCount.toString());
        
        // Clear expanded cards when column count changes
        this.expandedCards.clear();
        
        // Force grid layout to update with new column count
        this.$nextTick(() => {
          this.handleResize();
        });
      } catch (error) {
        console.error('Error saving columns count to server:', error);
        // Fallback to localStorage only
        localStorage.setItem('columnsCount', this.columnsCount.toString());
        
        // Still clear expanded cards even on error
        this.expandedCards.clear();
        
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
        // Fallback to localStorage
        localStorage.setItem('tvGenrePreferences', JSON.stringify(this.selectedGenres));
      }
    },
    
    // Toggle a genre selection
    toggleGenre(genreValue) {
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
    async saveCustomVibe() {
      try {
        await apiService.saveSettings({ tvCustomVibe: this.customVibe });
        // Reset OpenAI conversation context when vibe changes
        openAIService.resetConversation();
        console.log('Custom vibe updated, conversation history cleared');
      } catch (error) {
        console.error('Error saving custom vibe to server:', error);
        // Fallback to localStorage
        localStorage.setItem('tvCustomVibe', this.customVibe);
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
    async savePromptStyle() {
      try {
        // Set the promptStyle in OpenAIService
        openAIService.setPromptStyle(this.promptStyle);
        
        // Save to server
        await apiService.saveSettings({ promptStyle: this.promptStyle });
        
        // Reset OpenAI conversation context when prompt style changes
        openAIService.resetConversation();
        console.log('Prompt style updated to:', this.promptStyle, 'conversation history cleared');
        
        // Reset recommendations when changing prompt style
        this.recommendationsRequested = false;
      } catch (error) {
        console.error('Error saving prompt style to server:', error);
        // Fallback to localStorage
        localStorage.setItem('promptStyle', this.promptStyle);
        // Still reset conversation even if server save fails
        openAIService.resetConversation();
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
        } else {
          // If not available from server, try localStorage
          const localPromptStyle = localStorage.getItem('promptStyle');
          if (localPromptStyle) {
            this.promptStyle = localPromptStyle;
            console.log('Loaded prompt style from localStorage:', this.promptStyle);
          }
        }
        
        // Set the promptStyle in OpenAIService
        openAIService.setPromptStyle(this.promptStyle);
      } catch (error) {
        console.error('Error loading prompt style:', error);
        // If error loading from server, try localStorage
        const localPromptStyle = localStorage.getItem('promptStyle');
        if (localPromptStyle) {
          this.promptStyle = localPromptStyle;
          openAIService.setPromptStyle(this.promptStyle);
        }
      }
    },
    
    // Save language preference to server
    async saveLanguagePreference() {
      try {
        await apiService.saveSettings({ tvLanguagePreference: this.selectedLanguage });
      } catch (error) {
        console.error('Error saving language preference to server:', error);
        // Fallback to localStorage
        localStorage.setItem('tvLanguagePreference', this.selectedLanguage);
      }
    },
    
    // Get language name from code
    getLanguageName(code) {
      if (!code) return '';
      const language = this.availableLanguages.find(lang => lang.code === code);
      return language ? language.name : code;
    },
    
    // Save Plex history mode preference
    async savePlexHistoryMode() {
      try {
        // Save to User_Data.json via API service
        await apiService.saveSettings({ 
          plexHistoryMode: this.plexHistoryMode,
          plexCustomHistoryDays: this.plexCustomHistoryDays
        });
        this.$emit('plexHistoryModeChanged', this.plexHistoryMode);
        
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
    async savePlexUseHistory() {
      try {
        // Save to User_Data.json via API service
        await apiService.saveSettings({ plexUseHistory: this.plexUseHistory });
        
        // If turning off history usage, also turn off the plex-only mode
        if (!this.plexUseHistory && this.plexOnlyMode) {
          this.plexOnlyMode = false;
          await this.savePlexOnlyMode();
        }
      } catch (error) {
        console.error('Error saving Plex use history preference to server:', error);
      }
    },
    
    // Save Plex custom history days
    async savePlexCustomHistoryDays() {
      try {
        // Save to User_Data.json via API service
        await apiService.saveSettings({ plexCustomHistoryDays: this.plexCustomHistoryDays });
        
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
    async saveJellyfinHistoryMode() {
      try {
        // Save to User_Data.json via API service
        await apiService.saveSettings({ 
          jellyfinHistoryMode: this.jellyfinHistoryMode,
          jellyfinCustomHistoryDays: this.jellyfinCustomHistoryDays
        });
        this.$emit('jellyfinHistoryModeChanged', this.jellyfinHistoryMode);
        
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
    async saveJellyfinUseHistory() {
      try {
        // Save to User_Data.json via API service
        await apiService.saveSettings({ jellyfinUseHistory: this.jellyfinUseHistory });
        
        // If turning off history usage, also turn off the jellyfin-only mode
        if (!this.jellyfinUseHistory && this.jellyfinOnlyMode) {
          this.jellyfinOnlyMode = false;
          await this.saveJellyfinOnlyMode();
        }
      } catch (error) {
        console.error('Error saving Jellyfin use history preference to server:', error);
      }
    },
    
    // Save Jellyfin custom history days
    async saveJellyfinCustomHistoryDays() {
      try {
        // Save to User_Data.json via API service
        await apiService.saveSettings({ jellyfinCustomHistoryDays: this.jellyfinCustomHistoryDays });
        
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
    async savePlexOnlyMode() {
      try {
        // If enabling Plex only mode, disable other only modes
        if (this.plexOnlyMode) {
          const settings = { plexOnlyMode: this.plexOnlyMode };
          
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
          await apiService.saveSettings({ plexOnlyMode: this.plexOnlyMode });
        }
        
        this.$emit('plexOnlyModeChanged', this.plexOnlyMode);
      } catch (error) {
        console.error('Error saving Plex only mode to server:', error);
        // Fallback to localStorage
        localStorage.setItem('plexOnlyMode', this.plexOnlyMode.toString());
        
        // If enabling Plex only mode, disable other only modes
        if (this.plexOnlyMode) {
          if (this.jellyfinOnlyMode) {
            this.jellyfinOnlyMode = false;
            localStorage.setItem('jellyfinOnlyMode', 'false');
            this.$emit('jellyfinOnlyModeChanged', false);
          }
          
          if (this.tautulliOnlyMode) {
            this.tautulliOnlyMode = false;
            localStorage.setItem('tautulliOnlyMode', 'false');
            this.$emit('tautulliOnlyModeChanged', false);
          }
          
          if (this.traktOnlyMode) {
            this.traktOnlyMode = false;
            localStorage.setItem('traktOnlyMode', 'false');
            this.$emit('traktOnlyModeChanged', false);
          }
        }
        
        this.$emit('plexOnlyModeChanged', this.plexOnlyMode);
      }
    },
    
    // Save Jellyfin only mode preference
    async saveJellyfinOnlyMode() {
      try {
        // If enabling Jellyfin only mode, disable other only modes
        if (this.jellyfinOnlyMode) {
          const settings = { jellyfinOnlyMode: this.jellyfinOnlyMode };
          
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
          await apiService.saveSettings({ jellyfinOnlyMode: this.jellyfinOnlyMode });
        }
        
        this.$emit('jellyfinOnlyModeChanged', this.jellyfinOnlyMode);
      } catch (error) {
        console.error('Error saving Jellyfin only mode to server:', error);
        // Fallback to localStorage
        localStorage.setItem('jellyfinOnlyMode', this.jellyfinOnlyMode.toString());
        
        // If enabling Jellyfin only mode, disable other only modes
        if (this.jellyfinOnlyMode) {
          if (this.plexOnlyMode) {
            this.plexOnlyMode = false;
            localStorage.setItem('plexOnlyMode', 'false');
            this.$emit('plexOnlyModeChanged', false);
          }
          
          if (this.tautulliOnlyMode) {
            this.tautulliOnlyMode = false;
            localStorage.setItem('tautulliOnlyMode', 'false');
            this.$emit('tautulliOnlyModeChanged', false);
          }
          
          if (this.traktOnlyMode) {
            this.traktOnlyMode = false;
            localStorage.setItem('traktOnlyMode', 'false');
            this.$emit('traktOnlyModeChanged', false);
          }
        }
        
        this.$emit('jellyfinOnlyModeChanged', this.jellyfinOnlyMode);
      }
    },
    
    // Save Tautulli history mode preference
    async saveTautulliHistoryMode() {
      try {
        // Save to User_Data.json via API service
        await apiService.saveSettings({ 
          tautulliHistoryMode: this.tautulliHistoryMode,
          tautulliCustomHistoryDays: this.tautulliCustomHistoryDays
        });
        this.$emit('tautulliHistoryModeChanged', this.tautulliHistoryMode);
      } catch (error) {
        console.error('Error saving Tautulli history mode to server:', error);
      }
    },
    
    // Save Tautulli use history preference
    async saveTautulliUseHistory() {
      try {
        // Save to User_Data.json via API service
        await apiService.saveSettings({ tautulliUseHistory: this.tautulliUseHistory });
        
        // If turning off history usage, also turn off the tautulli-only mode
        if (!this.tautulliUseHistory && this.tautulliOnlyMode) {
          this.tautulliOnlyMode = false;
          await this.saveTautulliOnlyMode();
        }
      } catch (error) {
        console.error('Error saving Tautulli use history preference to server:', error);
      }
    },
    
    // Save Tautulli custom history days
    async saveTautulliCustomHistoryDays() {
      try {
        // Save to User_Data.json via API service
        await apiService.saveSettings({ tautulliCustomHistoryDays: this.tautulliCustomHistoryDays });
      } catch (error) {
        console.error('Error saving Tautulli custom history days to server:', error);
      }
    },
    
    // Save Tautulli only mode preference
    async saveTautulliOnlyMode() {
      try {
        // If enabling Tautulli only mode, disable Plex only mode, Jellyfin only mode, and Trakt only mode
        if (this.tautulliOnlyMode) {
          const settings = { tautulliOnlyMode: this.tautulliOnlyMode };
          
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
        // Fallback to localStorage
        localStorage.setItem('tautulliOnlyMode', this.tautulliOnlyMode.toString());
        
        // If enabling Tautulli only mode, disable other only modes
        if (this.tautulliOnlyMode) {
          if (this.plexOnlyMode) {
            this.plexOnlyMode = false;
            localStorage.setItem('plexOnlyMode', 'false');
            this.$emit('plexOnlyModeChanged', false);
          }
          if (this.jellyfinOnlyMode) {
            this.jellyfinOnlyMode = false;
            localStorage.setItem('jellyfinOnlyMode', 'false');
            this.$emit('jellyfinOnlyModeChanged', false);
          }
          if (this.traktOnlyMode) {
            this.traktOnlyMode = false;
            localStorage.setItem('traktOnlyMode', 'false');
            this.$emit('traktOnlyModeChanged', false);
          }
        }
        
        this.$emit('tautulliOnlyModeChanged', this.tautulliOnlyMode);
      }
    },
    
    // Save Trakt history mode preference
    async saveTraktHistoryMode() {
      try {
        // Save to User_Data.json via API service
        await apiService.saveSettings({ 
          traktHistoryMode: this.traktHistoryMode,
          traktCustomHistoryDays: this.traktCustomHistoryDays
        });
        this.$emit('traktHistoryModeChanged', this.traktHistoryMode);
      } catch (error) {
        console.error('Error saving Trakt history mode to server:', error);
      }
    },
    
    // Save Trakt use history preference
    async saveTraktUseHistory() {
      console.log('Saving Trakt use history preference:', this.traktUseHistory);
      try {
        // Explicitly convert to boolean to avoid any string conversion issues
        const useHistoryValue = this.traktUseHistory === true;
        
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
    async saveTraktCustomHistoryDays() {
      try {
        // Save to User_Data.json via API service
        await apiService.saveSettings({ traktCustomHistoryDays: this.traktCustomHistoryDays });
      } catch (error) {
        console.error('Error saving Trakt custom history days to server:', error);
      }
    },
    
    // Save Trakt only mode preference
    async saveTraktOnlyMode() {
      try {
        // If enabling Trakt only mode, disable other only modes
        if (this.traktOnlyMode) {
          const settings = { traktOnlyMode: this.traktOnlyMode };
          
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
        // Fallback to localStorage
        localStorage.setItem('traktOnlyMode', this.traktOnlyMode.toString());
        
        // If enabling Trakt only mode, disable other only modes
        if (this.traktOnlyMode) {
          if (this.plexOnlyMode) {
            this.plexOnlyMode = false;
            localStorage.setItem('plexOnlyMode', 'false');
            this.$emit('plexOnlyModeChanged', false);
          }
          if (this.jellyfinOnlyMode) {
            this.jellyfinOnlyMode = false;
            localStorage.setItem('jellyfinOnlyMode', 'false');
            this.$emit('jellyfinOnlyModeChanged', false);
          }
          if (this.tautulliOnlyMode) {
            this.tautulliOnlyMode = false;
            localStorage.setItem('tautulliOnlyMode', 'false');
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
            await apiService.saveRecommendations('movie', this.recommendations);
          } else {
            // Otherwise just save the history titles
            await apiService.saveRecommendations('movie', this.previousMovieRecommendations);
          }
        } else {
          // If we have active recommendations, save them
          if (this.recommendations && this.recommendations.length > 0) {
            await apiService.saveRecommendations('tv', this.recommendations);
          } else {
            // Otherwise just save the history titles
            await apiService.saveRecommendations('tv', this.previousShowRecommendations);
          }
        }
      } catch (error) {
        console.error('Error saving recommendations to server:', error);
        // Fallback to localStorage
        if (this.isMovieMode) {
          // Save both history and current recommendations
          localStorage.setItem('previousMovieRecommendations', JSON.stringify(this.previousMovieRecommendations));
          if (this.recommendations && this.recommendations.length > 0) {
            localStorage.setItem('currentMovieRecommendations', JSON.stringify(this.recommendations));
          }
        } else {
          // Save both history and current recommendations
          localStorage.setItem('previousTVRecommendations', JSON.stringify(this.previousShowRecommendations));
          if (this.recommendations && this.recommendations.length > 0) {
            localStorage.setItem('currentTVRecommendations', JSON.stringify(this.recommendations));
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
          await apiService.saveRecommendations('movie', this.previousMovieRecommendations);
          
          // Store in localStorage for backup only after successfully saving to server
          localStorage.setItem('previousMovieRecommendations', JSON.stringify(this.previousMovieRecommendations));
          localStorage.setItem('currentMovieRecommendations', JSON.stringify(newRecommendations));
        } else {
          // Save only the titles array to the server
          // Ensure all items are valid strings before saving
          const sanitizedRecommendations = this.previousShowRecommendations
            .filter(item => item !== null && item !== undefined)
            .map(item => String(item));
          await apiService.saveRecommendations('tv', sanitizedRecommendations);
          
          // Store in localStorage for backup only after successfully saving to server
          localStorage.setItem('previousTVRecommendations', JSON.stringify(sanitizedRecommendations));
          
          // Also update our local array with the sanitized version to maintain consistency
          this.previousShowRecommendations = sanitizedRecommendations;
          this.previousRecommendations = sanitizedRecommendations;
          
          // Store current recommendations separately
          localStorage.setItem('currentTVRecommendations', JSON.stringify(newRecommendations));
        }
        
        console.log(`Saved ${this.isMovieMode ? 'movie' : 'TV'} recommendation history to server (${this.previousRecommendations.length} items)`);
      } catch (error) {
        console.error('Error saving recommendation history to server:', error);
        
        // Fallback to localStorage
        if (this.isMovieMode) {
          localStorage.setItem('previousMovieRecommendations', JSON.stringify(this.previousMovieRecommendations));
          localStorage.setItem('currentMovieRecommendations', JSON.stringify(newRecommendations));
        } else {
          // Ensure all items are valid strings before saving to localStorage
          const sanitizedRecommendations = this.previousShowRecommendations
            .filter(item => item !== null && item !== undefined)
            .map(item => String(item));
            
          localStorage.setItem('previousTVRecommendations', JSON.stringify(sanitizedRecommendations));
          
          // Also update our local array with the sanitized version to maintain consistency
          this.previousShowRecommendations = sanitizedRecommendations;
          this.previousRecommendations = sanitizedRecommendations;
          
          localStorage.setItem('currentTVRecommendations', JSON.stringify(newRecommendations));
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
          
          // Clear from localStorage
          localStorage.removeItem('previousMovieRecommendations');
          
          // Clear from server
          try {
            await apiService.saveRecommendations('movie', []);
            console.log('Successfully cleared movie history from server');
          } catch (error) {
            console.error('Failed to clear movie history from server:', error);
          }
        } else {
          // Clear TV history
          this.previousShowRecommendations = [];
          this.previousRecommendations = [];
          
          // Clear from localStorage
          localStorage.removeItem('previousTVRecommendations');
          
          // Clear from server
          try {
            await apiService.saveRecommendations('tv', []);
            console.log('Successfully cleared TV history from server');
          } catch (error) {
            console.error('Failed to clear TV history from server:', error);
          }
        }
        
        // No need to call savePreviousRecommendations since we already saved to both localStorage and server
      }
    },
    
    // Update the model selection
    async updateModel() {
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
          await apiService.saveSettings({ openaiModel: this.selectedModel });
          
          // Update service
          openAIService.model = this.selectedModel;
          
          // Also save to the server-side credentials
          await openAIService.configure(
            openAIService.apiKey, 
            this.selectedModel,
            openAIService.baseUrl,
            openAIService.maxTokens,
            openAIService.temperature,
            openAIService.useSampledLibrary,
            openAIService.sampleSize,
            openAIService.useStructuredOutput,
            openAIService.useCustomPromptOnly
          );
        } catch (error) {
          console.error('Error saving model settings:', error);
          // Fallback to localStorage
          localStorage.setItem('openaiModel', this.selectedModel);
          openAIService.model = this.selectedModel;
        }
      }
    },
    
    // Update the custom model name
    async updateCustomModel() {
      if (this.customModel.trim()) {
        try {
          // Save custom model setting to server
          await apiService.saveSettings({ openaiModel: this.customModel });
          
          // Update service
          openAIService.model = this.customModel;
          
          // Also save to the server-side credentials
          await openAIService.configure(
            openAIService.apiKey, 
            this.customModel,
            openAIService.baseUrl,
            openAIService.maxTokens,
            openAIService.temperature,
            openAIService.useSampledLibrary,
            openAIService.sampleSize,
            openAIService.useStructuredOutput,
            openAIService.useCustomPromptOnly
          );
        } catch (error) {
          console.error('Error saving custom model settings:', error);
          // Fallback to localStorage
          localStorage.setItem('openaiModel', this.customModel);
          openAIService.model = this.customModel;
        }
      }
    },
    
    // Update temperature and save to server
    async updateTemperature() {
      try {
        console.log('Saving temperature to server:', this.temperature);
        await apiService.saveSettings({ aiTemperature: this.temperature.toString() });
        
        // Also save to localStorage as a backup
        localStorage.setItem('aiTemperature', this.temperature.toString());
        
        // Update in OpenAI service
        openAIService.temperature = this.temperature;
      } catch (error) {
        console.error('Error saving temperature to server:', error);
        // Fallback to localStorage only
        localStorage.setItem('aiTemperature', this.temperature.toString());
        openAIService.temperature = this.temperature;
      }
    },
    
    // Save library mode preference to server
    async saveLibraryModePreference() {
      try {
        await apiService.saveSettings({ useSampledLibrary: this.useSampledLibrary });
        openAIService.useSampledLibrary = this.useSampledLibrary;
      } catch (error) {
        console.error('Error saving library mode preference to server:', error);
        // Fallback to localStorage
        localStorage.setItem('useSampledLibrary', this.useSampledLibrary.toString());
        openAIService.useSampledLibrary = this.useSampledLibrary;
      }
    },
    
    // Save custom prompt only mode preference to server
    async saveCustomPromptOnlyPreference() {
      try {
        await apiService.saveSettings({ useCustomPromptOnly: this.useCustomPromptOnly });
        openAIService.useCustomPromptOnly = this.useCustomPromptOnly;
      } catch (error) {
        console.error('Error saving custom prompt only mode preference to server:', error);
        // Fallback to localStorage
        localStorage.setItem('useCustomPromptOnly', this.useCustomPromptOnly.toString());
        openAIService.useCustomPromptOnly = this.useCustomPromptOnly;
      }
    },
    
    // Save sample size to server
    async saveSampleSize() {
      try {
        await apiService.saveSettings({ librarySampleSize: this.sampleSize });
        openAIService.sampleSize = this.sampleSize;
      } catch (error) {
        console.error('Error saving sample size to server:', error);
        // Fallback to localStorage
        localStorage.setItem('librarySampleSize', this.sampleSize.toString());
        openAIService.sampleSize = this.sampleSize;
      }
    },
    
    // Save structured output preference
    async saveStructuredOutputPreference() {
      try {
        console.log('Saving structured output preference:', this.useStructuredOutput);
        await apiService.saveSettings({ useStructuredOutput: this.useStructuredOutput });
        
        // Also save to localStorage as a backup
        localStorage.setItem('useStructuredOutput', this.useStructuredOutput.toString());
        
        // Set the useStructuredOutput property on the OpenAIService
        openAIService.useStructuredOutput = this.useStructuredOutput;
        
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
        localStorage.setItem('useStructuredOutput', this.useStructuredOutput.toString());
        openAIService.useStructuredOutput = this.useStructuredOutput;
        
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
        // Fallback to localStorage
        localStorage.setItem('likedTVRecommendations', JSON.stringify(this.likedRecommendations));
        localStorage.setItem('dislikedTVRecommendations', JSON.stringify(this.dislikedRecommendations));
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
        
        // First try to load from localStorage cache
        let plexHistoryFiltered = [];
        let jellyfinHistoryFiltered = [];
        let tautulliHistoryFiltered = [];
        let traktHistoryFiltered = [];
        
        // Get local Plex history
        if (this.plexUseHistory) {
          let plexHistory;
          if (this.isMovieMode) {
            plexHistory = localStorage.getItem('watchHistoryMovies');
            if (plexHistory) {
              plexHistory = JSON.parse(plexHistory);
            } else {
              plexHistory = this.recentlyWatchedMovies || [];
            }
          } else {
            plexHistory = localStorage.getItem('watchHistoryShows');
            if (plexHistory) {
              plexHistory = JSON.parse(plexHistory);
            } else {
              plexHistory = this.recentlyWatchedShows || [];
            }
          }
          plexHistoryFiltered = this.filterWatchHistory(plexHistory, 'plex');
        }
        
        // Get local Jellyfin history
        if (this.jellyfinUseHistory) {
          let jellyfinHistory;
          if (this.isMovieMode) {
            jellyfinHistory = localStorage.getItem('jellyfinWatchHistoryMovies');
            if (jellyfinHistory) {
              jellyfinHistory = JSON.parse(jellyfinHistory);
            } else {
              jellyfinHistory = this.jellyfinRecentlyWatchedMovies || [];
            }
          } else {
            jellyfinHistory = localStorage.getItem('jellyfinWatchHistoryShows');
            if (jellyfinHistory) {
              jellyfinHistory = JSON.parse(jellyfinHistory);
            } else {
              jellyfinHistory = this.jellyfinRecentlyWatchedShows || [];
            }
          }
          jellyfinHistoryFiltered = this.filterWatchHistory(jellyfinHistory, 'jellyfin');
        }
        
        // Get local Tautulli history
        if (this.tautulliUseHistory) {
          let tautulliHistory;
          if (this.isMovieMode) {
            tautulliHistory = localStorage.getItem('tautulliWatchHistoryMovies');
            if (tautulliHistory) {
              tautulliHistory = JSON.parse(tautulliHistory);
            } else {
              tautulliHistory = this.tautulliRecentlyWatchedMovies || [];
            }
          } else {
            tautulliHistory = localStorage.getItem('tautulliWatchHistoryShows');
            if (tautulliHistory) {
              tautulliHistory = JSON.parse(tautulliHistory);
            } else {
              tautulliHistory = this.tautulliRecentlyWatchedShows || [];
            }
          }
          tautulliHistoryFiltered = this.filterWatchHistory(tautulliHistory, 'tautulli');
        }
        
        // Get local Trakt history
        if (this.traktUseHistory) {
          let traktHistory;
          if (this.isMovieMode) {
            traktHistory = localStorage.getItem('traktWatchHistoryMovies');
            if (traktHistory) {
              traktHistory = JSON.parse(traktHistory);
            } else {
              traktHistory = this.traktRecentlyWatchedMovies || [];
            }
          } else {
            traktHistory = localStorage.getItem('traktWatchHistoryShows');
            if (traktHistory) {
              traktHistory = JSON.parse(traktHistory);
            } else {
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
              this.promptStyle
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
            this.promptStyle
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
      // Reset posters
      this.posters.clear();
      
      // Create requests for all recommendations
      const posterPromises = this.recommendations.map(async (rec) => {
        try {
          // Extract clean title (removing any punctuation at the end)
          const cleanTitle = rec.title.replace(/[:.!?]+$/, '').trim();
          
          // Use the appropriate poster fetching method based on content type
          const posterUrl = this.isMovieMode 
            ? await imageService.getPosterForMovie(cleanTitle)
            : await imageService.getPosterForShow(cleanTitle);
          
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
      // Force a re-computation of computed properties affected by screen size:
      // - gridStyle for layout
      // - shouldUseCompactMode for card display mode
      // This ensures both the layout and card presentation adapt properly to changes
      this.$forceUpdate();
      
      // If we have many posters per row, periodically check if compact mode
      // should be activated as the user adjusts settings
      if (this.columnsCount > 5) {
        // Check for compact mode applicability with a small delay
        setTimeout(() => {
          // Log current status to help with troubleshooting
          const isCompact = this.shouldUseCompactMode;
          console.log(`Compact mode status after resize: ${isCompact ? 'active' : 'inactive'}`);
          
          // Force update again if needed
          if (isCompact) {
            this.$forceUpdate();
          }
        }, 50);
      }
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
        }
        
        if (settings.librarySampleSize !== undefined) {
          const sampleSize = parseInt(settings.librarySampleSize, 10);
          if (!isNaN(sampleSize) && sampleSize >= 5 && sampleSize <= 1000) {
            this.sampleSize = sampleSize;
          }
        }
        
        // Custom prompt only mode
        if (settings.useCustomPromptOnly !== undefined) {
          this.useCustomPromptOnly = settings.useCustomPromptOnly === true || settings.useCustomPromptOnly === 'true';
          // Also set it in the OpenAIService
          openAIService.useCustomPromptOnly = this.useCustomPromptOnly;
        }
        
        // Structured output setting
        if (settings.useStructuredOutput !== undefined) {
          this.useStructuredOutput = settings.useStructuredOutput === true || settings.useStructuredOutput === 'true';
          // Also set it in the OpenAIService
          openAIService.useStructuredOutput = this.useStructuredOutput;
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
    
    // Initialize model selection
    const currentModel = openAIService.model || 'gpt-3.5-turbo';
    
    // Set to custom by default, we'll update once models are fetched
    this.customModel = currentModel;
    this.selectedModel = 'custom';
    this.isCustomModel = true;
    
    // Add window resize listener to update grid style when screen size changes
    window.addEventListener('resize', this.handleResize);
    
    // We've already loaded temperature from server in loadSavedSettings
    // Only check localStorage or service if the temperature is still at default (0.8)
    if (this.temperature === 0.8) {
      // Try to get from localStorage first
      const savedTemp = localStorage.getItem('aiTemperature');
      if (savedTemp) {
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
    this.useCustomPromptOnly = openAIService.useCustomPromptOnly || false;
    
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
    // But check localStorage as a fallback if server settings didn't include these
    if (this.numRecommendations === 5) { // 5 is the default - if it's still default, check localStorage
      // Restore saved recommendation count from localStorage (if exists)
      const savedCount = localStorage.getItem('numRecommendations');
      if (savedCount) {
        const numRecs = parseInt(savedCount, 10);
        // Validate the value is within range
        if (!isNaN(numRecs) && numRecs >= 1 && numRecs <= 50) {
          this.numRecommendations = numRecs;
          console.log('Setting numRecommendations from localStorage:', this.numRecommendations);
        }
      }
    }
    
    // Check for structured output setting in localStorage if we didn't get it from server
    const savedStructuredOutput = localStorage.getItem('useStructuredOutput');
    if (savedStructuredOutput !== null) {
      const useStructured = savedStructuredOutput === 'true';
      this.useStructuredOutput = useStructured;
      openAIService.useStructuredOutput = useStructured;
      console.log('Setting useStructuredOutput from localStorage:', useStructured);
    }
    
    
    if (this.columnsCount === 2) { // 2 is the default - if it's still default, check localStorage
      // Restore saved columns count from localStorage (if exists)
      const savedColumnsCount = localStorage.getItem('columnsCount');
      if (savedColumnsCount) {
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
      const savedMovieMode = localStorage.getItem('isMovieMode');
      if (savedMovieMode) {
        this.isMovieMode = savedMovieMode === 'true';
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
    
    // Load custom vibe from settings
    const settings = await apiService.getSettings();
    if (settings && settings.tvCustomVibe) {
      this.customVibe = settings.tvCustomVibe;
    } else {
      // Fallback to localStorage if not in server settings
      const savedVibe = localStorage.getItem('tvCustomVibe');
      if (savedVibe) {
        this.customVibe = savedVibe;
      }
    }
    
    // Restore saved language preference if it exists
    const savedLanguage = localStorage.getItem('tvLanguagePreference');
    if (savedLanguage) {
      this.selectedLanguage = savedLanguage;
    }
    
    // Restore saved Plex history mode if it exists
    const savedPlexHistoryMode = localStorage.getItem('plexHistoryMode');
    if (savedPlexHistoryMode) {
      this.plexHistoryMode = savedPlexHistoryMode;
    }
    
    // Restore saved Plex only mode if it exists
    const savedPlexOnlyMode = localStorage.getItem('plexOnlyMode');
    if (savedPlexOnlyMode) {
      this.plexOnlyMode = savedPlexOnlyMode === 'true';
    }
    
    // Restore saved Plex use history setting
    const savedPlexUseHistory = localStorage.getItem('plexUseHistory');
    if (savedPlexUseHistory !== null) {
      this.plexUseHistory = savedPlexUseHistory === 'true';
    }
    
    // Restore saved Plex custom history days
    const savedPlexCustomHistoryDays = localStorage.getItem('plexCustomHistoryDays');
    if (savedPlexCustomHistoryDays) {
      this.plexCustomHistoryDays = parseInt(savedPlexCustomHistoryDays, 10);
    }
    
    // Initialize history arrays with empty arrays to prevent issues
    this.previousShowRecommendations = [];
    this.previousMovieRecommendations = [];
    
    try {
      console.log("Loading recommendations from server...");
      
      // Try to load recommendations from server first
      const tvRecsResponse = await apiService.getRecommendations('tv') || [];
      const movieRecsResponse = await apiService.getRecommendations('movie') || [];
      
      // When the tvRecsResponse or movieRecsResponse are empty arrays,
      // this means the server cleared the data or doesn't have any data.
      // In this case, we should:
      // 1. Use the empty arrays (don't fall back to localStorage)
      // 2. Clear localStorage itself to be consistent with server
      
      console.log("TV recommendations from server:", tvRecsResponse ? tvRecsResponse.length : 0, "items");
      console.log("Movie recommendations from server:", movieRecsResponse ? movieRecsResponse.length : 0, "items");
      
      // Process TV recommendations
      if (Array.isArray(tvRecsResponse) && tvRecsResponse.length > 0) {
        if (typeof tvRecsResponse[0] === 'string') {
          // Simple array of titles - this is the history list
          console.log("Loaded TV history from server (string array):", tvRecsResponse.length, "items");
          this.previousShowRecommendations = tvRecsResponse;
          
          // Make sure we update the currently displayed history count if in TV mode
          if (!this.isMovieMode) {
            this.previousRecommendations = [...this.previousShowRecommendations];
          }
          
          // Only save to localStorage for backup if there are actually recommendations
          if (tvRecsResponse && tvRecsResponse.length > 0) {
            localStorage.setItem('previousTVRecommendations', JSON.stringify(tvRecsResponse));
          } else {
            // If the server returned empty, clear the localStorage as well
            localStorage.removeItem('previousTVRecommendations');
          }
        } else {
          // Full recommendation objects with title property
          console.log("Loaded full TV recommendations from server:", tvRecsResponse.length, "items");
          
          // Store them as full recommendations if we're in TV mode
          if (!this.isMovieMode && tvRecsResponse.some(rec => rec.title && (rec.description || rec.fullText))) {
            this.recommendations = tvRecsResponse;
            
            // Save current recommendations to localStorage for backup
            localStorage.setItem('currentTVRecommendations', JSON.stringify(tvRecsResponse));
          }
          
          // Extract titles for the history
          const extractedTitles = tvRecsResponse
            .map(rec => typeof rec === 'string' ? rec : rec.title)
            .filter(title => !!title);
            
          // Combine with existing history, handling duplicates
          const existingTitles = this.previousShowRecommendations || [];
          const combinedTitles = [...new Set([...existingTitles, ...extractedTitles])];
          
          this.previousShowRecommendations = combinedTitles;
          
          // Make sure we update the currently displayed history count if in TV mode
          if (!this.isMovieMode) {
            this.previousRecommendations = [...this.previousShowRecommendations];
          }
          
          // Only save to localStorage if there are actually recommendations
          if (combinedTitles && combinedTitles.length > 0) {
            localStorage.setItem('previousTVRecommendations', JSON.stringify(combinedTitles));
          } else {
            // If combined titles is empty, clear localStorage
            localStorage.removeItem('previousTVRecommendations');
          }
        }
      }
      
      // Process movie recommendations
      if (Array.isArray(movieRecsResponse) && movieRecsResponse.length > 0) {
        if (typeof movieRecsResponse[0] === 'string') {
          // Simple array of titles - this is the history list
          console.log("Loaded movie history from server (string array):", movieRecsResponse.length, "items");
          this.previousMovieRecommendations = movieRecsResponse;
          
          // Make sure we update the currently displayed history count if in movie mode
          if (this.isMovieMode) {
            this.previousRecommendations = [...this.previousMovieRecommendations];
          }
          
          // Only save to localStorage for backup if there are actually recommendations
          if (movieRecsResponse && movieRecsResponse.length > 0) {
            localStorage.setItem('previousMovieRecommendations', JSON.stringify(movieRecsResponse));
          } else {
            // If the server returned empty, clear the localStorage as well
            localStorage.removeItem('previousMovieRecommendations');
          }
        } else {
          // Full recommendation objects with title property
          console.log("Loaded full movie recommendations from server:", movieRecsResponse.length, "items");
          
          // Store them as full recommendations if we're in movie mode
          if (this.isMovieMode && movieRecsResponse.some(rec => rec.title && (rec.description || rec.fullText))) {
            this.recommendations = movieRecsResponse;
            
            // Save current recommendations to localStorage for backup
            localStorage.setItem('currentMovieRecommendations', JSON.stringify(movieRecsResponse));
          }
          
          // Extract titles for the history
          const extractedTitles = movieRecsResponse
            .map(rec => typeof rec === 'string' ? rec : rec.title)
            .filter(title => !!title);
            
          // Combine with existing history, handling duplicates
          const existingTitles = this.previousMovieRecommendations || [];
          const combinedTitles = [...new Set([...existingTitles, ...extractedTitles])];
          
          this.previousMovieRecommendations = combinedTitles;
          
          // Make sure we update the currently displayed history count if in movie mode
          if (this.isMovieMode) {
            this.previousRecommendations = [...this.previousMovieRecommendations];
          }
          
          // Only save to localStorage if there are actually recommendations
          if (combinedTitles && combinedTitles.length > 0) {
            localStorage.setItem('previousMovieRecommendations', JSON.stringify(combinedTitles));
          } else {
            // If combined titles is empty, clear localStorage
            localStorage.removeItem('previousMovieRecommendations');
          }
        }
      }
      
      // Debug current history counts
      console.log("After loading from server - TV history count:", this.previousShowRecommendations.length);
      console.log("After loading from server - Movie history count:", this.previousMovieRecommendations.length);
      console.log("Currently displayed history count:", this.previousRecommendations.length);
      
      // Load liked/disliked preferences from server
      try {
        const likedTV = await apiService.getPreferences('tv', 'liked');
        if (Array.isArray(likedTV)) {
          this.likedRecommendations = likedTV;
        }
        
        const dislikedTV = await apiService.getPreferences('tv', 'disliked');
        if (Array.isArray(dislikedTV)) {
          this.dislikedRecommendations = dislikedTV;
        }
      } catch (prefError) {
        console.error("Error loading preferences from server:", prefError);
      }
      
    } catch (error) {
      console.error("Error loading from server, falling back to localStorage:", error);
      
      // Fall back to loading from localStorage
      // Load previous TV recommendations from localStorage
      const savedPreviousTVRecommendations = localStorage.getItem('previousTVRecommendations');
      if (savedPreviousTVRecommendations) {
        try {
          this.previousShowRecommendations = JSON.parse(savedPreviousTVRecommendations) || [];
        } catch (error) {
          console.error('Error parsing previous TV recommendations:', error);
          this.previousShowRecommendations = [];
        }
      }
      
      // Load previous movie recommendations from localStorage
      const savedPreviousMovieRecommendations = localStorage.getItem('previousMovieRecommendations');
      if (savedPreviousMovieRecommendations) {
        try {
          this.previousMovieRecommendations = JSON.parse(savedPreviousMovieRecommendations) || [];
        } catch (error) {
          console.error('Error parsing previous movie recommendations:', error);
          this.previousMovieRecommendations = [];
        }
      }
      
      // Also try to load current recommendations
      if (this.isMovieMode) {
        const currentMovieRecs = localStorage.getItem('currentMovieRecommendations');
        if (currentMovieRecs) {
          try {
            this.recommendations = JSON.parse(currentMovieRecs) || [];
          } catch (error) {
            console.error('Error parsing current movie recommendations:', error);
          }
        }
      } else {
        const currentTVRecs = localStorage.getItem('currentTVRecommendations');
        if (currentTVRecs) {
          try {
            this.recommendations = JSON.parse(currentTVRecs) || [];
          } catch (error) {
            console.error('Error parsing current TV recommendations:', error);
          }
        }
      }
      
      // Load liked TV recommendations from localStorage
      const savedLikedRecommendations = localStorage.getItem('likedTVRecommendations');
      if (savedLikedRecommendations) {
        try {
          this.likedRecommendations = JSON.parse(savedLikedRecommendations);
        } catch (error) {
          console.error('Error parsing liked TV recommendations:', error);
          this.likedRecommendations = [];
        }
      }
      
      // Load disliked TV recommendations from localStorage
      const savedDislikedRecommendations = localStorage.getItem('dislikedTVRecommendations');
      if (savedDislikedRecommendations) {
        try {
          this.dislikedRecommendations = JSON.parse(savedDislikedRecommendations);
        } catch (error) {
          console.error('Error parsing disliked TV recommendations:', error);
          this.dislikedRecommendations = [];
        }
      }
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
    // Only save to localStorage for backup, but don't make server API calls
    try {
      if (this.isMovieMode) {
        localStorage.setItem('previousMovieRecommendations', JSON.stringify(this.previousMovieRecommendations));
        if (this.recommendations && this.recommendations.length > 0) {
          localStorage.setItem('currentMovieRecommendations', JSON.stringify(this.recommendations));
        }
      } else {
        localStorage.setItem('previousTVRecommendations', JSON.stringify(this.previousShowRecommendations));
        if (this.recommendations && this.recommendations.length > 0) {
          localStorage.setItem('currentTVRecommendations', JSON.stringify(this.recommendations));
        }
      }
      console.log('Saved recommendations to localStorage only (no server call) before unmount');
    } catch (error) {
      console.error('Error saving recommendations to localStorage on unmount:', error);
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
  font-size: 14px;
  background-color: #2196F3;
  margin-left: 10px;
  border-radius: 10px;
  border: none;
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(33, 150, 243, 0.3);
}

.settings-button:hover:not(:disabled) {
  background-color: #1976D2;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(33, 150, 243, 0.4);
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
  max-width: 100%;
  box-sizing: border-box;
}

.settings-container {
  background-color: var(--card-bg-color);
  border-radius: var(--border-radius-md);
  box-shadow: var(--card-shadow);
  width: 100%;
  box-sizing: border-box;
  padding: 20px;
  transition: background-color var(--transition-speed), box-shadow var(--transition-speed);
  max-width: 100%;
  margin: 0 auto;
}

.settings-layout {
  display: flex;
  gap: 20px;
  margin-bottom: 15px;
}

.settings-left {
  flex: 0 0 40%;
}

.settings-right {
  flex: 0 0 60%;
}

@media (max-width: 1200px) {
  .settings-left, .settings-right {
    flex: 1;
  }
}

@media (max-width: 768px) {
  .settings-layout {
    flex-direction: column;
  }
}

.action-button-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 24px 0 10px;
  width: 100%;
}

.settings-header {
  cursor: pointer;
  padding: 12px 15px;
  background-color: var(--card-bg-color);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background-color 0.2s;
  border-radius: var(--border-radius-md) var(--border-radius-md) 0 0;
}

.settings-header:hover {
  background-color: rgba(0, 0, 0, 0.03);
}

/* Removed small-action-button that was previously in the header */

.retry-button {
  margin-top: 15px;
  background-color: transparent;
  color: var(--button-primary-bg);
  font-size: 15px;
  padding: 8px 20px;
  min-width: 120px;
  border: 1px solid var(--button-primary-bg);
  border-radius: var(--border-radius-md);
  transition: all 0.2s ease;
}

.retry-button:hover:not(:disabled) {
  background-color: rgba(67, 97, 238, 0.08);
  transform: translateY(-1px);
}

@media (max-width: 600px) {
  .loading {
    padding: 12px;
    gap: 10px;
  }
  
  .loading p {
    font-size: 14px;
    margin: 0;
    flex: 1;
  }
  
  .settings-header {
    padding: 8px;
    gap: 5px;
  }
  
  .settings-header h3 {
    font-size: 13px;
  }
}

@media (min-width: 601px) {
  /* Desktop-specific styles */
}

.settings-header h3 {
  margin: 0;
  font-size: 16px;
  color: var(--header-color);
  display: flex;
  align-items: center;
  gap: 8px;
}

.toggle-icon {
  font-size: 12px;
  transition: transform 0.2s;
}

.collapsed .settings-container {
  border-radius: 8px;
}

.recommendations-settings.collapsed {
  margin-bottom: 25px;
}

.settings-content {
  padding: 20px;
  transition: max-height 0.3s ease, opacity 0.3s ease, transform 0.3s ease;
  max-height: 2000px; /* Large enough to fit all content */
  opacity: 1;
  transform: translateY(0);
  overflow: hidden;
}

.settings-content.collapsed {
  max-height: 0;
  opacity: 0;
  transform: translateY(-20px);
  padding: 0 20px;
}

.info-section {
  background-color: var(--primary-color-lighter);
  padding: 20px;
  border-radius: var(--border-radius-md);
  margin-bottom: 24px;
  border: 1px solid var(--primary-color-border);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.info-section:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transform: translateY(-1px);
}

.info-section-title {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: var(--text-color);
  font-weight: 600;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
}

.info-section-title::before {
  content: "";
  display: inline-block;
  width: 4px;
  height: 16px;
  margin-right: 8px;
  background: var(--button-primary-bg);
  border-radius: 2px;
  opacity: 0.9;
}

.model-info {
  padding: 10px 0;
  font-size: 14px;
  margin-bottom: 12px;
  display: flex;
  flex-direction: column;
  gap: 15px;
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
  margin-bottom: 12px;
  background-color: var(--primary-color-lighter);
  padding: 10px 12px;
  border-radius: var(--border-radius-md);
  border: 1px solid var(--primary-color-border);
}

.fetch-models-button {
  background: none;
  border: 1px solid var(--primary-color-border);
  color: var(--button-primary-bg);
  font-size: 16px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--border-radius-sm);
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fetch-models-button:hover:not(:disabled) {
  background-color: var(--primary-color-light);
  transform: translateY(-1px);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.fetch-models-button:disabled {
  color: #ccc;
  cursor: not-allowed;
  border-color: rgba(0, 0, 0, 0.1);
}

.loading-icon {
  display: inline-block;
  animation: spin 1s infinite linear;
}

.fetch-error {
  color: #f44336;
  font-size: 12px;
  margin-top: 4px;
  cursor: pointer;
}

.error-link {
  text-decoration: underline;
  font-weight: bold;
}

.model-select-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.model-select {
  padding: 12px 15px;
  border-radius: var(--border-radius-sm);
  border: 1px solid var(--primary-color-border);
  background-color: var(--input-bg);
  color: var(--input-text);
  font-size: 14px;
  width: 100%;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  cursor: pointer;
}

.model-select:hover {
  border-color: var(--button-primary-bg);
}

.model-select:focus {
  border-color: var(--button-primary-bg);
  outline: none;
  box-shadow: 0 0 0 1px var(--primary-color-shadow);
}

.model-select-custom {
  margin-top: 5px;
}

.custom-model-input {
  padding: 12px 15px;
  border-radius: var(--border-radius-sm);
  border: 1px solid var(--primary-color-border);
  background-color: var(--input-bg);
  color: var(--input-text);
  font-size: 14px;
  width: 100%;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.custom-model-input:hover {
  border-color: var(--button-primary-bg);
}

.custom-model-input:focus {
  border-color: var(--button-primary-bg);
  outline: none;
  box-shadow: 0 0 0 1px var(--primary-color-shadow);
}

/* Modern Slider Components */
.temperature-control,
.sample-size-control {
  margin-top: 10px;
}

.slider-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.slider-header label {
  font-size: 14px;
  color: var(--text-color);
  font-weight: 500;
}

.slider-value {
  font-weight: 600;
  color: var(--button-primary-text);
  background-color: var(--button-primary-bg);
  border-radius: var(--border-radius-sm);
  padding: 1px 8px;
  min-width: 20px;
  text-align: center;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  font-size: 13px;
}

.modern-slider-container {
  position: relative;
  padding: 0 2px;
  margin-bottom: 8px;
}

.slider-track-container {
  position: relative;
  height: 40px; /* Significantly increased height for better centering */
  display: flex;
  align-items: center;
}

.slider-track {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  height: 4px; /* Thinner track for better contrast with handle */
  background: linear-gradient(to right, var(--button-primary-bg), var(--button-primary-bg));
  border-radius: 2px;
  z-index: 1;
  transition: width 0.2s ease;
}

.modern-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 4px; /* Match track height */
  border-radius: 2px;
  background: #e5e7eb;
  outline: none;
  position: relative;
  z-index: 2;
  margin: 0;
  padding: 0;
  cursor: pointer;
}

body.dark-theme .modern-slider {
  background: #4a4a4a;
}

.modern-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  cursor: pointer;
  border: 2px solid var(--button-primary-bg);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 3;
  /* Fine-tuned perfect centering */
  transform: translateY(0px);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

body.dark-theme .modern-slider::-webkit-slider-thumb {
  background: #e0e0e0;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
}

.modern-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  cursor: pointer;
  border: 2px solid var(--button-primary-bg);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 3;
  transform: translateY(0px);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

body.dark-theme .modern-slider::-moz-range-thumb {
  background: #e0e0e0;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
}

.modern-slider::-webkit-slider-thumb:hover,
.modern-slider:active::-webkit-slider-thumb {
  transform: translateY(0px) scale(1.1);
  box-shadow: 0 3px 8px var(--primary-color-shadow);
}

.modern-slider::-moz-range-thumb:hover,
.modern-slider:active::-moz-range-thumb {
  transform: translateY(0px) scale(1.1);
  box-shadow: 0 3px 8px var(--primary-color-shadow);
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-color);
  opacity: 0.7;
  margin-bottom: 4px;
}

.slider-range-labels {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-color);
  opacity: 0.6;
  margin-top: 0;
  padding: 0 2px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-header label {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-color);
  opacity: 0.95; /* Improve readability in dark mode */
}

.genre-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  background-color: var(--button-primary-bg);
  color: white;
  border-radius: var(--border-radius-sm);
  font-size: 12px;
  font-weight: 600;
  padding: 0 6px;
}

.genre-tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-height: 180px;
  overflow-y: auto;
  padding: 5px 0;
  margin-bottom: 10px;
  scrollbar-width: thin;
  scrollbar-color: var(--button-primary-bg) rgba(67, 97, 238, 0.1);
}

.genre-tags-container::-webkit-scrollbar {
  width: 6px;
}

.genre-tags-container::-webkit-scrollbar-track {
  background: rgba(67, 97, 238, 0.05);
  border-radius: 3px;
}

.genre-tags-container::-webkit-scrollbar-thumb {
  background-color: rgba(67, 97, 238, 0.4);
  border-radius: 3px;
}

.genre-tag {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  background-color: rgba(48, 65, 86, 0.08);
  border: 1px solid rgba(48, 65, 86, 0.15);
  border-radius: var(--border-radius-md);
  color: var(--text-color);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}

body.dark-theme .genre-tag {
  border: 1px solid rgba(48, 65, 86, 0.3);
}

.genre-tag:hover {
  background-color: rgba(48, 65, 86, 0.15);
  transform: translateY(-1px);
}

body.dark-theme .genre-tag:hover {
  background-color: rgba(48, 65, 86, 0.35);
}

.genre-tag.selected {
  background-color: #163860;;
  color: white;
  border-color: var(--button-primary-bg);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.genre-tag.selected:hover {
  filter: brightness(1.05);
}

.clear-all-button {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  background-color: rgba(244, 67, 54, 0.08);
  border: 1px solid rgba(244, 67, 54, 0.2);
  border-radius: 30px;
  color: #f44336;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-left: 4px;
}

.clear-all-button:hover {
  background-color: rgba(244, 67, 54, 0.15);
  transform: translateY(-1px);
}

.count-selector, .genre-selector {
  display: flex;
  flex-direction: column;
  width: 100%;
  box-sizing: border-box;
  transition: background-color var(--transition-speed), box-shadow var(--transition-speed);
  padding: 10px;
  background-color: var(--card-bg-color);
  border-radius: var(--border-radius-md);
  box-shadow: var(--card-shadow);
  border: 1px solid var(--border-color);
}

.count-selector {
  margin-bottom: 14px;
  max-height: none;
  overflow: visible;
}

.select-container {
  position: relative;
  width: 100%;
}

select {
  width: 100%;
  padding: 10px 12px;
  appearance: none;
  background-color: var(--input-bg);
  color: var(--input-text);
  border: 1px solid var(--input-border);
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s, background-color var(--transition-speed), color var(--transition-speed);
}

select:hover {
  border-color: #34A853;
}

select:focus {
  border-color: #34A853;
  box-shadow: 0 0 0 2px rgba(52, 168, 83, 0.2);
  outline: none;
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

.genre-selector label {
  font-size: 14px;
  color: var(--text-color);
  font-weight: 500;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  transition: color var(--transition-speed);
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

.recommendation-list {
  display: grid;
  gap: 20px;
  margin-top: 20px;
  transition: max-width 0.3s ease, margin 0.3s ease;
  width: 100%;
}

.recommendations {
  transition: width 0.3s ease, margin 0.3s ease;
  width: 100%;
}

@media (min-width: 768px) {
  /* Grid columns controlled by :style binding using the gridStyle computed property */
}

@media (max-width: 600px) {
  .recommendation-list {
    gap: 15px;
    padding: 0;
  }
  
  .recommendations {
    padding: 10px;
  }
  
  .recommendation-header {
    flex-direction: column;
    align-items: flex-start;
    margin-bottom: 15px;
  }
  
  .content-type-selector {
    margin-left: 0;
    margin-top: 10px;
    width: 100%;
    max-width: 100%;
    overflow: hidden;
  }
  
  .content-type-button {
    flex: 1;
    padding: 8px;
    white-space: nowrap;
  }
  
  /* Fix settings container going off edge */
  .settings-container {
    padding: 15px 10px;
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    margin: 0;
  }
  
  /* Adjust settings layout for smaller screens */
  .settings-layout {
    flex-direction: column;
    gap: 15px;
  }
  
  .settings-left, 
  .settings-right {
    flex: 0 0 100%;
    width: 100%;
  }
  
  /* Better handle text overflow in buttons and controls */
  button, 
  .slider-header, 
  .setting-description {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.recommendation-card {
  transition: transform 0.2s ease, box-shadow var(--transition-speed), background-color var(--transition-speed), width 0.3s ease;
}

.recommendation-card {
  background-color: var(--card-bg-color);
  border-radius: 8px;
  box-shadow: var(--card-shadow);
  overflow: visible;
  transition: transform 0.2s ease, box-shadow var(--transition-speed), background-color var(--transition-speed);
  min-height: 275px; /* Use min-height instead of fixed height to allow content to expand */
}

/* Compact mode styling for better fit on small screens or with many columns */
.recommendation-card.compact-mode {
  min-height: auto;
  max-width: 100%;
  overflow: hidden; /* Prevent any content from overflowing */
  position: relative;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.recommendation-card.compact-mode:hover {
  transform: translateY(-3px) scale(1.02);
  z-index: 2; /* Ensure expanded card appears above others */
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
}

/* Full-width expand button at bottom of card */
.full-width-expand-button {
  width: 100%;
  background-color: rgba(48, 65, 86, 0.8);
  color: white;
  border: none;
  border-radius: 0 0 var(--border-radius-md) var(--border-radius-md);
  padding: 8px 12px;
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.full-width-expand-button:hover {
  background-color: rgba(48, 65, 86, 0.9);
}

.full-width-expand-button.expanded {
  background-color: rgba(48, 65, 86, 0.9);
}

.full-width-expand-button svg {
  transition: transform 0.2s ease;
}

.full-width-expand-button:hover svg {
  transform: translateY(2px);
}

.full-width-expand-button.expanded:hover svg {
  transform: translateY(-2px);
}

.recommendation-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

.card-content {
  display: flex;
  flex-direction: row;
  min-height: 100%;
}

.card-content.compact-layout {
  flex-direction: column;
  display: flex;
  min-height: 100%;
}

.card-content.clickable {
  cursor: pointer;
  position: relative;
}

.card-content.clickable::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 114, 229, 0.03);
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}

.card-content.clickable:hover::after {
  opacity: 1;
}

.card-content.clickable:active {
  transform: scale(0.99);
}

@media (max-width: 600px) {
  .card-content {
    flex-direction: column;
  }
  
  .recommendation-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  
  .content-type-toggle {
    width: 100%;
    justify-content: center;
  }
  
  .content-type-toggle {
    justify-content: center;
    padding: 6px 12px;
  }
  
  .toggle-label {
    font-size: 13px;
  }
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

.compact-layout .poster-container {
  flex: 0 0 auto;
  width: 100%;
  height: auto;
  margin-bottom: 10px;
  padding: 10px 10px 0 10px;
}

@media (max-width: 600px) {
  .poster-container {
    flex: 0 0 auto;
    width: 100%;
    height: auto;
    margin-bottom: 10px;
  }
}

.poster {
  width: 150px;
  height: 275px;
  background-size: cover;
  background-position: center;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.compact-layout .poster {
  width: 100%;
  height: 180px;
  border-radius: 4px;
  background-position: center top; /* Show top of poster in compact mode */
}

@media (max-width: 600px) {
  .poster {
    width: 180px;
    height: 270px;
    border-radius: 4px;
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
  padding: 15px;
  overflow: visible;
  display: flex;
  flex-direction: column;
}

.compact-layout .details-container {
  padding: 10px 12px 15px 12px;
}

.compact-layout .description,
.compact-layout .reasoning {
  /* Hide longer text content in compact mode by default */
  max-height: 0;
  overflow: hidden;
  opacity: 0;
  transition: max-height 0.3s ease, opacity 0.3s ease, margin 0.3s ease;
  margin: 0;
}

/* Show content when expanded */
.recommendation-card.compact-mode.expanded .description,
.recommendation-card.compact-mode.expanded .reasoning,
.compact-layout .card-content:hover .description,
.compact-layout .card-content:hover .reasoning {
  max-height: 200px; /* Enough height for content */
  opacity: 1;
  margin: 8px 0;
}

.compact-layout .card-header {
  margin-bottom: 5px;
  flex-direction: column;
  align-items: flex-start;
}

.compact-layout .card-header h3 {
  font-size: 0.95rem;
  margin-bottom: 8px;
  white-space: normal;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  width: 100%;
}

.compact-layout .card-actions {
  width: 100%;
  justify-content: space-between;
}

@media (max-width: 600px) {
  .details-container {
    padding: 12px;
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
}

@media (max-width: 600px) {
  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .card-actions {
    width: 100%;
    justify-content: space-between;
  }
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.like-dislike-buttons {
  display: flex;
  gap: 5px;
}

.action-btn {
  background: none;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 5px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  color: var(--text-color);
  width: 32px;
  height: 32px;
}

.like-btn:hover {
  background-color: rgba(76, 175, 80, 0.1);
  color: #4CAF50;
  border-color: #4CAF50;
}

.dislike-btn:hover {
  background-color: rgba(244, 67, 54, 0.1);
  color: #F44336;
  border-color: #F44336;
}

.like-btn.active {
  background-color: #4CAF50;
  color: white;
  border-color: #4CAF50;
}

.dislike-btn.active {
  background-color: #F44336;
  color: white;
  border-color: #F44336;
}

.recommendation-card h3 {
  margin: 0 0 5px 0;
  color: var(--header-color);
  overflow: hidden;
  transition: color var(--transition-speed);
  font-size: 18px;
  line-height: 1.3;
}

.content-container {
  flex: 1;
  overflow: visible;
}

.label {
  font-weight: 600;
  font-size: 13px;
  color: var(--text-color);
  opacity: 0.9;
  margin-right: 5px;
  display: flex;
  align-items: center;
}

.info-tooltip {
  display: inline-flex;
  margin-left: 4px;
  color: var(--text-color);
  opacity: 0.6;
  transition: opacity 0.2s;
  position: relative;
}

.info-tooltip:hover {
  opacity: 1;
}

.recommendation-card p {
  margin: 0;
  color: var(--text-color);
  line-height: 1.4;
  transition: color var(--transition-speed);
  font-size: 14px;
}

@media (max-width: 600px) {
  .recommendation-card p {
    font-size: 15px;
  }
}

.description, .reasoning, .rating, .streaming {
  margin-bottom: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rating-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.rating-score {
  font-weight: bold;
  font-size: 16px;
  display: inline-flex;
  align-items: center;
  color: #2196F3;
  padding: 4px 12px;
  border-radius: 4px;
  width: fit-content;
  line-height: 1;
  margin-top: 4px;
  vertical-align: middle;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.score-fresh {
  color: #2196F3;
  background-color: rgba(33, 150, 243, 0.1);
}

.score-certified {
  color: #4CAF50;
  background-color: rgba(76, 175, 80, 0.2);
  font-weight: 700;
}

.score-rotten {
  color: #FF9800;
  background-color: rgba(255, 152, 0, 0.1);
}

.score-unknown {
  color: #838383;
  background-color: rgba(0, 0, 0, 0.05);
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

.library-mode-toggle {
  display: flex;
  flex-direction: column;
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid var(--border-color);
}

.setting-description {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-color);
  opacity: 0.8;
}

.sample-size-control {
  margin-top: 10px;
  margin-left: 22px;
  padding: 10px;
  background-color: rgba(52, 168, 83, 0.03);
  border-radius: 12px;
  border: 1px solid rgba(52, 168, 83, 0.1);
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

.plex-options, .jellyfin-options, .tautulli-options, .trakt-options {
  margin-top: 20px;
  margin-bottom: 20px;
  background-color: var(--primary-color-lighter);
  border-radius: var(--border-radius-md);
  border: 1px solid var(--primary-color-border);
  padding: 15px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.service-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.service-header label {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-color);
}

.service-settings {
  margin-top: 12px;
  padding: 12px;
  background-color: rgba(0, 0, 0, 0.02);
  border-radius: var(--border-radius-sm);
  border: 1px solid var(--primary-color-border);
}

.plex-history-toggle, .jellyfin-history-toggle, .tautulli-history-toggle, .trakt-history-toggle {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.history-selection {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 15px;
}

.toggle-option {
  display: flex;
  align-items: center;
  cursor: pointer;
  margin: 0;
  font-size: 14px;
  padding: 6px 8px;
  border-radius: var(--border-radius-sm);
  transition: background-color 0.2s ease;
}

.toggle-option:hover {
  background-color: rgba(0, 0, 0, 0.03);
}

.toggle-option input[type="radio"] {
  margin-right: 10px;
  cursor: pointer;
}

.plex-only-toggle, .jellyfin-only-toggle, .tautulli-only-toggle, .trakt-only-toggle {
  margin-top: 15px;
  padding-top: 12px;
  border-top: 1px solid var(--primary-color-border);
}

.days-slider-container {
  margin-top: 8px;
  margin-bottom: 15px;
  padding: 12px;
  background-color: rgba(0, 0, 0, 0.02);
  border-radius: var(--border-radius-sm);
  border: 1px solid var(--primary-color-border);
}

/* Toggle Switch Styles */
.toggle-switch {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
}

.toggle-slider {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 26px;
  background-color: #e0e0e0;
  border-radius: 34px;
  transition: .4s;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  border-radius: 50%;
  transition: .3s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.toggle-switch input:checked + .toggle-slider {
  background-color: #34A853;
}

.toggle-switch input:checked + .toggle-slider:before {
  transform: translateX(24px);
}

.toggle-label {
  font-size: 14px;
  font-weight: 500;
  min-width: 60px;
  text-align: left;
}

.refresh-button {
  background-color: rgba(52, 168, 83, 0.1);
  color: #34A853;
  border: 1px solid rgba(52, 168, 83, 0.3);
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 13px;
  cursor: pointer;
  margin-right: 10px;
  transition: all 0.2s ease;
}

.refresh-button:hover {
  background-color: rgba(52, 168, 83, 0.2);
  transform: translateY(-1px);
}

.jellyfin-user-select-button, .tautulli-user-select-button, .trakt-refresh-button {
  margin-top: 15px;
  width: auto;
  max-width: 200px;
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

.loading-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 15px 0;
  color: var(--text-color);
  opacity: 0.8;
}

.loading-indicator .small-spinner {
  width: 18px;
  height: 18px;
  border-width: 2px;
}
/* Vibe Selector Styles */
.vibe-selector {
  margin-top: 10px;
  margin-bottom: 20px;
  background-color: var(--primary-color-lighter);
  border-radius: var(--border-radius-md);
  border: 1px solid var(--primary-color-border);
  padding: 15px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
}

.vibe-input-container {
  position: relative;
  margin-bottom: 8px;
  width: 100%;
  box-sizing: border-box;
}

.vibe-input {
  width: 100%;
  padding: 12px 15px;
  border-radius: var(--border-radius-sm);
  border: 1px solid var(--primary-color-border);
  background-color: var(--input-bg);
  color: var(--input-text);
  font-size: 14px;
  line-height: 1.5;
  min-height: 70px;
  resize: vertical;
  box-sizing: border-box;
  max-width: 100%;
  font-family: inherit;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.vibe-input:focus {
  outline: none;
  border-color: var(--button-primary-bg);
  box-shadow: 0 0 0 1px var(--primary-color-shadow);
}

.vibe-input::placeholder {
  color: #9ca3af;
}

/* Prompt Style Selector Styles */
.prompt-style-selector {
  margin-bottom: 15px;
  width: 100%;
  box-sizing: border-box;
}

.prompt-style-selector label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  font-size: 14px;
}

.prompt-style-select {
  width: 100%;
  padding: 10px 15px;
  border-radius: var(--border-radius-sm);
  border: 1px solid var(--primary-color-border);
  background-color: var(--input-bg);
  color: var(--input-text);
  font-size: 14px;
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
  box-sizing: border-box;
  transition: all 0.2s ease;
}

.prompt-style-select:focus {
  outline: none;
  border-color: var(--button-primary-bg);
  box-shadow: 0 0 0 1px var(--primary-color-shadow);
}

.select-container {
  position: relative;
  width: 100%;
}

.select-container .select-arrow-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  pointer-events: none;
}

.clear-prompt-button {
  background-color: transparent;
  border: 1px solid rgba(244, 67, 54, 0.3);
  color: #f44336;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 30px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-prompt-button:hover {
  background-color: rgba(244, 67, 54, 0.08);
  transform: translateY(-1px);
}

.setting-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #6b7280;
  margin-top: 6px;
  padding-left: 2px;
}

.tip-icon {
  width: 16px;
  height: 16px;
  color: var(--button-primary-bg);
  opacity: 0.7;
}

.language-selector {
  margin-bottom: 20px;
  background-color: var(--primary-color-lighter);
  border-radius: var(--border-radius-md);
  border: 1px solid var(--primary-color-border);
  padding: 15px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.language-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: var(--primary-color-light);
  color: var(--button-primary-bg);
  border-radius: var(--border-radius-sm);
  font-size: 12px;
  font-weight: 500;
  padding: 2px 10px;
}

.select-wrapper {
  position: relative;
  margin-bottom: 8px;
}

.select-arrow-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: #6b7280;
  pointer-events: none;
}

.language-select {
  width: 100%;
  padding: 12px 15px;
  border-radius: var(--border-radius-sm);
  border: 1px solid var(--primary-color-border);
  background-color: var(--input-bg);
  color: var(--input-text);
  font-size: 14px;
  margin-bottom: 8px;
  appearance: none;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.language-select:hover {
  border-color: var(--button-primary-bg);
}

.language-select:focus {
  outline: none;
  border-color: var(--button-primary-bg);
  box-shadow: 0 0 0 1px var(--primary-color-shadow);
}

.experimental-toggle {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid var(--border-color);
}

.experimental-badge {
  display: inline-block;
  background-color: #ff9800;
  color: white;
  font-size: 10px;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: var(--border-radius-sm);
  margin-left: 4px;
  vertical-align: middle;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

/* Collapsible section styles */
.collapsible-header {
  cursor: pointer;
  transition: background-color 0.2s ease;
  border-radius: var(--border-radius-sm);
  position: relative;
}

.collapsible-header:hover {
  background-color: rgba(0, 0, 0, 0.03);
}

body.dark-theme .collapsible-header:hover {
  background-color: rgba(255, 255, 255, 0.05);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toggle-icon {
  font-size: 14px;
  color: var(--button-primary-bg);
  transition: transform 0.25s cubic-bezier(0.25, 1, 0.5, 1), color 0.15s ease;
  display: inline-block;
  width: 14px;
  text-align: center;
  transform-origin: center;
  opacity: 0.8;
}

body.dark-theme .toggle-icon {
  opacity: 0.9;
}

.collapsible-header:hover .toggle-icon {
  color: var(--button-primary-bg);
}

/* Improved rotation logic for toggle icon */
[class*="-content"].collapsed ~ .header-right .toggle-icon,
[class*="-content"].collapsed + .toggle-icon,
.collapsed + .toggle-icon,
.collapsed ~ .toggle-icon,
[v-show="false"] ~ .header-right .toggle-icon {
  transform: rotate(-90deg);
}

.collapsed {
  max-height: 0 !important;
  opacity: 0 !important;
  overflow: hidden !important;
  transform: translateY(-5px) !important;
  margin-top: 0 !important;
  margin-bottom: 0 !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  border-top-width: 0 !important;
  border-bottom-width: 0 !important;
}

/* Base styles for all collapsible content */
.genre-content, .language-content, .rec-number-content, .posters-row-content, 
.plex-content, .jellyfin-content, .tautulli-content, .trakt-content,
.config-content, .vibe-content, .settings-content {
  will-change: max-height, opacity, transform;
  box-sizing: border-box;
}

/* Widescreen toggle styling */
.widescreen-toggle {
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid var(--border-color-light);
}

.widescreen-toggle .setting-tip {
  margin-top: 10px;
  padding-left: 25px;
  font-size: 0.9em;
  color: var(--text-secondary);
  opacity: 0.8;
}

/* Prevent scroll jumping during animations */
.collapsible-header {
  position: relative;
  z-index: 1;
}

.info-section-title.collapsible-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  padding: 5px 5px 5px 0;
  border-radius: var(--border-radius-sm);
  margin-bottom: 10px;
}

.info-section-title.collapsible-header:hover {
  background-color: rgba(0, 0, 0, 0.03);
}

body.dark-theme .info-section-title.collapsible-header:hover {
  background-color: rgba(255, 255, 255, 0.05);
}

/* Watch History Modal Styles */
.watch-history-modal {
  max-width: 90%;
  width: 900px;
  max-height: 90vh;
  z-index: 5; /* Ensure it's above the mobile menu */
}

.watch-history-section {
  margin-top: 15px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 10px;
}

.watch-history-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
}

.view-history-button {
  background-color: var(--accent-color);
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
  align-self: flex-start;
}

.view-history-button:hover {
  background-color: var(--accent-color-hover);
}

.history-controls {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 20px;
}

.history-filters {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.filter-row {
  display: flex;
  gap: 15px;
  align-items: flex-end;
}

.pagination-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 5px;
}

.items-per-page {
  display: flex;
  align-items: center;
  gap: 8px;
}

.items-per-page select {
  padding: 8px 10px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  background-color: var(--background-color);
  color: var(--text-color);
  min-width: 70px;
}

.pagination-buttons {
  display: flex;
  gap: 5px;
  align-items: center;
}

.pagination-button {
  background-color: var(--background-color);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 6px 10px;
  cursor: pointer;
  color: var(--text-color);
  transition: all 0.2s ease;
}

.pagination-button:hover:not(:disabled) {
  background-color: var(--accent-color);
  color: white;
  border-color: var(--accent-color);
}

.pagination-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.current-page {
  padding: 0 10px;
  font-weight: 500;
  color: var(--accent-color);
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-group label {
  font-size: 0.9em;
  font-weight: 500;
  color: var(--text-color-secondary);
}

.filter-group select {
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  background-color: var(--background-color);
  color: var(--text-color);
  min-width: 110px;
  max-width: 180px;
}

.search-row {
  width: 100%;
}

.history-search {
  width: 100%;
  padding: 10px 12px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  background-color: var(--background-color);
  color: var(--text-color);
  font-size: 1em;
}

.history-search:focus {
  border-color: var(--accent-color);
  outline: none;
  box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
}

.pagination-info {
  font-size: 0.9em;
  color: var(--text-color-secondary);
}

.history-table-container {
  overflow-x: auto;
  max-height: 50vh;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background-color: var(--background-color);
  margin-top: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.history-table {
  width: 100%;
  border-collapse: collapse;
}

.history-table th,
.history-table td {
  padding: 12px 10px;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

.history-table tr:nth-child(even) {
  background-color: rgba(0, 0, 0, 0.02);
}

.history-table tr:hover {
  background-color: rgba(33, 150, 243, 0.05);
}

.history-table th {
  background-color: #f5f7fa; /* Light solid color for light theme */
  position: sticky;
  top: 0;
  z-index: 1;
  box-shadow: 0 1px 0 var(--border-color), 0 2px 4px rgba(0, 0, 0, 0.05);
  font-weight: 600;
  color: var(--accent-color);
  padding: 15px 10px;
}

/* Dark theme support */
body.dark-theme .history-table th {
  background-color: #2d3748; /* Dark solid color for dark theme */
  color: #90caf9; /* Lighter blue for dark theme */
}

.title-column {
  max-width: 40%;
}

.no-history {
  padding: 20px;
  text-align: center;
  color: var(--text-color-secondary);
}

.watch-history-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 15px;
}

.history-title h4 {
  margin-top: 0;
  margin-bottom: 5px;
  color: var(--accent-color);
}

.history-title .item-count {
  font-size: 0.9em;
  color: var(--text-color-secondary);
  margin: 0;
}

.filter-controls {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.search-container {
  margin-bottom: 15px;
}

/* Modern card redesign */
.recommendation-list {
  display: grid;
  gap: 24px;
  margin-top: 24px;
  grid-auto-flow: dense; /* Fill gaps when some items span multiple rows */
  grid-auto-rows: min-content;
}

.recommendation-card {
  background-color: var(--card-bg-color);
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  position: relative;
  border: none;
  backdrop-filter: blur(5px);
  transform-origin: center bottom;
}

.recommendation-card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.15);
}

.card-content {
  display: flex;
  flex-direction: row;
}

.card-content.compact-layout {
  flex-direction: column;
}

.poster-container {
  position: relative;
  flex: 0 0 150px;
  overflow: hidden;
  border-radius: 12px;
  box-shadow: 0 6px 15px rgba(0, 0, 0, 0.15);
}

.poster {
  width: 100%;
  height: 210px;
  background-size: cover;
  background-position: center top;
  transition: transform 0.5s cubic-bezier(0.33, 1, 0.68, 1);
  filter: saturate(1.1) contrast(1.05);
  position: relative;
}

.poster::after {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(to bottom, 
    rgba(0,0,0,0) 60%,
    rgba(0,0,0,0.6) 100%
  );
  opacity: 0;
  transition: opacity 0.3s ease;
}

.recommendation-card:hover .poster {
  transform: scale(1.08);
}

.recommendation-card:hover .poster::after {
  opacity: 1;
}

.rating-badge {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  color: white;
  font-weight: 800;
  font-size: 18px;
  letter-spacing: 0.5px;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 38px;
  transform: translateZ(0);
  transition: all 0.3s ease;
  overflow: hidden;
  backdrop-filter: blur(8px);
}

.rating-badge::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  opacity: 0.85;
  z-index: -1;
  transition: opacity 0.3s ease;
}

.recommendation-card:hover .rating-badge::before {
  opacity: 0.95;
}

.rating-badge::after {
  content: '★ ' attr(data-rating);
  position: relative;
  z-index: 1;
}

.rating-badge.high::before {
  background: linear-gradient(90deg, rgba(16, 185, 129, 0.95), rgba(5, 150, 105, 0.95));
}

.rating-badge.medium::before {
  background: linear-gradient(90deg, rgba(245, 158, 11, 0.95), rgba(217, 119, 6, 0.95));
}

.rating-badge.low::before {
  background: linear-gradient(90deg, rgba(239, 68, 68, 0.95), rgba(220, 38, 38, 0.95));
}

.details-container {
  flex: 1;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 1;
}

.details-container:before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 80px;
  background: linear-gradient(180deg, rgba(var(--card-bg-rgb, 255, 255, 255), 0.08) 0%, rgba(var(--card-bg-rgb, 255, 255, 255), 0) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: -1;
  pointer-events: none;
}

.recommendation-card:hover .details-container:before {
  opacity: 1;
}

.card-header {
  margin-bottom: 10px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.recommendation-card h3 {
  margin: 0 0 5px 0;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.25;
  color: var(--header-color);
  position: relative;
  display: inline-block;
  transition: transform 0.3s ease;
}

.card-actions {
  display: flex;
  gap: 10px;
  margin-left: 8px;
}

.action-btn {
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  border-radius: 50%;
  color: var(--text-color);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.action-btn:before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: currentColor;
  border-radius: 50%;
  opacity: 0;
  transform: scale(0.5);
  transition: all 0.2s ease;
  z-index: -1;
}

.action-btn:hover {
  transform: translateY(-3px) scale(1.15);
  color: white;
}

.action-btn:hover:before {
  opacity: 0.15;
  transform: scale(1);
}

.like-btn.active {
  color: #10b981;
  transform: scale(1.1);
}

.dislike-btn.active {
  color: #ef4444;
  transform: scale(1.1);
}

.request-button {
  background-color: var(--primary-color, #0072e5);
  color: white;
  border: none;
  border-radius: 30px;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.3px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
}

/* Add specific styles for light mode to ensure visibility */
body:not(.dark-theme) .request-button {
  background-color: #0072e5;
  color: white;
  box-shadow: 0 2px 5px rgba(0, 114, 229, 0.25);
}

.request-button:before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(to right, transparent 0%, rgba(255, 255, 255, 0.2) 50%, transparent 100%);
  transform: translateX(-100%);
  transition: transform 0.6s ease;
}

.request-button:hover:not(:disabled):before {
  transform: translateX(100%);
}

.request-button:hover:not(:disabled) {
  background-color: var(--primary-color-dark, #005bb8);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.request-button.requested {
  background-color: #10b981;
}

.content-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
}

/* Ensure expanded content doesn't disrupt the grid layout */
.recommendation-card.expanded .content-container {
  min-height: fit-content;
  isolation: isolate; /* Create a new stacking context */
}

.description, .reasoning, .full-text {
  position: relative;
  transition: transform 0.3s ease;
}

.recommendation-card:hover .description, 
.recommendation-card:hover .reasoning,
.recommendation-card:hover .full-text {
  transform: translateY(-3px);
}

.description p, .reasoning p, .full-text p {
  margin: 0;
  font-size: 15px;
  line-height: 1.6;
  color: var(--text-color);
  position: relative;
  transition: color 0.3s ease;
}

.description {
  position: relative;
  padding: 0 0 0 16px;
  border-left: 3px solid rgba(var(--primary-color-rgb, 0, 114, 229), 0.3);
  border-radius: 2px;
  margin-bottom: 6px;
}

.description p {
  font-style: italic;
  opacity: 0.9;
  font-size: 15px;
  line-height: 1.6;
  transition: color 0.3s ease;
}

.recommendation-card:hover .description p {
  color: var(--header-color);
  opacity: 1;
}

.reasoning {
  position: relative;
  padding: 12px 16px;
  background-color: var(--card-bg-color, white);
  border-radius: 12px;
  transition: all 0.25s ease;
  margin-top: 6px;
  border-left: 3px solid var(--primary-color, #0072e5);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

/* Dark mode support */
body.dark-theme .reasoning {
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
  background-color: rgba(35, 35, 40, 0.4);
  backdrop-filter: blur(5px);
}

.recommendation-card:hover .reasoning {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

body.dark-theme .recommendation-card:hover .reasoning {
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.reasoning-header {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  position: relative;
  z-index: 1;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(var(--primary-color-rgb, 0, 114, 229), 0.1);
}

.reasoning-icon {
  font-size: 14px;
  margin-right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(var(--primary-color-rgb, 0, 114, 229), 0.1);
  color: var(--primary-color, #0072e5);
  width: 24px;
  height: 24px;
  border-radius: 50%;
}

body.dark-theme .reasoning-icon {
  background-color: rgba(var(--primary-color-rgb, 0, 114, 229), 0.15);
}

.reasoning-label {
  font-weight: 600;
  font-size: 13px;
  color: var(--primary-color, #0072e5);
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  letter-spacing: 0.2px;
}

.reasoning-content {
  position: relative;
  z-index: 1;
}

.reasoning-content {
  position: relative;
  padding: 4px 0;
}

.reasoning-content p {
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-color);
  font-weight: 400;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  position: relative;
  margin: 0;
}

.reasoning-content p::first-letter {
  color: var(--primary-color, #0072e5);
  font-weight: 500;
}

.rating-info {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  font-size: 14px;
  color: var(--text-color-light);
  opacity: 0.7;
  transition: opacity 0.3s ease;
}

.rating-info:hover {
  opacity: 1;
}

.info-tooltip {
  display: inline-flex;
  cursor: help;
  color: var(--text-color-light);
  padding: 4px;
  border-radius: 50%;
  transition: all 0.3s ease;
  position: relative;
}

.info-tooltip:hover {
  background-color: rgba(0, 0, 0, 0.05);
  transform: scale(1.1);
}

.full-width-expand-button {
  width: 100%;
  background: none;
  border: none;
  border-top: 1px solid var(--border-color);
  margin-top: 10px;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  color: var(--text-color-light);
  font-size: 14px;
  font-weight: 500;
  position: relative;
  overflow: hidden;
}

.full-width-expand-button:before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(to right, transparent 0%, rgba(var(--primary-color-rgb, 0, 114, 229), 0.05) 50%, transparent 100%);
  transform: translateX(-100%);
  transition: transform 0.4s ease;
}

.full-width-expand-button:hover:before {
  transform: translateX(100%);
}

.full-width-expand-button:hover {
  background-color: rgba(var(--primary-color-rgb, 0, 114, 229), 0.03);
  color: var(--primary-color);
}

.full-width-expand-button.expanded {
  background-color: rgba(var(--primary-color-rgb, 0, 114, 229), 0.04);
  color: var(--primary-color);
  font-weight: 600;
}

/* Compact mode adjustments */
.recommendation-card.compact-mode {
  display: flex;
  flex-direction: column;
  height: auto;
}

.recommendation-card.compact-mode:not(.expanded) .description,
.recommendation-card.compact-mode:not(.expanded) .reasoning {
  display: none;
}

.recommendation-card.compact-mode.expanded {
  height: auto;
  grid-row: auto / span 2; /* Take up more vertical space without affecting other cards */
  z-index: 2; /* Ensure expanded card appears above others */
}

/* Add a gradient border effect to the cards */
.recommendation-card:after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(135deg, 
    rgba(var(--primary-color-rgb, 0, 114, 229), 0.1) 0%, 
    rgba(var(--primary-color-rgb, 0, 114, 229), 0.01) 50%,
    rgba(255, 255, 255, 0.1) 100%
  );
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: destination-out;
  mask-composite: exclude;
  opacity: 0;
  transition: opacity 0.4s ease;
  pointer-events: none;
}

.recommendation-card:hover:after {
  opacity: 1;
}

/* Subtle card hover lift animation */
@keyframes card-lift {
  0% { transform: translateY(0) scale(1); }
  100% { transform: translateY(-8px) scale(1.02); }
}

.recommendation-card:hover {
  animation: card-lift 0.5s cubic-bezier(0.23, 1, 0.32, 1) forwards;
}

@media (max-width: 600px) {
  .recommendation-list {
    gap: 20px;
  }
  
  .card-content {
    flex-direction: column;
  }
  
  .poster-container {
    width: 100%;
    flex: initial;
    height: 200px;
    overflow: hidden;
    border-radius: 12px 12px 0 0;
  }
  
  .poster {
    height: 200px;
    width: 100%;
  }
  
  .card-header {
    flex-direction: column;
  }
  
  .card-actions {
    width: 100%;
    justify-content: space-between;
    margin-left: 0;
    margin-top: 10px;
  }
  
  .recommendation-card {
    transform: none !important;
    animation: none !important;
  }
  
  .recommendation-card:hover {
    transform: translateY(-5px) !important;
  }
  
  .recommendation-card:hover .description, 
  .recommendation-card:hover .reasoning,
  .recommendation-card:hover .full-text {
    transform: none;
  }
}

/* Prompt Style Help Styles */
.prompt-style-help {
  margin-top: 12px;
  border-radius: 6px;
  background-color: rgba(0, 0, 0, 0.04);
  padding: 12px 15px;
  font-size: 0.9rem;
  line-height: 1.4;
  transition: all 0.3s ease;
}

.dark-theme .prompt-style-help {
  background-color: rgba(255, 255, 255, 0.08);
}

.prompt-style-info h4 {
  margin-top: 0;
  margin-bottom: 8px;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-primary);
}

.prompt-style-info p {
  margin: 0 0 8px;
}

.prompt-style-info p:last-child {
  margin-bottom: 0;
  font-style: italic;
}

.prompt-style-info em {
  font-style: italic;
  font-weight: 500;
}

.config-section {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid var(--border-color);
}

.section-label {
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--accent-color);
  font-size: 14px;
}

.config-item {
  margin-bottom: 15px;
  padding: 10px;
  background-color: var(--background-color);
  border-radius: var(--border-radius-sm);
  border: 1px solid var(--border-color);
}

/* Toggle Switch Styles */
.prompt-option-toggle {
  margin: 15px 0;
}

.toggle-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 5px;
}

.toggle-label {
  font-weight: 500;
  margin-right: 10px;
}

/* The switch - the box around the slider */
.switch {
  position: relative;
  display: inline-block;
  width: 46px;
  height: 24px;
}

/* Hide default HTML checkbox */
.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

/* The slider */
.switch .slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--border-color);
  transition: 0.3s;
}

.switch .slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
}

input:checked + .slider {
  background-color: var(--accent-color);
}

input:focus + .slider {
  box-shadow: 0 0 1px var(--accent-color);
}

input:checked + .slider:before {
  transform: translateX(22px);
}

/* Rounded sliders */
.slider.round {
  border-radius: 12px;
}

.slider.round:before {
  border-radius: 50%;
}
</style>