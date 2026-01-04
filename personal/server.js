// Simple blog server with file storage
const express = require("express");
const multer = require("multer");
const fs = require("fs").promises;
const path = require("path");
const cors = require("cors");
const sharp = require("sharp");

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
  destination: (req, file, cb) =>
    cb(null, path.join(__dirname, "images", "blog")),
  filename: (req, file, cb) => cb(null, safeFilename(file.originalname)),
});

function fileFilter(req, file, cb) {
  if (!file.mimetype || !file.mimetype.startsWith("image/"))
    return cb(new Error("Only images allowed"));
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Utility functions for post generation
function generateSlug(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special chars
    .replace(/[\s_-]+/g, "-") // Convert spaces to hyphens
    .replace(/^-+|-+$/g, ""); // Trim hyphens
}

function escapeHTML(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

function convertMarkdownToHTML(markdownContent) {
  console.log("Converting markdown to HTML", markdownContent);
  let html = markdownContent
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    // Bold
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<strong>$1</strong>")
    // Italic
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/_(.+?)_/g, "<em>$1</em>")
    // Links (support both [text](href) and inverted [href](text))
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, p1, p2) => {
      // Support both [text](href) and inverted [href](text).
      // Determine which part is the href by checking for common href patterns.
      const looksLikeHref = /^(https?:\/\/)|^\/|\./.test(p1);
      let href = looksLikeHref ? p1 : p2;
      const text = looksLikeHref ? p2 : p1;

      // If href does not start with a scheme, protocol-relative, slash, or hash,
      // but looks like a bare domain (contains a dot), prepend https:// so the
      // browser treats it as an absolute URL instead of a relative path.
      if (
        !/^(?:[a-zA-Z][a-zA-Z0-9+.-]*:|\/|\/\/|#)/.test(href) &&
        /\./.test(href)
      ) {
        href = `https://${href}`;
      }

      return `<a href="${escapeHTML(href)}">${escapeHTML(text)}</a>`;
    })
    // Lists - unordered
    .replace(/^\s*[-*]\s+(.+)$/gm, "<li>$1</li>")
    // Lists - ordered
    .replace(/^\s*\d+\.\s+(.+)$/gm, "<li>$1</li>");

  // Wrap list items in ul/ol
  const lines = html.split("\n");
  const result = [];
  let inList = false;
  let listType = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes("<li>")) {
      // Determine list type from original markdown
      const originalLine = markdownContent.split("\n")[i];
      const currentListType = originalLine.match(/^\s*\d+\./) ? "ol" : "ul";

      if (!inList) {
        result.push(`<${currentListType}>`);
        inList = true;
        listType = currentListType;
      } else if (listType !== currentListType) {
        result.push(`</${listType}>`);
        result.push(`<${currentListType}>`);
        listType = currentListType;
      }
      result.push(line);
    } else {
      if (inList) {
        result.push(`</${listType}>`);
        inList = false;
        listType = null;
      }
      if (line.trim()) {
        result.push(`<p>${line}</p>`);
      }
    }
  }

  if (inList) {
    result.push(`</${listType}>`);
  }

  return result.join("\n");
}

// CSV helper functions
async function ensureCSV() {
  const csvPath = path.join(__dirname, "posts.csv");
  try {
    await fs.access(csvPath);
  } catch {
    // Create with headers if doesn't exist
    await fs.writeFile(csvPath, "id,slug,title,date,image\n", "utf8");
  }
}

function escapeCSV(field) {
  if (field == null) return "";
  const str = String(field);
  // Escape fields containing comma, quote, or newline
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

async function appendToCSV(post) {
  await ensureCSV();
  const csvPath = path.join(__dirname, "posts.csv");

  const row =
    [
      post.id,
      post.slug,
      escapeCSV(post.title),
      post.date,
      post.image || "",
    ].join(",") + "\n";

  await fs.appendFile(csvPath, row, "utf8");
}

async function readCSV() {
  await ensureCSV();
  const csvPath = path.join(__dirname, "posts.csv");
  const content = await fs.readFile(csvPath, "utf8");

  const lines = content.trim().split("\n");
  if (lines.length <= 1) return []; // Only headers or empty

  const posts = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Simple CSV parsing - split by comma, handle quoted fields
    const fields = [];
    let current = "";
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];

      if (char === '"') {
        if (inQuotes && line[j + 1] === '"') {
          current += '"';
          j++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        fields.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    fields.push(current); // Add last field

    if (fields.length < 5) continue;

    posts.push({
      id: fields[0].trim(),
      slug: fields[1].trim(),
      title: fields[2].trim(),
      date: fields[3].trim(),
      image: fields[4].trim() || null,
    });
  }

  return posts;
}

async function removeFromCSV(id) {
  const posts = await readCSV();
  const filtered = posts.filter((p) => p.id !== id);

  const csvPath = path.join(__dirname, "posts.csv");
  const rows = ["id,slug,title,date,image"];

  for (const post of filtered) {
    rows.push(
      [
        post.id,
        post.slug,
        escapeCSV(post.title),
        post.date,
        post.image || "",
      ].join(",")
    );
  }

  await fs.writeFile(csvPath, rows.join("\n") + "\n", "utf8");
}

async function updateBlogIndex() {
  const posts = await readCSV();
  // Sort by date, newest first
  posts.sort((a, b) => new Date(b.date) - new Date(a.date));

  const indexPath = path.join(__dirname, "blog", "index.html");
  let html = await fs.readFile(indexPath, "utf8");

  // Build the posts list HTML with delete buttons
  const postsHTML = posts
    .map(
      (post) =>
        `<li style="font-size:12px;display:flex;"><a href="${
          post.id
        }.html">${escapeHTML(post.title)}</a>&nbsp;<span onclick="deletePost('${
          post.id
        }')" style="cursor:pointer;color: red;">(del)</span></li>`
    )
    .join("\n      ");

  // Replace the <ol id="posts">...</ol> content
  // Match the opening tag, capture everything until closing tag
  const olRegex = /(<ol id="posts">)([\s\S]*?)(<\/ol>)/;

  html = html.replace(olRegex, (match, open, content, close) => {
    return `${open}\n      ${postsHTML}\n    ${close}`;
  });

  await fs.writeFile(indexPath, html, "utf8");
  console.log(`Updated blog index with ${posts.length} posts`);
}

async function compressImage(inputPath, outputPath) {
  try {
    await sharp(inputPath)
      .resize(1920, 1920, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({
        quality: 85,
        progressive: true,
      })
      .toFile(outputPath);

    return outputPath;
  } catch (error) {
    console.error("Image compression failed:", error);
    throw error;
  }
}

async function generatePostHTML(post) {
  const blogDir = path.join(__dirname, "blog");
  await fs.mkdir(blogDir, { recursive: true });

  const renderedContent = convertMarkdownToHTML(post.content || "");
  const formattedDate = new Date(post.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const imageHTML = post.image
    ? `<p><img src="../${
        post.image
      }" style="max-width:100%;margin:1rem 0;" alt="${escapeHTML(
        post.title
      )}"></p>`
    : "";

  const html = `<!DOCTYPE html>
                <html lang="en">
                  <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <title>${escapeHTML(post.title)} — Alex Boyko</title>
                    <link rel="stylesheet" href="../styles.css">
                    <link rel="icon" href="../favicon.ico">
                  </head>
                  <body>
                    <h1>${escapeHTML(post.title)}</h1>
                    <p><small>${formattedDate}</p>
                    <nav><a href="index.html">← Blog</a></nav>
                    <section>
                      <h2>-</h2>
                      ${imageHTML}
                      <div>${renderedContent}</div>
                    </section>
                  </body>
                </html>`;

  await fs.writeFile(path.join(blogDir, `${post.id}.html`), html, "utf8");
}

// Create directories if they don't exist
async function ensureDirectories() {
  await fs.mkdir(path.join(__dirname, "images", "blog"), { recursive: true });
  await ensureCSV(); // Ensure CSV index exists with headers
}

// GET endpoints removed - blog now uses static posts.json and individual HTML files

// Simple auth middleware: requires env var BLOG_PASS to be set
function requireAuth(req, res, next) {
  const pass = process.env.BLOG_PASS;
  if (!pass) return res.status(500).json({ error: "Server not configured" });
  const auth = req.headers.authorization || "";
  if (auth !== `Bearer ${pass}`)
    return res.status(401).json({ error: "Unauthorized" });
  next();
}

// Create new post
app.post(
  "/api/posts",
  requireAuth,
  upload.single("image"),
  async (req, res) => {
    try {
      const { title, content } = req.body || {};
      const id = Date.now().toString();

      // Generate slug from title
      const slug = generateSlug(title || `post-${id}`);

      let imagePath = null;

      if (req.file) {
        // Compress uploaded image
        const originalPath = req.file.path;
        const compressedFilename = `compressed-${req.file.filename}`;
        const compressedPath = path.join(
          __dirname,
          "images",
          "blog",
          compressedFilename
        );

        try {
          await compressImage(originalPath, compressedPath);
          // Delete original uncompressed file
          await fs.unlink(originalPath);
          imagePath = path.posix.join("images", "blog", compressedFilename);
        } catch (compressionError) {
          // Fallback to original if compression fails
          console.warn(
            "Image compression failed, using original:",
            compressionError
          );
          imagePath = path.posix.join("images", "blog", req.file.filename);
        }
      }

      const post = {
        id,
        slug,
        title: title || "",
        content: content || "",
        image: imagePath,
        date: new Date().toISOString(),
      };

      // Generate HTML file for the post
      await generatePostHTML(post);

      // Append to CSV index
      await appendToCSV(post);

      // Update blog/index.html with new post link
      await updateBlogIndex();

      res.json(post);
    } catch (error) {
      console.error("Post creation error:", error);
      res.status(500).json({ error: "Failed to create post" });
    }
  }
);

// Delete post
app.delete("/api/posts/:id", requireAuth, async (req, res) => {
  try {
    // Find post in CSV to get slug and image path
    const posts = await readCSV();
    const post = posts.find((p) => p.id === req.params.id);

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Delete image if exists
    if (post.image) {
      try {
        const imagesBase = path.resolve(__dirname, "images", "blog");
        const candidate = path.resolve(__dirname, post.image);
        if (candidate.startsWith(imagesBase)) {
          await fs.unlink(candidate);
        }
      } catch (e) {
        console.warn("Failed to delete image:", e);
      }
    }

    // Delete HTML file
    try {
      const htmlPath = path.join(__dirname, "blog", `${post.id}.html`);
      await fs.unlink(htmlPath);
      console.log(`Deleted HTML file: ${post.id}.html`);
    } catch (e) {
      console.warn("Failed to delete HTML file:", e);
    }

    // Remove from CSV index
    await removeFromCSV(req.params.id);

    // Update blog/index.html to remove post link
    await updateBlogIndex();

    res.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ error: "Failed to delete post" });
  }
});

// Start server
ensureDirectories().then(() => {
  app.listen(PORT, () => {
    console.log(`Blog server running at http://localhost:${PORT}`);
  });
});
