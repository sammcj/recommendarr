<template>
  <nav class="navigation">
    <div class="nav-container">
      <!-- Main navigation -->
      <div class="nav-menu">
        <button 
          @click="$emit('navigate', 'tv-recommendations')" 
          :class="{ active: activeTab === 'tv-recommendations' || activeTab === 'movie-recommendations' }"
          class="nav-item"
          @mouseenter="animateButton($event)"
        >
          <div class="nav-item-content">
            <div class="nav-icon-wrapper">
              <svg class="nav-svg-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
                <line x1="7" y1="2" x2="7" y2="22"></line>
                <line x1="17" y1="2" x2="17" y2="22"></line>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <line x1="2" y1="7" x2="7" y2="7"></line>
                <line x1="2" y1="17" x2="7" y2="17"></line>
                <line x1="17" y1="17" x2="22" y2="17"></line>
                <line x1="17" y1="7" x2="22" y2="7"></line>
              </svg>
            </div>
            <span class="nav-text">Recommendations</span>
            <span class="nav-item-bg"></span>
          </div>
        </button>
        
        <button 
          @click="$emit('navigate', 'history')" 
          :class="{ active: activeTab === 'history' }"
          class="nav-item"
          @mouseenter="animateButton($event)"
        >
          <div class="nav-item-content">
            <div class="nav-icon-wrapper">
              <svg class="nav-svg-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </div>
            <span class="nav-text">History</span>
            <span class="nav-item-bg"></span>
          </div>
        </button>
        
        <button 
          @click="$emit('navigate', 'settings')" 
          :class="{ active: activeTab === 'settings' }"
          class="nav-item"
          @mouseenter="animateButton($event)"
        >
          <div class="nav-item-content">
            <div class="nav-icon-wrapper">
              <svg class="nav-svg-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </div>
            <span class="nav-text">Settings</span>
            <span class="nav-item-bg"></span>
          </div>
        </button>
      </div>
      
      <!-- Right side actions -->
      <div class="nav-right">
        <!-- Theme toggle with animation -->
        <div class="theme-toggle-wrapper" :title="isDarkTheme ? 'Switch to light mode' : 'Switch to dark mode'">
          <button @click="toggleTheme" class="theme-toggle-button">
            <div class="theme-toggle-icons">
              <svg v-if="!isDarkTheme" class="theme-icon sun-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
              <svg v-else class="theme-icon moon-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            </div>
          </button>
        </div>
      
        <!-- Action buttons container on desktop -->
        <div class="action-buttons desktop-only-buttons">
          <button 
            @click="confirmClearData" 
            class="action-button clear-button"
            title="Clear all saved data"
            @mouseenter="animateButton($event)"
          >
            <div class="action-content">
              <svg class="action-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
              <span class="action-text">Clear Data</span>
            </div>
          </button>
          
          <button 
            @click="$emit('logout')" 
            class="action-button logout-button"
            title="Logout from your account"
            @mouseenter="animateButton($event)"
          >
            <div class="action-content">
              <svg class="action-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              <span class="action-text">Logout</span>
            </div>
          </button>
        </div>
      </div>
    
      <!-- Mobile menu button -->
      <button 
        class="mobile-menu-toggle" 
        @click="toggleMobileMenu"
        aria-label="Toggle mobile menu"
      >
        <span class="bar"></span>
        <span class="bar"></span>
        <span class="bar"></span>
      </button>
    </div>
    
    <!-- Mobile Navigation Menu with improved interaction -->
    <div class="mobile-menu" :class="{ 'open': mobileMenuOpen }">
      <div class="mobile-menu-container">
        <button 
          @click="navigateMobile('tv-recommendations')" 
          :class="{ active: activeTab === 'tv-recommendations' || activeTab === 'movie-recommendations' }"
          class="mobile-nav-item"
        >
          <svg class="mobile-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
            <line x1="7" y1="2" x2="7" y2="22"></line>
            <line x1="17" y1="2" x2="17" y2="22"></line>
            <line x1="2" y1="12" x2="22" y2="12"></line>
            <line x1="2" y1="7" x2="7" y2="7"></line>
            <line x1="2" y1="17" x2="7" y2="17"></line>
            <line x1="17" y1="17" x2="22" y2="17"></line>
            <line x1="17" y1="7" x2="22" y2="7"></line>
          </svg>
          <span>Recommendations</span>
        </button>
        
        <button 
          @click="navigateMobile('history')" 
          :class="{ active: activeTab === 'history' }"
          class="mobile-nav-item"
        >
          <svg class="mobile-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          <span>History</span>
        </button>
        
        <button 
          @click="navigateMobile('settings')" 
          :class="{ active: activeTab === 'settings' }"
          class="mobile-nav-item"
        >
          <svg class="mobile-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
          <span>Settings</span>
        </button>
        
        <div class="mobile-divider"></div>
        
        <!-- Mobile Theme Toggle Improved -->
        <div class="mobile-theme-toggle">
          <button @click="toggleTheme" class="mobile-theme-button">
            <svg v-if="!isDarkTheme" class="mobile-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
            <svg v-else class="mobile-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
            <span>{{ isDarkTheme ? 'Light Mode' : 'Dark Mode' }}</span>
          </button>
        </div>
        
        <div class="mobile-action-buttons">
          <button @click="confirmClearData" class="mobile-action clear-button">
            <svg class="mobile-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
            <span>Clear Data</span>
          </button>
          
          <button @click="$emit('logout')" class="mobile-action logout-button">
            <svg class="mobile-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  </nav>
</template>

<script>
export default {
  name: 'AppNavigation',
  props: {
    activeTab: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      isDarkTheme: false,
      mobileMenuOpen: false
    };
  },
  created() {
    // Check if the user has a saved theme preference
    const savedTheme = localStorage.getItem('darkTheme');
    if (savedTheme === 'true') {
      this.isDarkTheme = true;
      document.body.classList.add('dark-theme');
    }
  },
  methods: {
    toggleTheme() {
      this.isDarkTheme = !this.isDarkTheme;
      
      if (this.isDarkTheme) {
        document.body.classList.add('dark-theme');
      } else {
        document.body.classList.remove('dark-theme');
      }
      
      // Save the theme preference
      localStorage.setItem('darkTheme', this.isDarkTheme);
    },
    toggleMobileMenu() {
      this.mobileMenuOpen = !this.mobileMenuOpen;
      
      // Add class to body to prevent scrolling when menu is open
      if (this.mobileMenuOpen) {
        document.body.classList.add('mobile-menu-open');
      } else {
        document.body.classList.remove('mobile-menu-open');
      }
    },
    navigateMobile(tab) {
      this.$emit('navigate', tab);
      this.mobileMenuOpen = false; // Close mobile menu after navigation
      document.body.classList.remove('mobile-menu-open');
    },
    confirmClearData() {
      if (confirm('Are you sure you want to clear all saved data? This will remove all your service connections, settings, recommendation history, and preferences from both local storage and the server. Your account login will be preserved.')) {
        this.$emit('clearData');
      }
    },
    animateButton(event) {
      // Create a ripple effect on button hover
      const button = event.currentTarget;
      const buttonRect = button.getBoundingClientRect();
      const bgElement = button.querySelector('.nav-item-bg');
      
      if (bgElement) {
        // Center the ripple effect at hover position
        const x = event.clientX - buttonRect.left;
        const y = event.clientY - buttonRect.top;
        
        // Add the animation effect
        bgElement.style.left = `${x}px`;
        bgElement.style.top = `${y}px`;
        bgElement.style.transform = 'scale(0)';
        bgElement.style.opacity = '0.5';
        
        // Trigger animation
        setTimeout(() => {
          bgElement.style.transform = 'scale(2.5)';
          bgElement.style.opacity = '0';
        }, 10);
        
        // Reset for next animation
        setTimeout(() => {
          bgElement.style.transform = 'scale(0)';
          bgElement.style.opacity = '0';
        }, 500);
      }
    }
  }
};
</script>

<style scoped>
.navigation {
  background-color: var(--nav-bg-color);
  color: var(--nav-active-text);
  position: relative;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  border-radius: var(--border-radius-md);
}

/* Main Navigation Container */
.nav-container {
  display: flex;
  align-items: center;
  padding: 0 20px;
  height: 64px;
  position: relative;
  max-width: 1600px;
  margin: 0 auto;
  justify-content: space-between;
}

/* Brand section removed */

/* Right side nav actions */
.nav-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* Main Menu Styling */
.nav-menu {
  display: none;
  flex: 1;
  justify-content: flex-start;
}

@media (min-width: 768px) {
  .nav-menu {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-right: auto;
  }
}

.nav-item {
  position: relative;
  background: rgba(255, 255, 255, 0.08);
  border: none;
  color: var(--nav-text-color);
  border-radius: var(--border-radius-md);
  cursor: pointer;
  font-size: 15px;
  transition: all 0.2s ease;
  padding: 0;
  overflow: hidden;
}

body.dark-theme .nav-item {
  background: rgba(0, 0, 0, 0.15);
}

.nav-item-content {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  z-index: 2;
}

.nav-item-bg {
  position: absolute;
  border-radius: 50%;
  background-color: var(--button-primary-bg);
  width: 20px;
  height: 20px;
  opacity: 0;
  transition: transform 0.5s ease, opacity 0.5s ease;
  z-index: 1;
  pointer-events: none;
}

.nav-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
}

.nav-svg-icon {
  width: 18px;
  height: 18px;
  stroke-width: 2.2;
  transition: all 0.2s ease;
}

.nav-item:hover {
  color: var(--nav-active-text);
  background: rgba(255, 255, 255, 0.15);
}

body.dark-theme .nav-item:hover {
  background: rgba(0, 0, 0, 0.25);
}

.nav-item:hover .nav-svg-icon {
  transform: translateY(-1px);
}

.nav-item.active {
  background-color: var(--button-primary-bg);
  color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.nav-item.active .nav-svg-icon {
  stroke-width: 2;
}

.nav-text {
  font-weight: 500;
  letter-spacing: 0.2px;
}

/* Modern theme toggle styling */
.theme-toggle-wrapper {
  margin-left: 5px;
  display: flex;
  align-items: center;
}

.theme-toggle-button {
  background: rgba(255, 255, 255, 0.08);
  border: none;
  color: var(--nav-text-color);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

body.dark-theme .theme-toggle-button {
  background: rgba(0, 0, 0, 0.15);
}

.theme-toggle-button:hover {
  background: rgba(255, 255, 255, 0.15);
  color: var(--nav-active-text);
  transform: translateY(-1px);
}

body.dark-theme .theme-toggle-button:hover {
  background: rgba(0, 0, 0, 0.25);
}

.theme-toggle-icons {
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.theme-icon {
  width: 18px;
  height: 18px;
  transition: all 0.3s ease;
}

.sun-icon {
  color: #f59e0b;
}

.moon-icon {
  color: #a78bfa;
}

/* Action Buttons */
.action-buttons {
  display: flex;
  align-items: center;
  gap: 6px;
}

@media (max-width: 767px) {
  .desktop-only-buttons {
    display: none !important;
  }
}

@media (min-width: 768px) {
  .desktop-only-buttons {
    display: flex !important;
  }
}

.action-button {
  background: rgba(255, 255, 255, 0.08);
  border: none;
  color: var(--nav-text-color);
  padding: 7px 12px;
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

body.dark-theme .action-button {
  background: rgba(0, 0, 0, 0.15);
}

.action-button:hover {
  background: rgba(255, 255, 255, 0.15);
  color: var(--nav-active-text);
  transform: translateY(-1px);
}

body.dark-theme .action-button:hover {
  background: rgba(0, 0, 0, 0.25);
}

.action-content {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 2;
}

.action-icon {
  width: 16px;
  height: 16px;
  transition: all 0.2s ease;
}

.action-text {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
}

.clear-button {
  color: #f97316;
}

.clear-button:hover {
  background-color: rgba(249, 115, 22, 0.15);
}

.logout-button {
  color: #ef4444;
}

.logout-button:hover {
  background-color: rgba(239, 68, 68, 0.15);
}

/* Mobile Menu Toggle Button */
.mobile-menu-toggle {
  display: block;
  background: transparent;
  border: none;
  cursor: pointer;
  width: 40px;
  height: 40px;
  padding: 8px;
  margin-left: 8px;
  position: relative;
  z-index: 101;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.mobile-menu-toggle:hover {
  background-color: var(--nav-hover-bg);
}

@media (min-width: 768px) {
  .mobile-menu-toggle {
    display: none;
  }
}

.bar {
  display: block;
  height: 2px;
  width: 22px;
  margin: 5px auto;
  background-color: var(--nav-active-text);
  transition: all 0.3s ease;
  border-radius: 2px;
}

.mobile-menu.open + .mobile-menu-toggle .bar:nth-child(1) {
  transform: translateY(7px) rotate(45deg);
}

.mobile-menu.open + .mobile-menu-toggle .bar:nth-child(2) {
  opacity: 0;
}

.mobile-menu.open + .mobile-menu-toggle .bar:nth-child(3) {
  transform: translateY(-7px) rotate(-45deg);
}

/* Mobile Menu */
.mobile-menu {
  position: fixed;
  top: 64px;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--nav-bg-color);
  display: flex;
  flex-direction: column;
  transform: translateX(-100%);
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 99;
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1);
  overflow-y: auto;
}

.mobile-menu.open {
  transform: translateX(0);
  opacity: 1;
  visibility: visible;
}

.mobile-menu-container {
  display: flex;
  flex-direction: column;
  padding: 16px;
  gap: 8px;
  height: 100%;
}

.mobile-nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: transparent;
  border: none;
  color: var(--nav-text-color);
  text-align: left;
  font-size: 16px;
  border-radius: var(--border-radius-md);
  transition: all 0.25s ease;
  letter-spacing: 0.2px;
  font-weight: 500;
}

.mobile-nav-item:active {
  transform: scale(0.98);
}

.mobile-nav-item:hover {
  background-color: var(--nav-hover-bg);
  color: var(--nav-active-text);
}

.mobile-nav-item.active {
  background-color: var(--button-primary-bg);
  color: white;
}

.mobile-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.mobile-divider {
  height: 1px;
  background-color: var(--border-color);
  margin: 12px 0;
  opacity: 0.5;
}

.mobile-theme-toggle {
  margin: 8px 0;
}

.mobile-theme-button {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px 16px;
  background: transparent;
  border: none;
  color: var(--nav-text-color);
  text-align: left;
  font-size: 16px;
  border-radius: var(--border-radius-md);
  transition: all 0.2s ease;
  font-weight: 500;
  cursor: pointer;
}

.mobile-theme-button:hover {
  background-color: var(--nav-hover-bg);
  color: var(--nav-active-text);
}

.mobile-action-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: auto;
  padding-top: 16px;
}

.mobile-action {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: transparent;
  border: none;
  text-align: left;
  font-size: 16px;
  border-radius: var(--border-radius-md);
  transition: all 0.2s ease;
  font-weight: 500;
  cursor: pointer;
}

.mobile-action.clear-button {
  color: #f97316;
}

.mobile-action.clear-button:hover {
  background-color: rgba(249, 115, 22, 0.15);
}

.mobile-action.logout-button {
  color: #ef4444;
}

.mobile-action.logout-button:hover {
  background-color: rgba(239, 68, 68, 0.15);
}

/* Prevent body scroll when menu is open */
body.mobile-menu-open {
  overflow: hidden;
}

@media (min-width: 992px) {
  .navigation {
    margin: 0 auto;
  }
  
  .nav-item {
    padding: 0;
  }
  
  .nav-item-content {
    padding: 8px 16px;
  }
  
  .action-button {
    padding: 7px 14px;
  }
}
</style>