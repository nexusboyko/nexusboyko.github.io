// Simple blog server with file storage
const express = require('express');
const multer = require('multer');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 3000;

// Serve static files
app.use(express.static(__dirname));
app.use(express.json());

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'images/blog/');
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Create directories if they don't exist
async function ensureDirectories() {
  await fs.mkdir('posts', { recursive: true });
  await fs.mkdir('images/blog', { recursive: true });
}

// Get all posts
app.get('/api/posts', async (req, res) => {
  try {
    const files = await fs.readdir('posts');
    const posts = await Promise.all(
      files
        .filter(f => f.endsWith('.json'))
        .map(async (file) => {
          const content = await fs.readFile(path.join('posts', file), 'utf8');
          return JSON.parse(content);
        })
    );

    // Sort by date descending
    posts.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(posts);
  } catch (error) {
    res.json([]);
  }
});

// Get single post
app.get('/api/posts/:id', async (req, res) => {
  try {
    const content = await fs.readFile(`posts/${req.params.id}.json`, 'utf8');
    res.json(JSON.parse(content));
  } catch (error) {
    res.status(404).json({ error: 'Post not found' });
  }
});

// Create new post
app.post('/api/posts', upload.single('image'), async (req, res) => {
  try {
    const { title, content } = req.body;
    const id = Date.now().toString();

    const post = {
      id,
      title,
      content,
      image: req.file ? `/images/blog/${req.file.filename}` : null,
      date: new Date().toISOString(),
    };

    await fs.writeFile(
      `posts/${id}.json`,
      JSON.stringify(post, null, 2)
    );

    res.json(post);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Delete post
app.delete('/api/posts/:id', async (req, res) => {
  try {
    // Read post to get image path
    const content = await fs.readFile(`posts/${req.params.id}.json`, 'utf8');
    const post = JSON.parse(content);

    // Delete image if exists
    if (post.image) {
      try {
        await fs.unlink(`.${post.image}`);
      } catch (e) {}
    }

    // Delete post file
    await fs.unlink(`posts/${req.params.id}.json`);
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
