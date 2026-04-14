// Load OverType in the browser (ES module) or fall back to simple contenteditable sync.
function loadOvertypeAndInit() {
  const editorEl = document.getElementById('editor');
  const hiddenTa = document.getElementById('content');

  function fallbackSync() {
    if (!editorEl) return;
    // Make the editor editable and sync changes into the hidden textarea
    editorEl.contentEditable = 'true';
    editorEl.setAttribute('role', 'textbox');
    editorEl.setAttribute('tabindex', '0');
    if (hiddenTa) hiddenTa.value = editorEl.innerHTML || hiddenTa.value || '';
    editorEl.addEventListener('input', () => {
      const v = editorEl.innerHTML;
      console.log('editor value:', v);
      if (hiddenTa) hiddenTa.value = v;
    });
  }

  let attempts = 0;
  function tryInit() {
    attempts++;
    if (window.OverType) {
      try {
        // initialize with toolbar (custom minimal buttons when available) and onChange
        const toolbarOptions = {};
        if (window.toolbarButtons) {
          toolbarOptions.toolbarButtons = [
            window.toolbarButtons.bold,
            window.toolbarButtons.italic,
            window.toolbarButtons.separator,
            window.toolbarButtons.bulletList,
            window.toolbarButtons.orderedList,
            window.toolbarButtons.separator,
            window.toolbarButtons.link
          ].filter(Boolean);
          toolbarOptions.toolbar = true;
        } else {
          toolbarOptions.toolbar = true;
        }

        const [editor] = new window.OverType('#editor', Object.assign({
          placeholder: 'Start typing…',
          value: hiddenTa ? hiddenTa.value : '',
          onChange: (value) => {
            console.log('editor value:', value);
            if (hiddenTa) hiddenTa.value = value;
          }
        }, toolbarOptions));
        // expose instance for later use (submit/export)
        window.overtypeEditor = editor;
        return;
      } catch (err) {
        console.warn('OverType initialization failed, falling back:', err);
        fallbackSync();
        return;
      }
    }

    if (attempts < 25) {
      setTimeout(tryInit, 200);
    } else {
      // give up and use fallback
      console.warn('OverType not available; using simple contenteditable sync.');
      fallbackSync();
    }
  }

  tryInit();
}

// Compute API base for admin operations only
const API_BASE = (function() {
  if (window.API_BASE) return window.API_BASE;
  const proto = (window.location.protocol === 'file:') ? 'http:' : window.location.protocol;
  const host = window.location.hostname || 'localhost';
  const port = window.location.port;
  // If page is served from the API server (port 3001) or same origin, use relative paths.
  if (port === '3001' || port === '') return '';
  // Otherwise, call the local API server on port 3001.
  return `${proto}//${host}:3001`;
})();
console.info('Using API base for admin:', API_BASE || '(same origin)');

async function loadPosts() {
  try {
    // Load from static posts.json file (no server needed!)
    const res = await fetch('/blog/posts.json');
    return await res.json();
  } catch (err) {
    console.warn('Failed to load posts from posts.json', err);
    return [];
  }
}

async function displayPosts() {
  const posts = await loadPosts();
  const container = document.getElementById('posts');

  if (posts.length === 0) {
    container.innerHTML = '<li style="color:#999;font-size:12px;">No posts yet.</li>';
    return;
  }

  container.innerHTML = posts.map(post => {
    const slug = post.slug || `post-${post.id}`;
    return `<li style="font-size:12px;"><a href="/blog/${slug}.html">${esc(post.title)}</a></li>`;
  }).join('');
}

async function deletePost(id) {
  if (!confirm('Delete this post?')) return;
  const token = localStorage.getItem('blog_token');
  await fetch(`${API_BASE}/api/posts/${id}`, {method:'DELETE', headers: { Authorization: `Bearer ${token}` }});
  displayPosts();
}

function esc(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Admin
function toggleAdmin() {
  const admin = document.getElementById('admin');
  const isVisible = admin && admin.style.display === 'block';

  if (isVisible) {
    // Logout: hide panel and clear token
    admin.style.display = 'none';
    localStorage.removeItem('blog_token');
    return;
  }

  // Login flow
  if (!localStorage.getItem('blog_token')) {
    const pass = prompt('Password:');
    if (!pass) return; // cancelled
    localStorage.setItem('blog_token', pass);
  }

  if (admin) admin.style.display = 'block';
  const editor = document.getElementById('editor');
  if (editor) editor.focus();
}

document.addEventListener('keydown', e => {
  if (e.ctrlKey && e.shiftKey && e.key === 'B') {
    e.preventDefault();
    toggleAdmin();
  }
});

document.getElementById('cancel')?.addEventListener('click', () => {
  const form = document.getElementById('post-form');
  form.reset?.();
  const editor = document.getElementById('editor');
  if (editor) editor.innerHTML = '';
  // Keep panel open if logged in, just clear the form
});
document.getElementById('post-form').addEventListener('submit', async e => {
  e.preventDefault();

  const formData = new FormData();
  formData.append('title', document.getElementById('title').value);
  // Ensure hidden textarea has latest content from editor (if present)
  const hiddenTa = document.getElementById('content');
  // If OverType instance exists, prefer its markdown value.
  if (window.overtypeEditor && typeof window.overtypeEditor.getValue === 'function') {
    const md = window.overtypeEditor.getValue();
    if (hiddenTa) hiddenTa.value = md;
    formData.append('content', md);
  } else {
    // fallback: use hidden textarea (which may have been synced from contenteditable)
    const editorEl = document.getElementById('editor');
    if (editorEl && hiddenTa && !hiddenTa.value) hiddenTa.value = editorEl.innerHTML;
    formData.append('content', hiddenTa ? hiddenTa.value : '');
  }

  const img = document.getElementById('image').files[0];
  if (img) formData.append('image', img);

  const token = localStorage.getItem('blog_token');
  await fetch(`${API_BASE}/api/posts`, {method:'POST', body:formData, headers: { Authorization: `Bearer ${token}` }});

  // Keep admin open, just reset form
  const form = document.getElementById('post-form');
  form.reset?.();
  const editor = document.getElementById('editor');
  if (editor) editor.innerHTML = '';
  displayPosts();
});

// Mobile / touch-friendly admin activation: hidden trigger button + multi-click header
const adminTrigger = document.getElementById('admin-trigger');
if (adminTrigger) {
  adminTrigger.addEventListener('click', (ev) => {
    ev.preventDefault();
    toggleAdmin();
  });
}

let headerClickCount = 0;
let headerClickTimer = null;
const headerEl = document.getElementById('site-header');
if (headerEl) {
  headerEl.addEventListener('click', () => {
    headerClickCount++;
    if (headerClickTimer) clearTimeout(headerClickTimer);
    headerClickTimer = setTimeout(() => { headerClickCount = 0; }, 4000);
    if (headerClickCount >= 5) {
      headerClickCount = 0;
      toggleAdmin();
    }
  });
}

// initialize overtype or fallback sync after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadOvertypeAndInit);
} else {
  loadOvertypeAndInit();
}

// Auto-show admin panel if already logged in
if (localStorage.getItem('blog_token')) {
  const admin = document.getElementById('admin');
  if (admin) admin.style.display = 'block';
}

displayPosts();
