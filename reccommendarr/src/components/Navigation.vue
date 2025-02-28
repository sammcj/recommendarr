<template>
  <nav class="navigation">
    <ul class="nav-links">
      <li>
        <button 
          @click="$emit('navigate', 'shows')" 
          :class="{ active: activeTab === 'shows' }"
        >
          TV Shows
        </button>
      </li>
      <li>
        <button 
          @click="$emit('navigate', 'recommendations')" 
          :class="{ active: activeTab === 'recommendations' }"
        >
          Recommendations
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
  }
};
</script>

<style scoped>
.navigation {
  background-color: #2c3e50;
  color: white;
  padding: 0;
  margin: 0;
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
  color: #ccc;
  padding: 15px 20px;
  cursor: pointer;
  width: 100%;
  font-size: 16px;
  transition: background-color 0.3s, color 0.3s;
}

.nav-links button:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
}

.nav-links button.active {
  background-color: rgba(255, 255, 255, 0.2);
  color: white;
  font-weight: bold;
}

.logout-container {
  margin-left: auto;
}

.logout-button {
  background-color: rgba(255, 0, 0, 0.2) !important;
  color: white !important;
}

.logout-button:hover {
  background-color: rgba(255, 0, 0, 0.4) !important;
}
</style>