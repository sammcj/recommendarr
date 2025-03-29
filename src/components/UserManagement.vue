<template>
  <div class="user-management">
    <div class="section-header">
      <h2>User Management</h2>
      <button @click="refreshUsers" class="refresh-btn" :disabled="loading">
        <i class="fas fa-sync-alt" :class="{ 'spin': loading }"></i>
      </button>
    </div>

    <div v-if="error" class="error-message">
      {{ error }}
    </div>

    <div v-if="success" class="success-message">
      {{ success }}
    </div>

    <div class="user-list-actions">
      <div class="search-box">
        <i class="fas fa-search search-icon"></i>
        <input 
          type="text" 
          v-model="searchQuery" 
          placeholder="Search users..." 
          class="search-input"
        />
      </div>
      <button @click="showNewUserModal = true" class="create-user-btn">
        <i class="fas fa-plus"></i> Add User
      </button>
    </div>

    <div class="user-list-container">
      <table class="user-list">
        <thead>
          <tr>
            <th>Username</th>
            <th>Created</th>
            <th>Authentication</th>
            <th>Admin</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="5" class="loading-row">
              <div class="loading-spinner"></div>
              <div>Loading users...</div>
            </td>
          </tr>
          <tr v-else-if="filteredUsers.length === 0">
            <td colspan="5" class="empty-row">
              No users found
            </td>
          </tr>
          <tr v-for="user in filteredUsers" :key="user.userId" class="user-row">
            <td>
              {{ user.username }}
              <span v-if="user.userId === currentUserId" class="current-user-badge">(You)</span>
            </td>
            <td>{{ formatDate(user.createdAt) }}</td>
            <td>
              <span :class="`auth-badge auth-${user.authProvider}`">
                <i v-if="user.authProvider === 'google'" class="fab fa-google"></i>
                <i v-else-if="user.authProvider === 'github'" class="fab fa-github"></i>
                <i v-else class="fas fa-user"></i>
                {{ user.authProvider || 'local' }}
              </span>
            </td>
            <td>
              <div class="toggle-switch">
                <input 
                  type="checkbox" 
                  :id="'admin-toggle-' + user.userId" 
                  :checked="user.isAdmin"
                  @change="toggleAdminStatus(user)"
                  :disabled="user.userId === currentUserId || actionInProgress"
                />
                <label :for="'admin-toggle-' + user.userId"></label>
              </div>
            </td>
            <td>
              <div class="action-buttons">
                <button 
                  @click="editUser(user)" 
                  class="edit-btn" 
                  :disabled="actionInProgress"
                >
                  <i class="fas fa-edit"></i>
                </button>
                <button 
                  @click="confirmDeleteUser(user)" 
                  class="delete-btn" 
                  :disabled="user.userId === currentUserId || actionInProgress"
                >
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- New User Modal -->
    <div v-if="showNewUserModal" class="modal-overlay">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editingUser ? 'Edit User' : 'Add New User' }}</h3>
          <button @click="closeUserModal" class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div v-if="modalError" class="error-message">{{ modalError }}</div>

          <form @submit.prevent="saveUser">
            <div class="form-group">
              <label for="username">Username:</label>
              <input 
                type="text" 
                id="username" 
                v-model="newUser.username" 
                required
                :disabled="editingUser || modalLoading"
              />
            </div>

            <div v-if="!editingUser" class="form-group">
              <label for="password">Password:</label>
              <input 
                type="password" 
                id="password" 
                v-model="newUser.password" 
                required
                :disabled="modalLoading"
              />
            </div>

            <div class="form-group">
              <label for="isAdmin">
                <input 
                  type="checkbox" 
                  id="isAdmin" 
                  v-model="newUser.isAdmin"
                  :disabled="modalLoading"
                />
                Administrator
              </label>
            </div>

            <div class="modal-actions">
              <button 
                type="button" 
                @click="closeUserModal" 
                class="cancel-btn"
                :disabled="modalLoading"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                class="save-btn"
                :disabled="modalLoading"
              >
                <span v-if="modalLoading">
                  <i class="fas fa-circle-notch fa-spin"></i> Saving...
                </span>
                <span v-else>
                  {{ editingUser ? 'Update User' : 'Create User' }}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="modal-overlay">
      <div class="modal delete-modal">
        <div class="modal-header">
          <h3>Confirm Delete</h3>
          <button @click="showDeleteModal = false" class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <p>Are you sure you want to delete user <strong>{{ userToDelete?.username }}</strong>?</p>
          <p class="warning">This action cannot be undone. All user data will be permanently deleted.</p>
          
          <div class="modal-actions">
            <button 
              @click="showDeleteModal = false" 
              class="cancel-btn"
              :disabled="deleteLoading"
            >
              Cancel
            </button>
            <button 
              @click="deleteUser" 
              class="delete-confirm-btn"
              :disabled="deleteLoading"
            >
              <span v-if="deleteLoading">
                <i class="fas fa-circle-notch fa-spin"></i> Deleting...
              </span>
              <span v-else>
                Delete User
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import AuthService from '../services/AuthService';

export default {
  name: 'UserManagement',
  data() {
    return {
      users: [],
      loading: false,
      error: null,
      success: null,
      searchQuery: '',
      showNewUserModal: false,
      editingUser: null,
      newUser: {
        username: '',
        password: '',
        isAdmin: false
      },
      modalLoading: false,
      modalError: null,
      showDeleteModal: false,
      userToDelete: null,
      deleteLoading: false,
      actionInProgress: false,
      currentUserId: null
    };
  },
  computed: {
    filteredUsers() {
      if (!this.searchQuery) {
        return this.users;
      }
      
      const query = this.searchQuery.toLowerCase();
      return this.users.filter(user => 
        user.username.toLowerCase().includes(query) ||
        (user.email && user.email.toLowerCase().includes(query))
      );
    }
  },
  created() {
    this.currentUserId = AuthService.getUser()?.userId;
    this.fetchUsers();
  },
  methods: {
    async fetchUsers() {
      this.loading = true;
      this.error = null;
      this.success = null;
      
      try {
        this.users = await AuthService.getUsers();
      } catch (err) {
        this.error = `Error loading users: ${err}`;
      } finally {
        this.loading = false;
      }
    },
    
    refreshUsers() {
      this.fetchUsers();
    },
    
    formatDate(dateString) {
      if (!dateString) return 'Unknown';
      
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      
      return date.toLocaleDateString();
    },
    
    async toggleAdminStatus(user) {
      if (user.userId === this.currentUserId) return;
      
      this.actionInProgress = true;
      this.error = null;
      this.success = null;
      
      try {
        // Toggle the admin status
        const updatedIsAdmin = !user.isAdmin;
        
        await AuthService.updateUser(user.userId, {
          isAdmin: updatedIsAdmin
        });
        
        // Update the local user object
        user.isAdmin = updatedIsAdmin;
        
        this.success = `Successfully ${updatedIsAdmin ? 'granted' : 'removed'} admin privileges for ${user.username}`;
        
        // Clear the success message after 3 seconds
        setTimeout(() => {
          this.success = null;
        }, 3000);
      } catch (err) {
        this.error = `Error updating admin status: ${err}`;
        
        // Revert the checkbox state in the UI
        this.$nextTick(() => {
          user.isAdmin = !user.isAdmin;
        });
      } finally {
        this.actionInProgress = false;
      }
    },
    
    editUser(user) {
      this.editingUser = user;
      this.newUser = {
        username: user.username,
        isAdmin: user.isAdmin
      };
      this.showNewUserModal = true;
    },
    
    closeUserModal() {
      this.showNewUserModal = false;
      this.editingUser = null;
      this.newUser = {
        username: '',
        password: '',
        isAdmin: false
      };
      this.modalError = null;
    },
    
    async saveUser() {
      this.modalLoading = true;
      this.modalError = null;
      
      try {
        if (this.editingUser) {
          // Update existing user
          await AuthService.updateUser(this.editingUser.userId, {
            isAdmin: this.newUser.isAdmin
          });
          
          // Update the user in the list
          const userIndex = this.users.findIndex(u => u.userId === this.editingUser.userId);
          if (userIndex !== -1) {
            this.users[userIndex].isAdmin = this.newUser.isAdmin;
          }
          
          this.success = `User ${this.editingUser.username} updated successfully`;
        } else {
          // Create new user
          await AuthService.createUser(
            this.newUser.username, 
            this.newUser.password, 
            this.newUser.isAdmin
          );
          
          // Refresh the user list
          await this.fetchUsers();
          
          this.success = `User ${this.newUser.username} created successfully`;
        }
        
        // Close the modal
        this.closeUserModal();
        
        // Clear the success message after 3 seconds
        setTimeout(() => {
          this.success = null;
        }, 3000);
      } catch (err) {
        this.modalError = `Error saving user: ${err}`;
      } finally {
        this.modalLoading = false;
      }
    },
    
    confirmDeleteUser(user) {
      this.userToDelete = user;
      this.showDeleteModal = true;
    },
    
    async deleteUser() {
      if (!this.userToDelete) return;
      
      this.deleteLoading = true;
      
      try {
        await AuthService.deleteUser(this.userToDelete.userId);
        
        // Remove the user from the list
        this.users = this.users.filter(u => u.userId !== this.userToDelete.userId);
        
        this.success = `User ${this.userToDelete.username} deleted successfully`;
        
        // Close the modal
        this.showDeleteModal = false;
        this.userToDelete = null;
        
        // Clear the success message after 3 seconds
        setTimeout(() => {
          this.success = null;
        }, 3000);
      } catch (err) {
        this.error = `Error deleting user: ${err}`;
        this.showDeleteModal = false;
      } finally {
        this.deleteLoading = false;
      }
    }
  }
};
</script>

<style scoped>
.user-management {
  width: 100%;
  padding: 20px;
  background-color: var(--panel-bg-color);
  border-radius: var(--border-radius-md);
  box-shadow: var(--card-shadow);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h2 {
  margin: 0;
  color: var(--header-color);
  font-size: 20px;
}

.refresh-btn {
  background: none;
  border: none;
  color: var(--text-color);
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.refresh-btn:hover:not(:disabled) {
  color: var(--button-primary-bg);
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-message {
  background-color: rgba(255, 0, 0, 0.1);
  border-left: 3px solid #ff3b30;
  color: #ff3b30;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 16px;
  font-size: 14px;
}

.success-message {
  background-color: rgba(76, 175, 80, 0.1);
  border-left: 3px solid #4caf50;
  color: #4caf50;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 16px;
  font-size: 14px;
}

.user-list-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.search-box {
  position: relative;
  flex: 1;
  max-width: 300px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-color);
  opacity: 0.5;
}

.search-input {
  width: 100%;
  padding: 8px 12px 8px 36px;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  background-color: var(--input-bg);
  color: var(--input-text);
  font-size: 14px;
}

.create-user-btn {
  background-color: var(--button-primary-bg);
  color: var(--button-primary-text);
  border: none;
  border-radius: var(--border-radius-sm);
  padding: 8px 12px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.create-user-btn:hover {
  filter: brightness(1.1);
}

.user-list-container {
  overflow-x: auto;
  background-color: var(--card-bg-color);
  border-radius: var(--border-radius-sm);
  box-shadow: var(--card-shadow);
}

.user-list {
  width: 100%;
  border-collapse: collapse;
}

.user-list th,
.user-list td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

.user-list th {
  background-color: var(--table-header-bg);
  color: var(--header-color);
  font-weight: 500;
  font-size: 14px;
}

.user-row td {
  font-size: 14px;
  color: var(--text-color);
}

.user-row:hover {
  background-color: var(--hover-bg);
}

.loading-row td,
.empty-row td {
  padding: 24px 16px;
  text-align: center;
  color: var(--text-color);
  opacity: 0.7;
}

.loading-row td {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--button-primary-bg);
  border-radius: 50%;
  border-top-color: transparent;
  animation: spin 1s linear infinite;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.edit-btn,
.delete-btn {
  background: none;
  border: none;
  padding: 4px;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;
}

.edit-btn {
  color: var(--button-primary-bg);
}

.delete-btn {
  color: #ff3b30;
}

.edit-btn:hover:not(:disabled),
.delete-btn:hover:not(:disabled) {
  background-color: rgba(0, 0, 0, 0.05);
}

.edit-btn:disabled,
.delete-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 20px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-switch label {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.4s;
}

.toggle-switch label:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  border-radius: 50%;
  transition: all 0.4s;
}

.toggle-switch input:checked + label {
  background-color: var(--button-primary-bg);
}

.toggle-switch input:disabled + label {
  opacity: 0.5;
  cursor: not-allowed;
}

.toggle-switch input:checked + label:before {
  transform: translateX(20px);
}

.current-user-badge {
  font-size: 12px;
  color: var(--button-primary-bg);
  margin-left: 8px;
  font-style: italic;
}

.auth-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  background-color: var(--badge-bg);
  color: var(--text-color);
}

.auth-google {
  background-color: rgba(66, 133, 244, 0.1);
  color: #4285F4;
}

.auth-github {
  background-color: rgba(36, 41, 46, 0.1);
  color: #24292E;
}

body.dark-theme .auth-github {
  background-color: rgba(255, 255, 255, 0.1);
  color: #f5f5f5;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 7;
  backdrop-filter: blur(2px);
}

.modal {
  background-color: var(--card-bg-color);
  border-radius: var(--border-radius-md);
  box-shadow: var(--card-shadow);
  width: 90%;
  max-width: 450px;
  display: flex;
  flex-direction: column;
  transition: all 0.2s ease;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  color: var(--header-color);
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--text-color);
}

.modal-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  color: var(--text-color);
}

.form-group input[type="text"],
.form-group input[type="password"] {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  background-color: var(--input-bg);
  color: var(--input-text);
  font-size: 14px;
}

.form-group input[type="checkbox"] {
  margin-right: 8px;
}

.form-group label[for="isAdmin"] {
  display: flex;
  align-items: center;
  font-weight: 500;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

.cancel-btn,
.save-btn,
.delete-confirm-btn {
  padding: 8px 16px;
  border-radius: var(--border-radius-sm);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cancel-btn {
  background-color: var(--button-secondary-bg);
  color: var(--button-secondary-text);
  border: 1px solid var(--border-color);
}

.save-btn {
  background-color: var(--button-primary-bg);
  color: var(--button-primary-text);
  border: none;
}

.delete-confirm-btn {
  background-color: #ff3b30;
  color: white;
  border: none;
}

.cancel-btn:hover:not(:disabled) {
  background-color: rgba(0, 0, 0, 0.03);
}

.save-btn:hover:not(:disabled) {
  filter: brightness(1.1);
}

.delete-confirm-btn:hover:not(:disabled) {
  filter: brightness(1.1);
}

.cancel-btn:disabled,
.save-btn:disabled,
.delete-confirm-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.delete-modal .warning {
  color: #ff3b30;
  font-size: 14px;
  margin-top: 16px;
}
</style>