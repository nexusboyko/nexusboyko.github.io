// Simple blog client - disk-based storage
const STORAGE_KEY = 'blog_posts';
const AUTH_KEY = 'blog_auth';
const PASSWORD = 'alexboyko2026'; // Change this

// Load posts from localStorage (simple disk simulation)
function loadPosts() {
  const posts = localStorage.getItem(STORAGE_KEY);
  return posts ? JSON.parse(posts) : [];
}

// Save posts
function savePosts(posts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
}

// Display posts
function displayPosts() {
  const posts = loadPosts().sort((a, b) => b.date - a.date);
  const container = document.getElementById('posts-container');

  if (posts.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #999;">No posts yet.</p>';
    return;
  }

  container.innerHTML = `
    <ul class="posts-list">
      ${posts.map(post => `
        <li class="post-item">
          <a href="#${post.id}" class="post-link" onclick="showPost(${post.id}); return false;">
            <div class="post-title">${escapeHtml(post.title)}</div>
            <div class="post-date">${new Date(post.date).toLocaleDateString()}</div>
          </a>
        </li>
      `).join('')}
    </ul>
  `;
}

// Show single post
function showPost(id) {
  const posts = loadPosts();
  const post = posts.find(p => p.id === id);
  if (!post) return;

  const container = document.getElementById('posts-container');
  container.innerHTML = `
    <a href="#" class="back-link" onclick="displayPosts(); return false;">← Back to posts</a>
    <article>
      <h2>${escapeHtml(post.title)}</h2>
      <p class="post-date">${new Date(post.date).toLocaleDateString()}</p>
      <div class="post-content">
        ${post.image ? `<img src="${post.image}" alt="">` : ''}
        ${formatContent(post.content)}
      </div>
    </article>
  `;
}

// Format content (simple markdown-like)
function formatContent(text) {
  return text.split('\n\n')
    .map(p => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Admin panel
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.key === 'B') {
    e.preventDefault();

    if (!localStorage.getItem(AUTH_KEY)) {
      const pass = prompt('Password:');
      if (pass !== PASSWORD) {
        alert('Wrong password');
        return;
      }
      localStorage.setItem(AUTH_KEY, 'true');
    }

    document.getElementById('admin-panel').style.display = 'block';
  }
});

// Handle post submission
document.getElementById('admin-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const title = document.getElementById('title').value;
  const content = document.getElementById('content').value;
  const imageFile = document.getElementById('image').files[0];

  let imageData = null;
  if (imageFile) {
    imageData = await readFileAsDataURL(imageFile);
  }

  const posts = loadPosts();
  posts.push({
    id: Date.now(),
    title,
    content,
    image: imageData,
    date: Date.now()
  });

  savePosts(posts);
  displayPosts();
  document.getElementById('admin-form').reset();
  document.getElementById('admin-panel').style.display = 'none';
  alert('Post published!');
});

// Read file as data URL
function readFileAsDataURL(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.readAsDataURL(file);
  });
}

// Initial load
displayPosts();
