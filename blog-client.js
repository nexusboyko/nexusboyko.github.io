// Simple blog client
const PASSWORD = 'alexboyko2026';

async function loadPosts() {
  try {
    const res = await fetch('/api/posts');
    return await res.json();
  } catch {
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
  const res = await fetch(`/api/posts/${id}`);
  const post = await res.json();

  document.getElementById('posts').innerHTML = `
    <p><a href="#" onclick="displayPosts();return false;">← Back</a></p>
    <article>
      <h2>${esc(post.title)}</h2>
      <p><small>${new Date(post.date).toLocaleDateString('en-US', {year:'numeric',month:'long',day:'numeric'})}</small></p>
      ${post.image ? `<p><img src="${post.image}" style="max-width:100%;margin:1rem 0;"></p>` : ''}
      <div>${post.content}</div>
      ${localStorage.getItem('auth') ? `<p style="margin-top:2rem;"><button onclick="deletePost('${post.id}')" style="padding:0.5rem 1rem;background:#e74c3c;color:white;border:none;cursor:pointer;">Delete</button></p>` : ''}
    </article>
  `;
}

async function deletePost(id) {
  if (!confirm('Delete this post?')) return;
  await fetch(`/api/posts/${id}`, {method:'DELETE'});
  displayPosts();
}

function esc(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Admin
document.addEventListener('keydown', e => {
  if (e.ctrlKey && e.shiftKey && e.key === 'B') {
    e.preventDefault();
    if (!localStorage.getItem('auth')) {
      const pass = prompt('Password:');
      if (pass !== PASSWORD) return alert('Wrong password');
      localStorage.setItem('auth', '1');
    }
    document.getElementById('admin').style.display = 'block';
  }
});

document.getElementById('cancel')?.addEventListener('click', () => {
  document.getElementById('admin').style.display = 'none';
  document.getElementById('post-form').reset();
});

document.getElementById('post-form').addEventListener('submit', async e => {
  e.preventDefault();

  const formData = new FormData();
  formData.append('title', document.getElementById('title').value);
  formData.append('content', document.getElementById('content').value);

  const img = document.getElementById('image').files[0];
  if (img) formData.append('image', img);

  await fetch('/api/posts', {method:'POST', body:formData});

  document.getElementById('admin').style.display = 'none';
  document.getElementById('post-form').reset();
  displayPosts();
});

displayPosts();
