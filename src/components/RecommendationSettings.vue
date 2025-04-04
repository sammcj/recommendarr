<template>
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
                  <select 
                    :value="selectedModel" 
                    @change="$emit('update:selectedModel', $event.target.value); updateModel($event.target.value);" 
                    class="model-select">
                  <option value="" disabled>{{ modelOptions.length === 0 ? 'No models available' : 'Select a model' }}</option>
                  <option v-for="model in modelOptions" :key="model.id" :value="model.id">{{ model.id }}</option>
                  <option value="custom">Custom/Other...</option>
                </select>
                <div v-if="fetchError" class="fetch-error" @click="goToSettings">{{ fetchError }} <span class="error-link">Click to configure API settings</span></div>
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
                      :value="temperature"
                      @input="$emit('update:temperature', Number($event.target.value)); updateTemperature($event.target.value)"
                      min="0" 
                      max="1"
                      step="0.1"
                      class="modern-slider"
                      @change="$emit('update:temperature', Number($event.target.value)); updateTemperature($event.target.value)"
                    />
                    <div class="slider-track" :style="{ width: `${temperature * 100}%` }"></div>
                  </div>
                </div>
              </div>
              
              <div class="library-mode-toggle">
                <label class="checkbox-label">
                  <input 
                    type="checkbox" 
                      :checked="useSampledLibrary"
                      @change="$emit('update:useSampledLibrary', $event.target.checked); saveLibraryModePreference($event.target.checked)"
                  >
                  Use Sampled Library Mode
                </label>
                <div class="setting-description">
                  Samples a subset of your library to reduce token usage while still providing relevant recommendations.
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
                      :value="sampleSize"
                      @input="$emit('update:sampleSize', Number($event.target.value)); saveSampleSize($event.target.value)"
                      min="5" 
                      max="1000"
                      class="modern-slider"
                      @change="$emit('update:sampleSize', Number($event.target.value)); saveSampleSize($event.target.value)"
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
                      :checked="useStructuredOutput"
                      @change="$emit('update:useStructuredOutput', $event.target.checked); saveStructuredOutputPreference($event.target.checked);"
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
          
          <div class="content-type-toggle">
            <label class="toggle-label">Content Type:</label>
            <div class="toggle-buttons">
              <button 
                @click="updateContentType(false)" 
                :class="['toggle-button', {'active': !isMovieMode}]"
              >
                TV Shows
              </button>
              <button 
                @click="updateContentType(true)" 
                :class="['toggle-button', {'active': isMovieMode}]"
              >
                Movies
              </button>
            </div>
          </div>
        </div>
        
        <div class="count-selector">
          <div class="collapsible-header" @click="toggleRecNumber">
            <div class="slider-header">
              <label for="recommendationsSlider">Number of recommendations</label>
              <div class="header-right">
                <span class="slider-value">{{ numRecommendations }}</span>
                <span class="toggle-icon">{{ recNumberExpanded ? '▼' : '▶' }}</span>
              </div>
            </div>
          </div>
          <div class="rec-number-content" :class="{ 'collapsed': !recNumberExpanded }" v-show="recNumberExpanded">
            <div class="modern-slider-container">
              <div class="slider-track-container">
                <input 
                  type="range" 
                  id="recommendationsSlider"
                    :value="numRecommendations"
                    @input="$emit('update:numRecommendations', Number($event.target.value)); saveRecommendationCount($event.target.value)"
                  min="1" 
                  max="50"
                  class="modern-slider"
                  @change="$emit('update:numRecommendations', Number($event.target.value)); saveRecommendationCount($event.target.value)"
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
        
        <div class="count-selector">
          <div class="collapsible-header" @click="togglePostersPerRow">
            <div class="slider-header">
              <label for="columnsSlider">Posters per row</label>
              <div class="header-right">
                <span class="slider-value">{{ columnsCount }}</span>
                <span class="toggle-icon">{{ postersPerRowExpanded ? '▼' : '▶' }}</span>
              </div>
            </div>
          </div>
          <div class="posters-row-content" :class="{ 'collapsed': !postersPerRowExpanded }" v-show="postersPerRowExpanded">
            <div class="modern-slider-container">
              <div class="slider-track-container">
                <input 
                  type="range" 
                  id="columnsSlider"
                    :value="columnsCount"
                    @input="$emit('update:columnsCount', Number($event.target.value)); handleResize(); saveColumnsCount($event.target.value)"
  min="1" 
  max="10"
  class="modern-slider"
    @change="$emit('update:columnsCount', Number($event.target.value)); saveColumnsCount($event.target.value)"
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
                :class="['genre-tag', {'selected': selectedGenres && Array.isArray(selectedGenres) && selectedGenres.includes(genre.value)}]"
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
                      :value="promptStyle"
                      @change="$emit('update:promptStyle', $event.target.value); savePromptStyle($event.target.value)"
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
                  :value="customVibe"
                  @input="$emit('update:customVibe', $event.target.value); this.recommendationsRequested = false"
                @change="$emit('update:customVibe', $event.target.value); saveCustomVibe($event.target.value)"
                placeholder="e.g., cozy mysteries, dark comedy, mind-bending, nostalgic 90s feel..."
                class="vibe-input"
                rows="2"
              ></textarea>
            </div>
            
            <div class="prompt-option-toggle">
              <div class="checkbox-header">
                <input 
                    type="checkbox" 
                        :checked="useCustomPromptOnly"
                        @change="$emit('update:useCustomPromptOnly', $event.target.checked); saveCustomPromptOnlyPreference($event.target.checked)"
                  >
                <span class="checkbox-label">Only base results on custom prompt</span>
                <label class="checkbox">
                </label>
              </div>
              <div class="setting-description">
                Recommendations will be based solely on the "Additional Keywords/Themes" field. Library and watch history will not be included in the prompt.
              </div>
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
                    :value="selectedLanguage"
                    @change="$emit('update:selectedLanguage', $event.target.value); saveLanguagePreference($event.target.value)"
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
        
<div class="library-refresh-section" v-if="isAdmin">
  <div class="refresh-header">
    <h3>Library Management</h3>
  </div>
  <div class="refresh-buttons">
<button 
  @click.stop="refreshSonarrLibrary" 
  class="refresh-button sonarr-refresh"
  :class="{ 'refreshing': refreshingSonarr, 'success': sonarrRefreshSuccess }"
  title="Refresh Sonarr library from API"
  :disabled="refreshingSonarr"
>
  <span v-if="sonarrRefreshSuccess" class="success-icon">✓</span>
  <span v-else class="refresh-icon" :class="{ 'spinning': refreshingSonarr }">⟳</span>
  <span class="refresh-text">Refresh Sonarr Library</span>
</button>
<button 
  @click.stop="refreshRadarrLibrary" 
  class="refresh-button radarr-refresh"
  :class="{ 'refreshing': refreshingRadarr, 'success': radarrRefreshSuccess }"
  title="Refresh Radarr library from API"
  :disabled="refreshingRadarr"
>
  <span v-if="radarrRefreshSuccess" class="success-icon">✓</span>
  <span v-else class="refresh-icon" :class="{ 'spinning': refreshingRadarr }">⟳</span>
  <span class="refresh-text">Refresh Radarr Library</span>
</button>
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
            :checked="plexUseHistory"
            @change="$emit('update:plexUseHistory', $event.target.checked); savePlexUseHistory($event.target.checked)"
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
                      :checked="plexHistoryMode === 'all'"
                        @change="$emit('update:plexHistoryMode', 'all'); savePlexHistoryMode('all')"
                      value="all"
                  >
                  All watch history
                </label>
                <label class="toggle-option">
                  <input 
                    type="radio" 
                      :checked="plexHistoryMode === 'recent'"
                        @change="$emit('update:plexHistoryMode', 'recent'); savePlexHistoryMode('recent')"
                      value="recent"
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
                        :value="plexCustomHistoryDays"
                        @input="$emit('update:plexCustomHistoryDays', Number($event.target.value))"
                      min="1" 
                      max="365"
                      class="modern-slider"
                      @change="$emit('update:plexCustomHistoryDays', Number($event.target.value)); savePlexCustomHistoryDays($event.target.value)"
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
                      :checked="plexOnlyMode"
                      @change="$emit('update:plexOnlyMode', $event.target.checked); savePlexOnlyMode($event.target.checked)"
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
                        :checked="jellyfinUseHistory"
                        @change="$emit('update:jellyfinUseHistory', $event.target.checked); saveJellyfinUseHistory($event.target.checked)"
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
                      :checked="jellyfinHistoryMode === 'all'"
                        @change="$emit('update:jellyfinHistoryMode', 'all'); saveJellyfinHistoryMode('all')"
                      value="all"
                  >
                  All watch history
                </label>
                <label class="toggle-option">
                  <input 
                    type="radio" 
                      :checked="jellyfinHistoryMode === 'recent'"
                        @change="$emit('update:jellyfinHistoryMode', 'recent'); saveJellyfinHistoryMode('recent')"
                      value="recent"
                  >
                  Recent (30 days)
                </label>
                <label class="toggle-option">
                  <input 
                    type="radio" 
                      :checked="jellyfinHistoryMode === 'custom'"
                        @change="$emit('update:jellyfinHistoryMode', 'custom'); saveJellyfinHistoryMode('custom')"
                      value="custom"
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
                        :value="jellyfinCustomHistoryDays"
                        @input="$emit('update:jellyfinCustomHistoryDays', Number($event.target.value))"
                      min="1" 
                      max="365"
                      class="modern-slider"
                      @change="$emit('update:jellyfinCustomHistoryDays', Number($event.target.value)); saveJellyfinCustomHistoryDays($event.target.value)"
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
                      :checked="jellyfinOnlyMode"
                        @change="$emit('update:jellyfinOnlyMode', $event.target.checked); saveJellyfinOnlyMode($event.target.checked)"
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
                        :checked="tautulliUseHistory"
                        @change="$emit('update:tautulliUseHistory', $event.target.checked); saveTautulliUseHistory($event.target.checked)"
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
                      :checked="tautulliHistoryMode === 'all'"
                        @change="$emit('update:tautulliHistoryMode', 'all'); saveTautulliHistoryMode('all')"
                      value="all"
                  >
                  All watch history
                </label>
                <label class="toggle-option">
                  <input 
                    type="radio" 
                      :checked="tautulliHistoryMode === 'recent'"
                        @change="$emit('update:tautulliHistoryMode', 'recent'); saveTautulliHistoryMode('recent')"
                      value="recent"
                  >
                  Recent (30 days)
                </label>
                <label class="toggle-option">
                  <input 
                    type="radio" 
                      :checked="tautulliHistoryMode === 'custom'"
                        @change="$emit('update:tautulliHistoryMode', 'custom'); saveTautulliHistoryMode('custom')"
                      value="custom"
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
                        :value="tautulliCustomHistoryDays"
                        @input="$emit('update:tautulliCustomHistoryDays', Number($event.target.value))"
                      min="1" 
                      max="365"
                      class="modern-slider"
                      @change="$emit('update:tautulliCustomHistoryDays', Number($event.target.value)); saveTautulliCustomHistoryDays($event.target.value)"
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
                      :checked="tautulliOnlyMode"
                        @change="$emit('update:tautulliOnlyMode', $event.target.checked); saveTautulliOnlyMode($event.target.checked)"
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
                        :checked="traktUseHistory"
                        @change="$emit('update:traktUseHistory', $event.target.checked); saveTraktUseHistory($event.target.checked)"
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
                      :checked="traktHistoryMode === 'all'"
                        @change="$emit('update:traktHistoryMode', 'all'); saveTraktHistoryMode('all')"
                      value="all"
                  >
                  All watch history
                </label>
                <label class="toggle-option">
                  <input 
                    type="radio" 
                      :checked="traktHistoryMode === 'recent'"
                        @change="$emit('update:traktHistoryMode', 'recent'); saveTraktHistoryMode('recent')"
                      value="recent"
                  >
                  Recent (30 days)
                </label>
                <label class="toggle-option">
                  <input 
                    type="radio" 
                      :checked="traktHistoryMode === 'custom'"
                        @change="$emit('update:traktHistoryMode', 'custom'); saveTraktHistoryMode('custom')"
                      value="custom"
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
                        :value="traktCustomHistoryDays"
                        @input="$emit('update:traktCustomHistoryDays', Number($event.target.value))"
                      min="1" 
                      max="365"
                      class="modern-slider"
                      @change="$emit('update:traktCustomHistoryDays', Number($event.target.value)); saveTraktCustomHistoryDays($event.target.value)"
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
                      :checked="traktOnlyMode"
                        @change="$emit('update:traktOnlyMode', $event.target.checked); saveTraktOnlyMode($event.target.checked)"
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
</template>

<script>
import sonarrService from '../services/SonarrService';
import radarrService from '../services/RadarrService';
import authService from '../services/AuthService';
import recommendationsStore from '../stores/RecommendationsStore';

export default {
  name: 'RecommendationSettings',
  data() {
    return {
      refreshingSonarr: false,
      refreshingRadarr: false,
      sonarrRefreshSuccess: false,
      radarrRefreshSuccess: false,
      recommendationsRequested: false
    };
  },
  async mounted() {
    console.log('RecommendationSettings mounted - initializing store');
    
    try {
      // Always wait for store initialization regardless of current state
      // This ensures we have the latest data from database
      await recommendationsStore.initialize();
      console.log('Store initialization complete or already initialized');
      
      // Explicitly sync all settings from store to component and parent
      this.syncUIStateToParent();
      
      // Force update component to ensure it renders with latest store data
      this.$forceUpdate();
      
      // Debug log to verify values are correctly loaded
      console.log('Settings initialized with store values', {
        selectedModel: recommendationsStore.state.selectedModel,
        temperature: recommendationsStore.state.temperature,
        selectedGenres: recommendationsStore.state.selectedGenres,
        sampleSize: recommendationsStore.state.sampleSize,
        useSampledLibrary: recommendationsStore.state.useSampledLibrary,
        numRecommendations: recommendationsStore.state.numRecommendations
      });
    } catch (error) {
      console.error('Error during RecommendationSettings initialization:', error);
    }
  },
  computed: {
    isAdmin() {
      return authService.isAdmin();
    },
    // Map store state to computed properties
    selectedModel() {
      return recommendationsStore.state.selectedModel;
    },
    temperature() {
      return recommendationsStore.state.temperature;
    },
    useStructuredOutput() {
      return recommendationsStore.state.useStructuredOutput;
    },
    useSampledLibrary() {
      return recommendationsStore.state.useSampledLibrary;
    },
    sampleSize() {
      return recommendationsStore.state.sampleSize;
    },
    numRecommendations() {
      return recommendationsStore.state.numRecommendations;
    },
    columnsCount() {
      return recommendationsStore.state.columnsCount;
    },
    selectedGenres() {
      return recommendationsStore.state.selectedGenres;
    },
    promptStyle() {
      return recommendationsStore.state.promptStyle;
    },
    customVibe() {
      return recommendationsStore.state.customVibe;
    },
    useCustomPromptOnly() {
      return recommendationsStore.state.useCustomPromptOnly;
    },
    selectedLanguage() {
      return recommendationsStore.state.selectedLanguage;
    },
    plexUseHistory() {
      return recommendationsStore.state.plexUseHistory;
    },
    plexHistoryMode() {
      return recommendationsStore.state.plexHistoryMode;
    },
    plexCustomHistoryDays() {
      return recommendationsStore.state.plexCustomHistoryDays;
    },
    plexOnlyMode() {
      return recommendationsStore.state.plexOnlyMode;
    },
    jellyfinUseHistory() {
      return recommendationsStore.state.jellyfinUseHistory;
    },
    jellyfinHistoryMode() {
      return recommendationsStore.state.jellyfinHistoryMode;
    },
    jellyfinCustomHistoryDays() {
      return recommendationsStore.state.jellyfinCustomHistoryDays;
    },
    jellyfinOnlyMode() {
      return recommendationsStore.state.jellyfinOnlyMode;
    },
    tautulliUseHistory() {
      return recommendationsStore.state.tautulliUseHistory;
    },
    tautulliHistoryMode() {
      return recommendationsStore.state.tautulliHistoryMode;
    },
    tautulliCustomHistoryDays() {
      return recommendationsStore.state.tautulliCustomHistoryDays;
    },
    tautulliOnlyMode() {
      return recommendationsStore.state.tautulliOnlyMode;
    },
    traktUseHistory() {
      return recommendationsStore.state.traktUseHistory;
    },
    traktHistoryMode() {
      return recommendationsStore.state.traktHistoryMode;
    },
    traktCustomHistoryDays() {
      return recommendationsStore.state.traktCustomHistoryDays;
    },
    traktOnlyMode() {
      return recommendationsStore.state.traktOnlyMode;
    },
    previousRecommendations() {
      return recommendationsStore.previousRecommendations;
    }
  },
  props: {
    settingsExpanded: {
      type: Boolean,
      default: false
    },
    configurationExpanded: {
      type: Boolean,
      default: false
    },
    recNumberExpanded: {
      type: Boolean,
      default: false
    },
    postersPerRowExpanded: {
      type: Boolean,
      default: false
    },
    genrePreferencesExpanded: {
      type: Boolean,
      default: false
    },
    customVibeExpanded: {
      type: Boolean,
      default: false
    },
    contentLanguageExpanded: {
      type: Boolean,
      default: false
    },
    plexHistoryExpanded: {
      type: Boolean,
      default: false
    },
    jellyfinHistoryExpanded: {
      type: Boolean,
      default: false
    },
    tautulliHistoryExpanded: {
      type: Boolean,
      default: false
    },
    traktHistoryExpanded: {
      type: Boolean,
      default: false
    },
    isMovieMode: {
      type: Boolean,
      default: false
    },
    sonarrConfigured: {
      type: Boolean,
      default: false
    },
    radarrConfigured: {
      type: Boolean,
      default: false
    },
    modelOptions: {
      type: Array,
      default: () => []
    },
    fetchingModels: {
      type: Boolean,
      default: false
    },
    fetchError: {
      type: String,
      default: ''
    },
    availableGenres: {
      type: Array,
      default: () => []
    },
    availableLanguages: {
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
    traktConfigured: {
      type: Boolean,
      default: false
    }
  },
  methods: {
    // Sync UI state from store to parent component via events
    syncUIStateToParent() {
      console.log('Syncing UI expansion states and settings to parent');
      
      // Sync UI expansion states
      this.$emit('update:settingsExpanded', recommendationsStore.state.settingsExpanded);
      this.$emit('update:configurationExpanded', recommendationsStore.state.configurationExpanded);
      this.$emit('update:recNumberExpanded', recommendationsStore.state.recNumberExpanded);
      this.$emit('update:postersPerRowExpanded', recommendationsStore.state.postersPerRowExpanded);
      this.$emit('update:genrePreferencesExpanded', recommendationsStore.state.genrePreferencesExpanded);
      this.$emit('update:customVibeExpanded', recommendationsStore.state.customVibeExpanded);
      this.$emit('update:contentLanguageExpanded', recommendationsStore.state.contentLanguageExpanded);
      this.$emit('update:plexHistoryExpanded', recommendationsStore.state.plexHistoryExpanded);
      this.$emit('update:jellyfinHistoryExpanded', recommendationsStore.state.jellyfinHistoryExpanded);
      this.$emit('update:tautulliHistoryExpanded', recommendationsStore.state.tautulliHistoryExpanded);
      this.$emit('update:traktHistoryExpanded', recommendationsStore.state.traktHistoryExpanded);
      
      // Sync settings data to ensure parent component is updated
      this.$emit('update:selectedModel', recommendationsStore.state.selectedModel);
      this.$emit('update:temperature', recommendationsStore.state.temperature);
      this.$emit('update:useSampledLibrary', recommendationsStore.state.useSampledLibrary);
      this.$emit('update:sampleSize', recommendationsStore.state.sampleSize);
      this.$emit('update:useStructuredOutput', recommendationsStore.state.useStructuredOutput);
      this.$emit('update:numRecommendations', recommendationsStore.state.numRecommendations);
      this.$emit('update:columnsCount', recommendationsStore.state.columnsCount);
      this.$emit('update:selectedGenres', recommendationsStore.state.selectedGenres);
      this.$emit('update:promptStyle', recommendationsStore.state.promptStyle);
      this.$emit('update:customVibe', recommendationsStore.state.customVibe);
      this.$emit('update:useCustomPromptOnly', recommendationsStore.state.useCustomPromptOnly);
      this.$emit('update:selectedLanguage', recommendationsStore.state.selectedLanguage);
      
      // Sync history settings
      this.$emit('update:plexUseHistory', recommendationsStore.state.plexUseHistory);
      this.$emit('update:plexHistoryMode', recommendationsStore.state.plexHistoryMode);
      this.$emit('update:plexCustomHistoryDays', recommendationsStore.state.plexCustomHistoryDays);
      this.$emit('update:plexOnlyMode', recommendationsStore.state.plexOnlyMode);
      
      this.$emit('update:jellyfinUseHistory', recommendationsStore.state.jellyfinUseHistory);
      this.$emit('update:jellyfinHistoryMode', recommendationsStore.state.jellyfinHistoryMode);
      this.$emit('update:jellyfinCustomHistoryDays', recommendationsStore.state.jellyfinCustomHistoryDays);
      this.$emit('update:jellyfinOnlyMode', recommendationsStore.state.jellyfinOnlyMode);
      
      this.$emit('update:tautulliUseHistory', recommendationsStore.state.tautulliUseHistory);
      this.$emit('update:tautulliHistoryMode', recommendationsStore.state.tautulliHistoryMode);
      this.$emit('update:tautulliCustomHistoryDays', recommendationsStore.state.tautulliCustomHistoryDays);
      this.$emit('update:tautulliOnlyMode', recommendationsStore.state.tautulliOnlyMode);
      
      this.$emit('update:traktUseHistory', recommendationsStore.state.traktUseHistory);
      this.$emit('update:traktHistoryMode', recommendationsStore.state.traktHistoryMode);
      this.$emit('update:traktCustomHistoryDays', recommendationsStore.state.traktCustomHistoryDays);
      this.$emit('update:traktOnlyMode', recommendationsStore.state.traktOnlyMode);
    },
    
    toggleSettings() {
      recommendationsStore.toggleSection('settingsExpanded');
      this.$emit('toggle-settings');
    },
    toggleConfiguration() {
      recommendationsStore.toggleSection('configurationExpanded');
      this.$emit('toggle-configuration');
    },
    toggleRecNumber() {
      recommendationsStore.toggleSection('recNumberExpanded');
      this.$emit('toggle-rec-number');
    },
    togglePostersPerRow() {
      recommendationsStore.toggleSection('postersPerRowExpanded');
      this.$emit('toggle-posters-per-row');
    },
    toggleGenrePreferences() {
      recommendationsStore.toggleSection('genrePreferencesExpanded');
      this.$emit('toggle-genre-preferences');
    },
    toggleCustomVibe() {
      recommendationsStore.toggleSection('customVibeExpanded');
      this.$emit('toggle-custom-vibe');
    },
    toggleContentLanguage() {
      recommendationsStore.toggleSection('contentLanguageExpanded');
      this.$emit('toggle-content-language');
    },
    togglePlexHistory() {
      recommendationsStore.toggleSection('plexHistoryExpanded');
      this.$emit('toggle-plex-history');
    },
    toggleJellyfinHistory() {
      recommendationsStore.toggleSection('jellyfinHistoryExpanded');
      this.$emit('toggle-jellyfin-history');
    },
    toggleTautulliHistory() {
      recommendationsStore.toggleSection('tautulliHistoryExpanded');
      this.$emit('toggle-tautulli-history');
    },
    toggleTraktHistory() {
      recommendationsStore.toggleSection('traktHistoryExpanded');
      this.$emit('toggle-trakt-history');
    },
    fetchModels() {
      // Emit event for parent component to handle fetching models
      this.$emit('fetch-models');
    },
    goToSettings() {
      // Navigate to settings page
      this.$emit('go-to-settings');
    },
    updateModel(value) {
      // Use the store to update the model
      recommendationsStore.updateSelectedModel(value)
        .then(() => {
          console.log('Saved model preference to store:', value);
        })
        .catch(error => {
          console.error('Failed to save model preference:', error);
        });
      
      this.$emit('update-model', value);
    },
    updateTemperature(value) {
      const numValue = Number(value);
      
      // Use the store to update the temperature
      recommendationsStore.updateTemperature(numValue)
        .then(() => {
          console.log('Saved temperature to store:', numValue);
        })
        .catch(error => {
          console.error('Failed to save temperature:', error);
        });
      
      this.$emit('update-temperature', numValue);
    },
    saveLibraryModePreference(value) {
      // Use the store to update the sampled library mode
      recommendationsStore.updateSampledLibrary(value)
        .then(() => {
          console.log('Saved sampled library mode to store:', value);
        })
        .catch(error => {
          console.error('Failed to save sampled library mode:', error);
        });
      
      // Also emit the event for parent component
      this.$emit('save-library-mode-preference', value);
    },
    saveSampleSize(value) {
      const numValue = Number(value);
      
      // Use the store to update the sample size
      recommendationsStore.updateSampleSize(numValue)
        .then(() => {
          console.log('Saved library sample size to store:', numValue);
        })
        .catch(error => {
          console.error('Failed to save library sample size:', error);
        });
      
      // Also emit the event for parent component
      this.$emit('save-sample-size', numValue);
    },
    saveStructuredOutputPreference(value) {
      // Use the store to update the structured output preference
      recommendationsStore.updateStructuredOutput(value)
        .then(() => {
          console.log('Saved structured output preference to store:', value);
        })
        .catch(error => {
          console.error('Failed to save structured output preference:', error);
        });
      
      this.$emit('save-structured-output-preference', value);
    },
    clearRecommendationHistory() {
      // Use the store to clear recommendation history
      recommendationsStore.clearRecommendationHistory()
        .then(() => {
          console.log('Cleared recommendation history in store');
        })
        .catch(error => {
          console.error('Failed to clear recommendation history:', error);
        });
      
      // Also emit the event for parent component for backward compatibility
      this.$emit('clear-recommendation-history');
    },
    async saveRecommendationCount(value) {
      const numValue = Number(value);
      try {
        console.log('Saving numRecommendations to store:', numValue);
        await recommendationsStore.updateNumRecommendations(numValue);
        // Update the local value to ensure UI is in sync
        this.$emit('update:numRecommendations', numValue);
      } catch (error) {
        console.error('Error saving numRecommendations:', error);
      }
      this.$emit('save-recommendation-count', numValue);
    },
    async saveColumnsCount(value) {
      const numValue = Number(value);
      try {
        console.log('Saving columnsCount to store:', numValue);
        await recommendationsStore.updateColumnsCount(numValue);
        // Update the local value to ensure UI is in sync
        this.$emit('update:columnsCount', numValue);
      } catch (error) {
        console.error('Error saving columnsCount:', error);
      }
      this.$emit('save-columns-count', numValue);
    },
    handleResize() {
      this.$emit('handle-resize');
    },
    toggleGenre(genre) {
      // Use the store to toggle the genre
      recommendationsStore.toggleGenre(genre)
        .then(() => {
          console.log('Toggled genre in store:', genre);
          // Emit event for parent component
          this.$emit('toggle-genre', genre);
        })
        .catch(error => {
          console.error('Failed to toggle genre:', error);
        });
    },
    clearGenres() {
      // Use the store to clear all genres
      recommendationsStore.clearGenres()
        .then(() => {
          console.log('Cleared all genres in store');
          // Emit event for parent component
          this.$emit('clear-genres');
        })
        .catch(error => {
          console.error('Failed to clear genres:', error);
        });
    },
    saveGenrePreferences() {
      // Use the store to save genre preferences
      recommendationsStore.clearGenres()
        .then(() => {
          // Add each genre individually to ensure the store state is updated correctly
          if (this.selectedGenres && this.selectedGenres.length > 0) {
            this.selectedGenres.forEach(genre => {
              recommendationsStore.toggleGenre(genre);
            });
          }
          console.log('Saved universal genre preferences to store:', this.selectedGenres);
        })
        .catch(error => {
          console.error('Failed to save universal genre preferences:', error);
        });
    },
    savePromptStyle(value) {
      // Use the store to update the prompt style
      recommendationsStore.updatePromptStyle(value)
        .then(() => {
          console.log('Saved prompt style to store:', value);
        })
        .catch(error => {
          console.error('Failed to save prompt style:', error);
        });
      
      this.$emit('save-prompt-style', value);
    },
    saveCustomVibe(value) {
      // Use the store to update the custom vibe
      recommendationsStore.updateCustomVibe(value)
        .then(() => {
          console.log('Saved universal custom vibe to store:', value);
        })
        .catch(error => {
          console.error('Failed to save universal custom vibe:', error);
        });
      
      // Also emit the event for parent component
      this.$emit('save-custom-vibe', value);
    },
    clearCustomVibe() {
      // Use the store to clear the custom vibe
      recommendationsStore.clearCustomVibe()
        .then(() => {
          console.log('Cleared custom vibe in store');
        })
        .catch(error => {
          console.error('Failed to clear custom vibe:', error);
        });
      
      this.$emit('clear-custom-vibe');
    },
    saveCustomPromptOnlyPreference(value) {
      // Use the store to update the custom prompt only preference
      recommendationsStore.updateCustomPromptOnly(value)
        .then(() => {
          console.log('Saved universal custom prompt only preference to store:', value);
        })
        .catch(error => {
          console.error('Failed to save universal custom prompt only preference:', error);
        });
      
      // Also emit the event for parent component
      this.$emit('save-custom-prompt-only-preference', value);
    },
    saveLanguagePreference(value) {
      // Ensure value is a string
      const stringValue = String(value);
      
      // Use the store to update the language preference
      recommendationsStore.updateSelectedLanguage(stringValue)
        .then(() => {
          console.log('Saved universal language preference to store:', stringValue);
        })
        .catch(error => {
          console.error('Failed to save universal language preference:', error);
        });
      
      // Also emit the event for parent component
      this.$emit('save-language-preference', stringValue);
    },
    savePlexUseHistory(value) {
      // Use the store to update the Plex use history setting
      recommendationsStore.updatePlexUseHistory(value)
        .then(() => {
          console.log('Saved Plex use history setting to store:', value);
        })
        .catch(error => {
          console.error('Failed to save Plex use history setting:', error);
        });
      
      this.$emit('save-plex-use-history', value);
    },
    savePlexHistoryMode(value) {
      // Use the store to update the Plex history mode
      recommendationsStore.updatePlexHistoryMode(value)
        .then(() => {
          console.log('Saved Plex history mode to store:', value);
        })
        .catch(error => {
          console.error('Failed to save Plex history mode:', error);
        });
      
      this.$emit('save-plex-history-mode', value);
    },
    savePlexCustomHistoryDays(value) {
      const numValue = Number(value);
      
      // Use the store to update the Plex custom history days
      recommendationsStore.updatePlexCustomHistoryDays(numValue)
        .then(() => {
          console.log('Saved Plex custom history days to store:', numValue);
        })
        .catch(error => {
          console.error('Failed to save Plex custom history days:', error);
        });
      
      this.$emit('save-plex-custom-history-days', numValue);
    },
    savePlexOnlyMode(value) {
      // Use the store to update the Plex only mode
      recommendationsStore.updatePlexOnlyMode(value)
        .then(() => {
          console.log('Saved Plex only mode to store:', value);
        })
        .catch(error => {
          console.error('Failed to save Plex only mode:', error);
        });
      
      this.$emit('save-plex-only-mode', value);
    },
    saveJellyfinUseHistory(value) {
      // Use the store to update the Jellyfin use history setting
      recommendationsStore.updateJellyfinUseHistory(value)
        .then(() => {
          console.log('Saved Jellyfin use history setting to store:', value);
        })
        .catch(error => {
          console.error('Failed to save Jellyfin use history setting:', error);
        });
      
      this.$emit('save-jellyfin-use-history', value);
    },
    saveJellyfinHistoryMode(value) {
      // Use the store to update the Jellyfin history mode
      recommendationsStore.updateJellyfinHistoryMode(value)
        .then(() => {
          console.log('Saved Jellyfin history mode to store:', value);
        })
        .catch(error => {
          console.error('Failed to save Jellyfin history mode:', error);
        });
      
      this.$emit('save-jellyfin-history-mode', value);
    },
    saveJellyfinCustomHistoryDays(value) {
      const numValue = Number(value);
      
      // Use the store to update the Jellyfin custom history days
      recommendationsStore.updateJellyfinCustomHistoryDays(numValue)
        .then(() => {
          console.log('Saved Jellyfin custom history days to store:', numValue);
        })
        .catch(error => {
          console.error('Failed to save Jellyfin custom history days:', error);
        });
      
      this.$emit('save-jellyfin-custom-history-days', numValue);
    },
    saveJellyfinOnlyMode(value) {
      // Use the store to update the Jellyfin only mode
      recommendationsStore.updateJellyfinOnlyMode(value)
        .then(() => {
          console.log('Saved Jellyfin only mode to store:', value);
        })
        .catch(error => {
          console.error('Failed to save Jellyfin only mode:', error);
        });
      
      this.$emit('save-jellyfin-only-mode', value);
    },
    saveTautulliUseHistory(value) {
      // Use the store to update the Tautulli use history setting
      recommendationsStore.updateTautulliUseHistory(value)
        .then(() => {
          console.log('Saved Tautulli use history setting to store:', value);
        })
        .catch(error => {
          console.error('Failed to save Tautulli use history setting:', error);
        });
      
      this.$emit('save-tautulli-use-history', value);
    },
    saveTautulliHistoryMode(value) {
      // Use the store to update the Tautulli history mode
      recommendationsStore.updateTautulliHistoryMode(value)
        .then(() => {
          console.log('Saved Tautulli history mode to store:', value);
        })
        .catch(error => {
          console.error('Failed to save Tautulli history mode:', error);
        });
      
      this.$emit('save-tautulli-history-mode', value);
    },
    saveTautulliCustomHistoryDays(value) {
      const numValue = Number(value);
      
      // Use the store to update the Tautulli custom history days
      recommendationsStore.updateTautulliCustomHistoryDays(numValue)
        .then(() => {
          console.log('Saved Tautulli custom history days to store:', numValue);
        })
        .catch(error => {
          console.error('Failed to save Tautulli custom history days:', error);
        });
      
      this.$emit('save-tautulli-custom-history-days', numValue);
    },
    saveTautulliOnlyMode(value) {
      // Use the store to update the Tautulli only mode
      recommendationsStore.updateTautulliOnlyMode(value)
        .then(() => {
          console.log('Saved Tautulli only mode to store:', value);
        })
        .catch(error => {
          console.error('Failed to save Tautulli only mode:', error);
        });
      
      this.$emit('save-tautulli-only-mode', value);
    },
    saveTraktUseHistory(value) {
      // Use the store to update the Trakt use history setting
      recommendationsStore.updateTraktUseHistory(value)
        .then(() => {
          console.log('Saved Trakt use history setting to store:', value);
        })
        .catch(error => {
          console.error('Failed to save Trakt use history setting:', error);
        });
      
      this.$emit('save-trakt-use-history', value);
    },
    saveTraktHistoryMode(value) {
      // Use the store to update the Trakt history mode
      recommendationsStore.updateTraktHistoryMode(value)
        .then(() => {
          console.log('Saved Trakt history mode to store:', value);
        })
        .catch(error => {
          console.error('Failed to save Trakt history mode:', error);
        });
      
      this.$emit('save-trakt-history-mode', value);
    },
    saveTraktCustomHistoryDays(value) {
      const numValue = Number(value);
      
      // Use the store to update the Trakt custom history days
      recommendationsStore.updateTraktCustomHistoryDays(numValue)
        .then(() => {
          console.log('Saved Trakt custom history days to store:', numValue);
        })
        .catch(error => {
          console.error('Failed to save Trakt custom history days:', error);
        });
      
      this.$emit('save-trakt-custom-history-days', numValue);
    },
    saveTraktOnlyMode(value) {
      // Use the store to update the Trakt only mode
      recommendationsStore.updateTraktOnlyMode(value)
        .then(() => {
          console.log('Saved Trakt only mode to store:', value);
        })
        .catch(error => {
          console.error('Failed to save Trakt only mode:', error);
        });
      
      this.$emit('save-trakt-only-mode', value);
    },
    getLanguageName(code) {
      const lang = this.availableLanguages.find(l => l.code === code);
      return lang ? lang.name : '';
    },
    async refreshSonarrLibrary() {
      try {
        this.refreshingSonarr = true;
        
        // Call the refreshLibrary method directly using the imported service
        await sonarrService.refreshLibrary();
        
        // Show a success message and visual feedback
        console.log('Sonarr library refreshed successfully');
        this.refreshingSonarr = false;
        this.sonarrRefreshSuccess = true;
        
        // Reset success state after 2 seconds
        setTimeout(() => {
          this.sonarrRefreshSuccess = false;
        }, 2000);
      } catch (error) {
        console.error('Error refreshing Sonarr library:', error);
        this.refreshingSonarr = false;
      }
    },
    
    async refreshRadarrLibrary() {
      try {
        this.refreshingRadarr = true;
        
        // Call the refreshLibrary method directly using the imported service
        await radarrService.refreshLibrary();
        
        // Show a success message and visual feedback
        console.log('Radarr library refreshed successfully');
        this.refreshingRadarr = false;
        this.radarrRefreshSuccess = true;
        
        // Reset success state after 2 seconds
        setTimeout(() => {
          this.radarrRefreshSuccess = false;
        }, 2000);
      } catch (error) {
        console.error('Error refreshing Radarr library:', error);
        this.refreshingRadarr = false;
      }
    },
    
    /**
     * Update the content type (movie/TV mode)
     * @param {boolean} isMovie - Whether to use movie mode
     */
    async updateContentType(isMovie) {
      try {
        // Reset recommendations requested flag when switching content type
        this.recommendationsRequested = false;
        
        // Use the store to update the content type
        await recommendationsStore.setContentType(isMovie);
        console.log(`Content type switched to ${isMovie ? 'movies' : 'TV shows'}`);
        
        // Emit event for parent component
        this.$emit('update-content-type', isMovie);
      } catch (error) {
        console.error('Error updating content type:', error);
      }
    }
  }
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

.settings-container {
  padding: 20px;
  background-color: var(--card-bg-color);
  border-radius: var(--border-radius-md);
  box-shadow: var(--card-shadow);
  transition: background-color var(--transition-speed), box-shadow var(--transition-speed);
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

.settings-content {
  padding: 20px;
  transition: max-height 0.3s ease, opacity 0.3s ease, transform 0.3s ease;
  max-height: 2000px;
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
  height: 40px;
  display: flex;
  align-items: center;
}

.slider-track {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  height: 4px;
  background: linear-gradient(to right, var(--button-primary-bg), var(--button-primary-bg));
  border-radius: 2px;
  z-index: 1;
  transition: width 0.2s ease;
}

.modern-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 4px;
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
  opacity: 0.95;
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
  background-color: #163860;
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
  padding: 15px;
  background-color: var(--card-bg-color);
  border-radius: var(--border-radius-md);
  box-shadow: var(--card-shadow);
  border: 1px solid var(--border-color);
}

.count-selector {
  margin-bottom: 14px;
  padding: 10px;
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

.genre-content, .language-content, .rec-number-content, .posters-row-content, 
.plex-content, .jellyfin-content, .tautulli-content, .trakt-content,
.config-content, .vibe-content, .settings-content {
  will-change: max-height, opacity, transform;
  box-sizing: border-box;
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

.content-type-toggle {
  margin-top: 15px;
  padding: 15px;
  background-color: var(--primary-color-lighter);
  border-radius: var(--border-radius-md);
  border: 1px solid var(--primary-color-border);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.toggle-buttons {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.toggle-button {
  flex: 1;
  padding: 8px 12px;
  border-radius: var(--border-radius-sm);
  border: 1px solid var(--primary-color-border);
  background-color: var(--card-bg-color);
  color: var(--text-color);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.toggle-button:hover {
  background-color: var(--primary-color-light);
  transform: translateY(-1px);
}

.toggle-button.active {
  background-color: var(--button-primary-bg);
  color: white;
  border-color: var(--button-primary-bg);
}

.library-refresh-section {
  margin-bottom: 20px;
  background-color: var(--primary-color-lighter);
  border-radius: var(--border-radius-md);
  border: 1px solid var(--primary-color-border);
  padding: 15px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.refresh-header {
  margin-bottom: 15px;
}

.refresh-header h3 {
  margin: 0;
  font-size: 16px;
  color: var(--text-color);
  font-weight: 600;
}

.refresh-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.refresh-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 15px;
  border-radius: var(--border-radius-md);
  border: 1px solid var(--primary-color-border);
  background-color: var(--card-bg-color);
  color: var(--text-color);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.refresh-button:hover:not(:disabled) {
  background-color: var(--primary-color-light);
  transform: translateY(-1px);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.08);
}

.refresh-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.refresh-icon {
  font-size: 16px;
  display: inline-block;
}

.sonarr-refresh {
  border-color: #2196F3;
  color: #2196F3;
}

.sonarr-refresh:hover:not(:disabled) {
  background-color: rgba(33, 150, 243, 0.1);
}

.radarr-refresh {
  border-color: #F44336;
  color: #F44336;
}

.radarr-refresh:hover:not(:disabled) {
  background-color: rgba(244, 67, 54, 0.1);
}

.refresh-icon.spinning {
  animation: spin 1s infinite linear;
}

.refresh-button.success {
  border-color: #4CAF50;
  background-color: rgba(76, 175, 80, 0.1);
  color: #4CAF50;
}

.success-icon {
  color: #4CAF50;
  font-weight: bold;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

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
  margin-bottom: 1em;
}

.prompt-style-info p:last-child {
  margin-bottom: 0;
  font-style: italic;
}

.prompt-style-info em {
  font-style: italic;
  font-weight: 500;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .settings-layout {
    flex-direction: column;
  }
  
  .settings-left, .settings-right {
    flex: 1;
  }
  
  .settings-container {
    max-height: 80vh; /* Limit height on mobile */
    overflow-y: auto; /* Enable vertical scrolling */
    -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
  }
  
  /* Improve touch targets for mobile */
  .collapsible-header {
    padding: 12px 8px;
    min-height: 44px; /* Better for touch targets */
  }
}

@media (max-width: 600px) {
  .settings-container {
    padding: 15px 10px;
  }
  
  .info-section {
    padding: 15px;
  }
  
  .model-select, .custom-model-input {
    padding: 10px 12px;
  }
  
  .count-selector, .genre-selector {
    padding: 10px;
  }
}
</style>
