// Simple blog server with file storage
const express = require('express');
const multer = require('multer');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Serve static files
app.use(express.static(__dirname));
app.use(express.json());
// Allow cross-origin requests so the uploader can work from other origins
app.use(cors());

// Configure multer for image uploads with sanitization and filtering
function safeFilename(originalName) {
  const ext = path.extname(originalName).toLowerCase();
  const name = Math.random().toString(36).slice(2, 8);
  return `${Date.now()}-${name}${ext}`;
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'images', 'blog')),
  filename: (req, file, cb) => cb(null, safeFilename(file.originalname))
});

function fileFilter(req, file, cb) {
  if (!file.mimetype || !file.mimetype.startsWith('image/')) return cb(new Error('Only images allowed'));
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Create directories if they don't exist
async function ensureDirectories() {
  await fs.mkdir(path.join(__dirname, 'posts'), { recursive: true });
  await fs.mkdir(path.join(__dirname, 'images', 'blog'), { recursive: true });
}

// Get all posts
app.get('/api/posts', async (req, res) => {
  try {
    const postsDir = path.join(__dirname, 'posts');
    const files = await fs.readdir(postsDir);
    const posts = await Promise.all(
      files
        .filter(f => f.endsWith('.json'))
        .map(async (file) => {
          const content = await fs.readFile(path.join(postsDir, file), 'utf8');
          return JSON.parse(content);
        })
    );

    posts.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(posts);
  } catch (error) {
    res.json([]);
  }
});

// Get single post
app.get('/api/posts/:id', async (req, res) => {
  try {
    const postPath = path.join(__dirname, 'posts', `${req.params.id}.json`);
    const content = await fs.readFile(postPath, 'utf8');
    res.json(JSON.parse(content));
  } catch (error) {
    res.status(404).json({ error: 'Post not found' });
  }
});

// Simple auth middleware: requires env var BLOG_PASS to be set
function requireAuth(req, res, next) {
  const pass = process.env.BLOG_PASS;
  if (!pass) return res.status(500).json({ error: 'Server not configured' });
  const auth = req.headers.authorization || '';
  if (auth !== `Bearer ${pass}`) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// Create new post
app.post('/api/posts', requireAuth, upload.single('image'), async (req, res) => {
  try {
    const { title, content } = req.body || {};
    const id = Date.now().toString();

    const imagePath = req.file ? path.posix.join('images', 'blog', req.file.filename) : null;

    const post = {
      id,
      title: title || '',
      content: content || '',
      image: imagePath,
      date: new Date().toISOString(),
    };

    const postsDir = path.join(__dirname, 'posts');
    await fs.writeFile(
      path.join(postsDir, `${id}.json`),
      JSON.stringify(post, null, 2)
    );

    res.json(post);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Delete post
app.delete('/api/posts/:id', requireAuth, async (req, res) => {
  try {
    const postsDir = path.join(__dirname, 'posts');
    const postPath = path.join(postsDir, `${req.params.id}.json`);
    const content = await fs.readFile(postPath, 'utf8');
    const post = JSON.parse(content);

    if (post.image) {
      try {
        const imagesBase = path.resolve(__dirname, 'images', 'blog');
        const candidate = post.image.startsWith('/') ? path.resolve(__dirname, '.' + post.image) : path.resolve(__dirname, post.image);
        if (candidate.startsWith(imagesBase)) {
          await fs.unlink(candidate);
        }
      } catch (e) {}
    }

    await fs.unlink(postPath);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// Start server
ensureDirectories().then(() => {
  app.listen(PORT, () => {
    console.log(`Blog server running at http://localhost:${PORT}`);
  });
});
