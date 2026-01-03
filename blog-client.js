// Blog client - file-based storage
const PASSWORD = 'alexboyko2026';
let editor;

// Initialize TinyMCE when admin panel opens
function initEditor() {
  if (editor) return;

  tinymce.init({
    selector: '#editor',
    height: 300,
    menubar: false,
    plugins: 'lists link image code',
    toolbar: 'undo redo | bold italic | bullist numlist | link image | code',
    content_style: 'body { font-family: Helvetica, Arial, sans-serif; font-size: 14px; }',
    setup: (ed) => {
      editor = ed;
    }
  });
}

// Load posts from server
async function loadPosts() {
  try {
    const res = await fetch('/api/posts');
    return await res.json();
  } catch (error) {
    console.error('Failed to load posts:', error);
    return [];
  }
}

// Display posts
async function displayPosts() {
  const posts = await loadPosts();
  const container = document.getElementById('posts-container');

  if (posts.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #999;">No posts yet.</p>';
    return;
  }

  container.innerHTML = `
    <ul class="posts-list">
      ${posts.map(post => `
        <li class="post-item">
          <a href="#${post.id}" class="post-link" onclick="showPost('${post.id}'); return false;">
            <div class="post-title">${escapeHtml(post.title)}</div>
            <div class="post-date">${new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
          </a>
        </li>
      `).join('')}
    </ul>
  `;
}

// Show single post
async function showPost(id) {
  try {
    const res = await fetch(`/api/posts/${id}`);
    const post = await res.json();

    const container = document.getElementById('posts-container');
    container.innerHTML = `
      <a href="#" class="back-link" onclick="displayPosts(); return false;">← Back to posts</a>
      <article>
        <h2>${escapeHtml(post.title)}</h2>
        <p class="post-date">${new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        <div class="post-content">
          ${post.image ? `<img src="${post.image}" alt="" style="max-width: 100%; margin: 1rem 0;">` : ''}
          ${post.content}
        </div>
        ${isAdmin() ? `
          <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e0e0de;">
            <button onclick="deletePost('${post.id}')" style="padding: 0.5rem 1rem; background: #e74c3c; color: white; border: none; cursor: pointer;">Delete Post</button>
          </div>
        ` : ''}
      </article>
    `;
  } catch (error) {
    console.error('Failed to load post:', error);
  }
}

// Delete post
async function deletePost(id) {
  if (!confirm('Delete this post?')) return;

  try {
    await fetch(`/api/posts/${id}`, { method: 'DELETE' });
    displayPosts();
  } catch (error) {
    alert('Failed to delete post');
  }
}

// Check if admin
function isAdmin() {
  return localStorage.getItem('blog_auth') === 'true';
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

    if (!isAdmin()) {
      const pass = prompt('Password:');
      if (pass !== PASSWORD) {
        alert('Wrong password');
        return;
      }
      localStorage.setItem('blog_auth', 'true');
    }

    document.getElementById('admin-panel').style.display = 'block';
    initEditor();
  }
});

// Cancel button
document.getElementById('cancel-btn')?.addEventListener('click', () => {
  document.getElementById('admin-panel').style.display = 'none';
  document.getElementById('admin-form').reset();
  if (editor) editor.setContent('');
});

// Handle form submission
document.getElementById('admin-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData();
  formData.append('title', document.getElementById('title').value);
  formData.append('content', editor.getContent());

  const imageFile = document.getElementById('image').files[0];
  if (imageFile) {
    formData.append('image', imageFile);
  }

  try {
    const res = await fetch('/api/posts', {
      method: 'POST',
      body: formData
    });

    if (res.ok) {
      document.getElementById('admin-panel').style.display = 'none';
      document.getElementById('admin-form').reset();
      editor.setContent('');
      displayPosts();
      alert('Post published!');
    } else {
      alert('Failed to publish post');
    }
  } catch (error) {
    alert('Failed to publish post');
  }
});

// Initial load
displayPosts();
