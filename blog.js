// Blog System - Client-side blog with localStorage
// Minimal Personal Website by Alex Boyko
// Features: Image uploads, edit posts, numbered list view, hash routing

const BlogSystem = {
  STORAGE_KEY: 'nexusboyko_blog_posts',
  AUTH_KEY: 'nexusboyko_blog_auth',
  PASSPHRASE: 'alexboyko2026', // Change this to your preferred passphrase

  CONFIG: {
    backendUrl: null,  // Set when backend is ready (e.g., 'https://api.alexboyko.com')
    useLocalStorage: true  // Flip to false when backend is available
  },

  // Initialize the blog system
  init() {
    this.migrateOldPosts();
    this.renderBlogList();
    this.setupAdminTrigger();
    this.setupHashRouting();
  },

  // Migrate old posts to new schema
  migrateOldPosts() {
    const posts = this.getPosts();
    let migrated = false;

    const updatedPosts = posts.map(post => {
      // Check if post needs migration (missing new fields)
      if (!post.slug || post.published === undefined) {
        migrated = true;
        return {
          ...post,
          slug: post.slug || this.generateSlug(post.title),
          published: post.published !== undefined ? post.published : true,
          imageUrl: post.imageUrl || null,
          imageAlt: post.imageAlt || '',
          tags: post.tags || []
        };
      }
      return post;
    });

    if (migrated) {
      this.savePosts(updatedPosts);
      console.log('✓ Migrated blog posts to new schema');
    }
  },

  // Check if backend is available
  backendAvailable() {
    return this.CONFIG.backendUrl !== null && !this.CONFIG.useLocalStorage;
  },

  // Get all posts from localStorage (or API in future)
  getPosts() {
    // Future: Fetch from API if backend available
    if (this.backendAvailable()) {
      // Placeholder for future implementation
      console.log('Backend mode not yet implemented');
    }

    // localStorage mode
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
    this.renderBlogList();
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

  // Setup hash routing for posts
  setupHashRouting() {
    window.addEventListener('popstate', () => {
      const hash = window.location.hash;
      if (hash.startsWith('#post-')) {
        const id = parseInt(hash.replace('#post-', ''));
        this.showPost(id);
      } else {
        this.showBlogList();
      }
    });

    // Handle initial hash on page load
    const hash = window.location.hash;
    if (hash.startsWith('#post-')) {
      const id = parseInt(hash.replace('#post-', ''));
      this.showPost(id);
    }
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

  // Show admin modal for creating/editing posts
  showAdminModal(editMode = false, existingPost = null) {
    // Remove existing modal if present
    this.closeAdminModal();

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    // Create modal
    const modal = document.createElement('div');
    modal.id = 'admin-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h2>${editMode ? 'Edit Post' : 'New Blog Post'}</h2>
        <form id="post-form">
          <div class="form-group">
            <label for="post-title">Title:</label>
            <input type="text" id="post-title" required autofocus
                   value="${editMode ? this.escapeHtml(existingPost.title) : ''}" />
          </div>

          <div class="form-group">
            <label for="post-date">Date:</label>
            <input type="date" id="post-date" required
                   value="${editMode ? existingPost.date : today}" />
          </div>

          <div class="form-group">
            <label for="post-content">Content:</label>
            <textarea id="post-content" rows="12" required>${editMode ? this.escapeHtml(existingPost.content) : ''}</textarea>
          </div>

          <div class="form-group">
            <label for="post-image">Image (optional):</label>
            <input type="file" id="post-image" accept="image/*" />
            ${editMode && existingPost.imageUrl ? `
              <div class="current-image">
                <img src="${existingPost.imageUrl}" alt="Current image" />
                <label>
                  <input type="checkbox" id="remove-image" /> Remove current image
                </label>
              </div>
            ` : ''}
            <p class="help-text">Max 5MB. Supported: JPG, PNG, WebP</p>
          </div>

          <div class="form-buttons">
            <button type="submit" class="btn btn-primary">
              ${editMode ? 'Update' : 'Publish'}
            </button>
            <button type="button" class="btn" id="cancel-btn">Cancel</button>
            <button type="button" class="btn" id="logout-btn">Logout</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    // Store edit context
    modal.dataset.editMode = editMode;
    if (editMode) {
      modal.dataset.postId = existingPost.id;
    }

    // Add event listeners
    document.getElementById('post-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.savePost();
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

  // Save post (create or update)
  async savePost() {
    const modal = document.getElementById('admin-modal');
    const editMode = modal.dataset.editMode === 'true';
    const postId = editMode ? parseInt(modal.dataset.postId) : null;

    const title = document.getElementById('post-title').value.trim();
    const date = document.getElementById('post-date').value;
    const content = document.getElementById('post-content').value.trim();
    const imageFile = document.getElementById('post-image').files[0];
    const removeImage = document.getElementById('remove-image')?.checked;

    if (!title || !date || !content) {
      alert('Please fill in all required fields');
      return;
    }

    let imageData = null;
    if (imageFile) {
      imageData = await this.handleImageUpload(imageFile);
    }

    const posts = this.getPosts();

    if (editMode) {
      // Update existing post
      const index = posts.findIndex(p => p.id === postId);
      if (index !== -1) {
        posts[index] = {
          ...posts[index],
          title,
          date,
          content,
          imageUrl: removeImage ? null : (imageData?.url || posts[index].imageUrl),
          imageAlt: removeImage ? '' : (imageData?.alt || posts[index].imageAlt),
          slug: this.generateSlug(title),
          updatedAt: new Date().toISOString()
        };
      }
    } else {
      // Create new post
      const newPost = {
        id: Date.now(),
        title,
        date,
        content,
        timestamp: new Date().toISOString(),
        imageUrl: imageData?.url || null,
        imageAlt: imageData?.alt || '',
        slug: this.generateSlug(title),
        published: true,
        tags: []
      };
      posts.unshift(newPost);
    }

    this.savePosts(posts);
    this.renderBlogList();
    this.closeAdminModal();

    // If editing, refresh the post view
    if (editMode) {
      this.showPost(postId);
    }
  },

  // Handle image upload (base64 for localStorage mode)
  async handleImageUpload(file) {
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image too large. Maximum size is 5MB.');
      return null;
    }

    // For localStorage mode: Convert to base64
    if (!this.backendAvailable()) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve({
            url: e.target.result, // base64 data URL
            alt: file.name
          });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    // Future: Backend mode with multer
    // const formData = new FormData();
    // formData.append('image', file);
    // const response = await fetch(`${this.CONFIG.backendUrl}/api/upload`, {
    //   method: 'POST',
    //   body: formData
    // });
    // const data = await response.json();
    // return { url: data.imageUrl, alt: file.name };
  },

  // Edit a post
  editPost(id) {
    const posts = this.getPosts();
    const post = posts.find(p => p.id === id);

    if (!post) {
      alert('Post not found');
      return;
    }

    this.showAdminModal(true, post);
  },

  // Delete a post
  deletePost(id) {
    if (!confirm('Are you sure you want to delete this post?')) {
      return;
    }

    const posts = this.getPosts().filter(post => post.id !== id);
    this.savePosts(posts);
    this.showBlogList();
  },

  // Render blog list (numbered, descending)
  renderBlogList() {
    const posts = this.getPosts()
      .filter(post => post.published !== false)
      .sort((a, b) => new Date(b.date) - new Date(a.date)); // Descending order

    const container = document.getElementById('blog-list');

    if (!container) return;

    if (posts.length === 0) {
      container.innerHTML = '<p class="empty-state">No posts yet.</p>';
      return;
    }

    // Create numbered list (descending)
    const listHTML = `
      <ol class="blog-list" reversed start="${posts.length}">
        ${posts.map((post, index) => {
          const number = String(posts.length - index).padStart(2, '0');
          return `
            <li class="blog-item">
              <a href="#post-${post.id}" onclick="BlogSystem.showPost(${post.id}); return false;">
                <span class="post-number">${number}</span>
                <time class="post-date" datetime="${post.date}">${post.date}</time>
                <span class="post-title">${this.escapeHtml(post.title)}</span>
              </a>
            </li>
          `;
        }).join('')}
      </ol>
    `;

    container.innerHTML = listHTML;
  },

  // Show individual post
  showPost(postId) {
    const posts = this.getPosts();
    const post = posts.find(p => p.id === postId);

    if (!post) {
      alert('Post not found');
      this.showBlogList();
      return;
    }

    // Hide blog list, show post view
    const listContainer = document.getElementById('blog-list');
    const postContainer = document.getElementById('post-view');

    if (listContainer) listContainer.style.display = 'none';
    if (postContainer) {
      postContainer.innerHTML = this.renderPost(post);
      postContainer.style.display = 'block';
    }

    // Update URL hash
    window.location.hash = `post-${postId}`;
  },

  // Show blog list (hide post view)
  showBlogList() {
    const listContainer = document.getElementById('blog-list');
    const postContainer = document.getElementById('post-view');

    if (listContainer) listContainer.style.display = 'block';
    if (postContainer) postContainer.style.display = 'none';

    window.location.hash = '';
    this.renderBlogList();
  },

  // Render individual post HTML
  renderPost(post) {
    const isAuthenticated = this.checkAuth();
    const formattedDate = this.formatDate(post.date);

    return `
      <article class="blog-post">
        <header class="post-header">
          <a href="#" class="back-link" onclick="BlogSystem.showBlogList(); return false;">← Back to list</a>
          <time class="post-date" datetime="${post.date}">${formattedDate}</time>
          <h2 class="post-title">${this.escapeHtml(post.title)}</h2>
        </header>

        <div class="post-content">
          ${this.formatContent(post.content)}
        </div>

        ${post.imageUrl ? `
          <figure class="post-image">
            <img src="${post.imageUrl}" alt="${this.escapeHtml(post.imageAlt || post.title)}" />
          </figure>
        ` : ''}

        ${isAuthenticated ? `
          <div class="post-admin">
            <button class="btn btn-edit" onclick="BlogSystem.editPost(${post.id})">Edit</button>
            <button class="btn btn-delete" onclick="BlogSystem.deletePost(${post.id})">Delete</button>
          </div>
        ` : ''}
      </article>
    `;
  },

  // Format content (preserve line breaks, convert URLs to links)
  formatContent(content) {
    return content
      .split('\n\n')
      .map(para => {
        const formatted = para
          .replace(/\n/g, '<br>')
          .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
        return `<p>${formatted}</p>`;
      })
      .join('');
  },

  // Generate URL-friendly slug from title
  generateSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
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
  },

  // Export posts to JSON (utility for backup)
  exportPosts() {
    const posts = this.getPosts();
    const dataStr = JSON.stringify(posts, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `blog-posts-${Date.now()}.json`;
    link.click();

    URL.revokeObjectURL(url);
  },

  // Import posts from JSON (utility for restore)
  importPosts(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const posts = JSON.parse(e.target.result);
        if (confirm(`Import ${posts.length} posts? This will replace existing posts.`)) {
          this.savePosts(posts);
          this.renderBlogList();
          alert('Posts imported successfully');
        }
      } catch (err) {
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
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
