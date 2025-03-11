<template>
  <nav class="navigation">
    <div class="nav-container">
      <div class="nav-menu">
        <button 
          @click="$emit('navigate', 'tv-recommendations')" 
          :class="{ active: activeTab === 'tv-recommendations' || activeTab === 'movie-recommendations' }"
          class="nav-item"
        >
          <span class="nav-icon">🎬</span>
          <span class="nav-text">Recommendations</span>
        </button>
        
        <button 
          @click="$emit('navigate', 'history')" 
          :class="{ active: activeTab === 'history' }"
          class="nav-item"
        >
          <span class="nav-icon">📋</span>
          <span class="nav-text">History</span>
        </button>
        
        <button 
          @click="$emit('navigate', 'settings')" 
          :class="{ active: activeTab === 'settings' }"
          class="nav-item"
        >
          <span class="nav-icon">⚙️</span>
          <span class="nav-text">Settings</span>
        </button>
        
        <!-- Theme toggle moved right after nav items -->
        <div class="theme-toggle-wrapper" :title="isDarkTheme ? 'Switch to light mode' : 'Switch to dark mode'">
          <label class="theme-toggle">
            <input type="checkbox" @change="toggleTheme" :checked="isDarkTheme">
            <span class="toggle-track">
              <span class="toggle-icon sun">☀️</span>
              <span class="toggle-icon moon">🌙</span>
              <span class="toggle-thumb"></span>
            </span>
          </label>
        </div>
      </div>
      
      <div class="nav-actions">
        <!-- Empty nav-actions container -->
      </div>
      
      <!-- Separate container for clear data and logout buttons - desktop only -->
      <div class="clear-data-container desktop-only-buttons">
        <button 
          @click="confirmClearData" 
          class="action-button clear-button"
          title="Clear all saved data"
        >
          <div class="action-content">
            <span class="nav-icon">🗑️</span>
            <span class="action-text">Clear Data</span>
          </div>
        </button>
        
        <button 
          @click="$emit('logout')" 
          class="action-button logout-button"
          title="Logout from your account"
        >
          <div class="action-content">
            <span class="nav-icon">🚪</span>
            <span class="action-text">Logout</span>
          </div>
        </button>
      </div>
      
      <button class="mobile-menu-toggle" @click="mobileMenuOpen = !mobileMenuOpen">
        <div class="hamburger" :class="{ 'active': mobileMenuOpen }">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </button>
    </div>
    
    <!-- Mobile Navigation Menu -->
    <div class="mobile-menu" :class="{ 'open': mobileMenuOpen }">
      <button 
        @click="navigateMobile('tv-recommendations')" 
        :class="{ active: activeTab === 'tv-recommendations' || activeTab === 'movie-recommendations' }"
        class="mobile-nav-item"
      >
        <span class="nav-icon">🎬</span>
        <span>Recommendations</span>
      </button>
      
      <button 
        @click="navigateMobile('history')" 
        :class="{ active: activeTab === 'history' }"
        class="mobile-nav-item"
      >
        <span class="nav-icon">📋</span>
        <span>History</span>
      </button>
      
      <button 
        @click="navigateMobile('settings')" 
        :class="{ active: activeTab === 'settings' }"
        class="mobile-nav-item"
      >
        <span class="nav-icon">⚙️</span>
        <span>Settings</span>
      </button>
      
      <div class="mobile-actions">
        <div class="mobile-action theme-action">
          <div class="mobile-action-text">
            <span class="nav-icon">{{ isDarkTheme ? '🌙' : '☀️' }}</span>
            <span>{{ isDarkTheme ? 'Light Mode' : 'Dark Mode' }}</span>
          </div>
          <label class="theme-toggle mobile">
            <input type="checkbox" @change="toggleTheme" :checked="isDarkTheme">
            <span class="toggle-track">
              <span class="toggle-icon sun">☀️</span>
              <span class="toggle-icon moon">🌙</span>
              <span class="toggle-thumb"></span>
            </span>
          </label>
        </div>
        
        <div class="mobile-buttons-row">
          <button 
            @click="confirmClearData" 
            class="mobile-action clear-button"
          >
            <div class="mobile-action-text">
              <span class="nav-icon">🗑️</span>
              <span>Clear Data</span>
            </div>
          </button>
          
          <button 
            @click="$emit('logout')" 
            class="mobile-action logout-button"
          >
            <div class="mobile-action-text">
              <span class="nav-icon">🚪</span>
              <span>Logout</span>
            </div>
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
    navigateMobile(tab) {
      this.$emit('navigate', tab);
      this.mobileMenuOpen = false; // Close mobile menu after navigation
    },
    confirmClearData() {
      if (confirm('Are you sure you want to clear all saved data? This will remove all your service connections, settings, recommendation history, and preferences from both local storage and the server. Your account login will be preserved.')) {
        this.$emit('clearData');
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
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  z-index: 100;
}

/* Main Navigation Container */
.nav-container {
  display: flex;
  align-items: center;
  padding: 0 16px;
  height: 64px;
  position: relative;
}

/* Brand/Logo Styling */
.nav-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: auto; /* Allow natural width */
  font-weight: bold;
  font-size: 18px;
  color: var(--nav-active-text);
}

/* Modern theme toggle styling */
.theme-toggle-wrapper {
  margin-left: 15px;
  display: flex;
  align-items: center;
}

.theme-toggle {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
  cursor: pointer;
}

.theme-toggle:hover .toggle-track {
  opacity: 0.9;
  transform: scale(1.02);
}

.theme-toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-track {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  transition: 0.4s;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 5px;
  overflow: hidden; /* Ensures content stays within rounded corners */
}

body.dark-theme .toggle-track {
  background-color: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.toggle-icon {
  font-size: 12px;
  z-index: 1;
}

.toggle-icon.sun {
  margin-left: 2px;
}

.toggle-icon.moon {
  margin-right: 2px;
}

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background-color: white;
  border-radius: 50%;
  transition: 0.4s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

input:checked + .toggle-track {
  background-color: rgba(76, 175, 80, 0.7);
}

input:checked + .toggle-track .toggle-thumb {
  transform: translateX(26px);
}

/* Mobile theme toggle */
.theme-action {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 12px;
  background: transparent;
  border: none;
  color: var(--nav-text-color);
  text-align: left;
  font-size: 16px;
  border-radius: 4px;
  transition: all 0.2s ease;
  width: 100%;
}

.theme-action:hover {
  background-color: var(--nav-hover-bg);
}

.theme-toggle.mobile {
  margin-left: 10px;
}

.brand-icon {
  font-size: 20px;
}

/* Hide brand name on very small screens */
@media (max-width: 360px) {
  .brand-name {
    display: none;
  }
}

/* Main Menu Styling */
.nav-menu {
  display: none;
}

@media (min-width: 768px) {
  .nav-menu {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-left: 15px; /* Aligns menu to the left, next to brand */
  }
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  border: none;
  color: var(--nav-text-color);
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 15px;
  transition: all 0.2s ease;
}

.nav-item:hover {
  background-color: var(--nav-hover-bg);
  color: var(--nav-active-text);
}

.nav-item.active {
  background-color: var(--button-primary-bg);
  color: white;
  font-weight: 500;
}

.nav-icon {
  font-size: 16px;
}

/* Action Buttons */
.nav-actions {
  margin-left: auto;
  display: none;
}

@media (min-width: 768px) {
  .nav-actions {
    display: flex;
    align-items: center;
    margin-right: 20px;
    margin-left: auto; /* Push to right side */
  }
  
  .clear-data-container {
    display: flex;
    align-items: center;
    margin-right: 10px;
    gap: 8px;
    flex-wrap: nowrap;
  }
  
  /* Desktop-only buttons */
  .desktop-only-buttons {
    display: none !important;
  }
  
  @media (min-width: 768px) {
    .desktop-only-buttons {
      display: flex !important;
    }
  }
}

.action-button {
  display: flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  border: none;
  color: var(--nav-text-color);
  padding: 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  flex: 1;
}

.theme-button:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: var(--nav-active-text);
}

.clear-button {
  background-color: rgba(255, 152, 0, 0.2);
  color: var(--nav-active-text);
}

.logout-button {
  background-color: rgba(255, 59, 48, 0.2);
  color: var(--nav-active-text);
}

.action-content {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  justify-content: center;
}

.action-text {
  display: none;
}

@media (min-width: 992px) {
  .action-text {
    display: inline;
    white-space: nowrap;
  }
  
  .action-button {
    padding: 8px 12px;
    width: 110px;
    flex: 0 0 auto;
    justify-content: center;
  }
  
  .theme-button {
    min-width: auto;
    padding: 8px;
  }
  
  .clear-button {
    background-color: rgba(255, 152, 0, 0.2);
  }
  
  .logout-button {
    background-color: rgba(255, 59, 48, 0.2);
  }
}

.clear-button:hover {
  background-color: rgba(255, 152, 0, 0.4);
}

.logout-button:hover {
  background-color: rgba(255, 59, 48, 0.4);
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
  margin-left: auto;
  position: relative;
  z-index: 101;
}

@media (min-width: 768px) {
  .mobile-menu-toggle {
    display: none;
  }
}

.hamburger {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
}

.hamburger span {
  display: block;
  height: 2px;
  width: 100%;
  background-color: var(--nav-active-text);
  transition: all 0.3s;
  border-radius: 2px;
}

.hamburger.active span:nth-child(1) {
  transform: translateY(8px) rotate(45deg);
}

.hamburger.active span:nth-child(2) {
  opacity: 0;
}

.hamburger.active span:nth-child(3) {
  transform: translateY(-8px) rotate(-45deg);
}

/* Mobile Menu */
.mobile-menu {
  position: fixed;
  top: 64px;
  left: 0;
  right: 0;
  background-color: var(--nav-bg-color);
  display: flex;
  flex-direction: column;
  transform: translateY(-100%);
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;
  padding: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 99;
}

.mobile-menu.open {
  transform: translateY(0);
  opacity: 1;
  visibility: visible;
}

.mobile-nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 12px;
  background: transparent;
  border: none;
  color: var(--nav-text-color);
  text-align: left;
  font-size: 16px;
  border-radius: 4px;
  transition: all 0.2s ease;
  margin-bottom: 8px;
}

.mobile-nav-item:hover {
  background-color: var(--nav-hover-bg);
}

.mobile-nav-item.active {
  background-color: var(--button-primary-bg);
  color: white;
}

.mobile-actions {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.mobile-action {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 12px;
  background: transparent;
  border: none;
  color: var(--nav-text-color);
  text-align: left;
  font-size: 16px;
  border-radius: 4px;
  transition: all 0.2s ease;
  justify-content: flex-start;
  width: 100%;
}

.mobile-buttons-row .mobile-action {
  justify-content: center;
  padding: 12px 8px;
}

.mobile-action.theme-button:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.mobile-action.clear-button {
  background-color: rgba(255, 152, 0, 0.2);
  color: var(--nav-active-text);
}

.mobile-action.clear-button:hover {
  background-color: rgba(255, 152, 0, 0.4);
}

.mobile-action.logout-button {
  background-color: rgba(255, 59, 48, 0.2);
  color: var(--nav-active-text);
}

.mobile-buttons-row {
  display: flex;
  gap: 10px;
  width: 100%;
}

.mobile-buttons-row .mobile-action {
  flex: 1;
}

.mobile-action-text {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.mobile-action.logout-button:hover {
  background-color: rgba(255, 59, 48, 0.4);
}

/* Global desktop/mobile visibility classes */
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
</style>