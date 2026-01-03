// Blog System - Client-side blog with localStorage
// Y2K Personal Website by Alex Boyko

const BlogSystem = {
  STORAGE_KEY: 'nexusboyko_blog_posts',
  AUTH_KEY: 'nexusboyko_blog_auth',
  PASSPHRASE: 'alexboyko2026', // Change this to your preferred passphrase

  // Initialize the blog system
  init() {
    this.renderPosts();
    this.setupAdminTrigger();
  },

  // Get all posts from localStorage
  getPosts() {
    const posts = localStorage.getItem(this.STORAGE_KEY);
    return posts ? JSON.parse(posts) : [];
  },

  // Save posts to localStorage
  savePosts(posts) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(posts));
  },

  // Check if user is authenticated
  checkAuth() {
    return localStorage.getItem(this.AUTH_KEY) === 'authenticated';
  },

  // Authenticate user with passphrase
  authenticate(passphrase) {
    if (passphrase === this.PASSPHRASE) {
      localStorage.setItem(this.AUTH_KEY, 'authenticated');
      return true;
    }
    return false;
  },

  // Logout
  logout() {
    localStorage.removeItem(this.AUTH_KEY);
    this.renderPosts();
  },

  // Set up admin panel triggers
  setupAdminTrigger() {
    // Keyboard shortcut: Ctrl+Shift+B
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'B') {
        e.preventDefault();
        this.openAdminPanel();
      }
    });
  },

  // Open admin panel
  openAdminPanel() {
    // Check authentication
    if (!this.checkAuth()) {
      const passphrase = prompt('Enter admin passphrase:');
      if (!passphrase) return;

      if (!this.authenticate(passphrase)) {
        alert('Incorrect passphrase. Access denied.');
        return;
      }
    }

    this.showAdminModal();
  },

  // Show admin modal for creating posts
  showAdminModal() {
    // Remove existing modal if present
    this.closeAdminModal();

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    // Create modal
    const modal = document.createElement('div');
    modal.id = 'admin-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h2>New Blog Post</h2>
        <form id="post-form">
          <div>
            <label for="post-title">Title:</label>
            <input type="text" id="post-title" required autofocus />
          </div>
          <div>
            <label for="post-date">Date:</label>
            <input type="date" id="post-date" value="${today}" required />
          </div>
          <div>
            <label for="post-content">Content:</label>
            <textarea id="post-content" rows="10" required></textarea>
          </div>
          <div class="form-buttons">
            <button type="submit" class="btn">Publish</button>
            <button type="button" class="btn" id="cancel-btn">Cancel</button>
            <button type="button" class="btn" id="logout-btn">Logout</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    // Add event listeners
    document.getElementById('post-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.addPost();
    });

    document.getElementById('cancel-btn').addEventListener('click', () => {
      this.closeAdminModal();
    });

    document.getElementById('logout-btn').addEventListener('click', () => {
      this.logout();
      this.closeAdminModal();
      alert('Logged out successfully');
    });

    // Close modal on background click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeAdminModal();
      }
    });

    // Close modal on Escape key
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        this.closeAdminModal();
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);
  },

  // Close admin modal
  closeAdminModal() {
    const modal = document.getElementById('admin-modal');
    if (modal) {
      modal.remove();
    }
  },

  // Add a new post
  addPost() {
    const title = document.getElementById('post-title').value.trim();
    const date = document.getElementById('post-date').value;
    const content = document.getElementById('post-content').value.trim();

    if (!title || !date || !content) {
      alert('Please fill in all fields');
      return;
    }

    const posts = this.getPosts();
    const newPost = {
      id: Date.now(),
      title: title,
      date: date,
      content: content,
      timestamp: new Date().toISOString()
    };

    posts.unshift(newPost); // Add to beginning (newest first)
    this.savePosts(posts);
    this.renderPosts();
    this.closeAdminModal();
  },

  // Delete a post
  deletePost(id) {
    if (!confirm('Are you sure you want to delete this post?')) {
      return;
    }

    const posts = this.getPosts().filter(post => post.id !== id);
    this.savePosts(posts);
    this.renderPosts();
  },

  // Render all posts
  renderPosts() {
    const posts = this.getPosts();
    const container = document.getElementById('blog-posts');

    if (!container) return;

    if (posts.length === 0) {
      container.innerHTML = '<p class="empty-state">No posts yet.</p>';
      return;
    }

    const isAuthenticated = this.checkAuth();

    container.innerHTML = posts.map(post => `
      <article class="blog-post" id="post-${post.id}">
        <h3 class="post-title">${this.escapeHtml(post.title)}</h3>
        <time class="post-date">${this.formatDate(post.date)}</time>
        <div class="post-content">${this.escapeHtml(post.content)}</div>
        ${isAuthenticated ? `
          <div class="post-admin">
            <button class="btn btn-delete" onclick="BlogSystem.deletePost(${post.id})">Delete</button>
          </div>
        ` : ''}
      </article>
      ${posts.indexOf(post) < posts.length - 1 ? '<hr />' : ''}
    `).join('');
  },

  // Format date for display
  formatDate(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  },

  // Escape HTML to prevent XSS
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

// Initialize blog system when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    BlogSystem.init();
  });
} else {
  BlogSystem.init();
}
