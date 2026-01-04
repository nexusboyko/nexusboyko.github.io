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

// Compute API base so local testing works when page is served on a different port.
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
console.info('Using API base:', API_BASE || '(same origin)');

async function loadPosts() {
  try {
    const res = await fetch(`${API_BASE}/api/posts`);
    return await res.json();
  } catch (err) {
    console.warn('Failed to load posts from', API_BASE + '/api/posts', err);
    return [];
  }
}

async function displayPosts() {
  const posts = await loadPosts();
  const container = document.getElementById('posts');

  if (posts.length === 0) {
    container.innerHTML = '<p style="color:#999;">No posts yet.</p>';
    return;
  }

  container.innerHTML = posts.map(post => `
    <article style="margin:2rem 0;padding-bottom:2rem;border-bottom:1px solid #e0e0de;">
      <h3><a href="#${post.id}" onclick="showPost('${post.id}');return false;">${esc(post.title)}</a></h3>
      <small>${new Date(post.date).toLocaleDateString('en-US', {year:'numeric',month:'long',day:'numeric'})}</small>
    </article>
  `).join('');
}

async function showPost(id) {
  const res = await fetch(`${API_BASE}/api/posts/${id}`);
  const post = await res.json();
  const imgSrc = post.image ? (post.image.startsWith('/') ? post.image : ('/' + post.image)) : '';
  // Render content: prefer MarkdownParser if available to convert markdown -> HTML
  let rendered = post.content || '';
  if (window.MarkdownParser && typeof window.MarkdownParser.parse === 'function') {
    try {
      // Debug: log the raw content being parsed
      console.log('Raw post content:', JSON.stringify(post.content));

      // Normalize line endings (convert \r\n to \n) before parsing
      // This ensures the markdown regex patterns match correctly
      const normalizedContent = (post.content || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

      // Parse markdown to HTML with preview mode enabled for clean output
      // The parser's postProcessHTML automatically wraps lists in ul/ol tags
      let parsedHTML = window.MarkdownParser.parse(
        normalizedContent,
        -1,           // activeLine: no active line
        false,        // showActiveLineRaw: don't show raw markdown
        null,         // instanceHighlighter: no custom highlighter
        true          // isPreviewMode: enable preview mode for cleaner output
      );

      console.log('Parsed HTML (before cleanup):', parsedHTML.substring(0, 500));

      // Remove ALL syntax marker spans (including those with additional classes like "url-part")
      // Match any span that contains "syntax-marker" in its class attribute
      parsedHTML = parsedHTML.replace(/<span[^>]*class="[^"]*syntax-marker[^"]*"[^>]*>.*?<\/span>/g, '');

      console.log('Parsed HTML (after cleanup):', parsedHTML.substring(0, 500));

      rendered = parsedHTML;
    } catch (e) {
      console.warn('MarkdownParser.parse failed, falling back to raw content', e);
      rendered = post.content;
    }
  }

  document.getElementById('posts').innerHTML = `
    <p><a href="#" onclick="displayPosts();return false;">← Back</a></p>
    <article>
      <h2>${esc(post.title)}</h2>
      <p><small>${new Date(post.date).toLocaleDateString('en-US', {year:'numeric',month:'long',day:'numeric'})}</small></p>
      ${imgSrc ? `<p><img src="${imgSrc}" style="max-width:100%;margin:1rem 0;"></p>` : ''}
      <div>${rendered}</div>
      ${localStorage.getItem('blog_token') ? `<p style="margin-top:2rem;"><button onclick="deletePost('${post.id}')" style="padding:0.5rem 1rem;background:#e74c3c;color:white;border:none;cursor:pointer;">Delete</button></p>` : ''}
    </article>
  `;
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
function openAdmin() {
  if (!localStorage.getItem('blog_token')) {
    const pass = prompt('Password:');
    if (!pass) return; // cancelled
    localStorage.setItem('blog_token', pass);
  }
  const admin = document.getElementById('admin');
  if (admin) admin.style.display = 'block';
  const editor = document.getElementById('editor');
  if (editor) editor.focus();
}

document.addEventListener('keydown', e => {
  if (e.ctrlKey && e.shiftKey && e.key === 'B') {
    e.preventDefault();
    openAdmin();
  }
});

document.getElementById('cancel')?.addEventListener('click', () => {
  document.getElementById('admin').style.display = 'none';
  const form = document.getElementById('post-form');
  form.reset?.();
  const editor = document.getElementById('editor');
  if (editor) editor.innerHTML = '';
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

  document.getElementById('admin').style.display = 'none';
  const form = document.getElementById('post-form');
  form.reset?.();
  displayPosts();
});

// Mobile / touch-friendly admin activation: hidden trigger button + multi-click header
const adminTrigger = document.getElementById('admin-trigger');
if (adminTrigger) {
  adminTrigger.addEventListener('click', (ev) => {
    ev.preventDefault();
    openAdmin();
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
      openAdmin();
    }
  });
}

// initialize overtype or fallback sync after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadOvertypeAndInit);
} else {
  loadOvertypeAndInit();
}

displayPosts();
