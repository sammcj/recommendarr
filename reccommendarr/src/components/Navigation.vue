<template>
  <nav class="navigation">
    <ul class="nav-links">
      <li>
        <button 
          @click="$emit('navigate', 'recommendations')" 
          :class="{ active: activeTab === 'recommendations' }"
        >
          Recommendations
        </button>
      </li>
      <li>
        <button 
          @click="$emit('navigate', 'settings')" 
          :class="{ active: activeTab === 'settings' }"
        >
          Settings
        </button>
      </li>
      <li class="theme-toggle">
        <button 
          @click="toggleTheme" 
          class="theme-button"
          :title="isDarkTheme ? 'Switch to light mode' : 'Switch to dark mode'"
        >
          <span v-if="isDarkTheme" class="theme-icon">☀️</span>
          <span v-else class="theme-icon">🌙</span>
        </button>
      </li>
      <li class="logout-container">
        <button 
          @click="$emit('logout')" 
          class="logout-button"
        >
          Logout
        </button>
      </li>
    </ul>
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
      isDarkTheme: false
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
    }
  }
};
</script>

<style scoped>
.navigation {
  background-color: var(--nav-bg-color);
  color: var(--nav-active-text);
  padding: 0;
  margin: 0;
  transition: background-color var(--transition-speed);
}

.nav-links {
  list-style: none;
  display: flex;
  margin: 0;
  padding: 0;
}

.nav-links li {
  flex: 1;
}

.nav-links button {
  background: none;
  border: none;
  color: var(--nav-text-color);
  padding: 15px 20px;
  cursor: pointer;
  width: 100%;
  font-size: 16px;
  transition: background-color var(--transition-speed), color var(--transition-speed);
}

.nav-links button:hover {
  background-color: var(--nav-hover-bg);
  color: var(--nav-active-text);
}

.nav-links button.active {
  background-color: var(--nav-active-bg);
  color: var(--nav-active-text);
  font-weight: bold;
}

.theme-toggle, .logout-container {
  flex: 0.5;
  margin-left: auto;
}

.theme-button {
  display: flex;
  align-items: center;
  justify-content: center;
}

.theme-icon {
  font-size: 18px;
}

.logout-button {
  background-color: rgba(255, 0, 0, 0.2) !important;
  color: var(--nav-active-text) !important;
}

.logout-button:hover {
  background-color: rgba(255, 0, 0, 0.4) !important;
}
</style>