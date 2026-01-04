// Migration script to add slugs to existing posts and generate HTML files
const fs = require('fs').promises;
const path = require('path');

function generateSlug(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function escapeHTML(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

function convertMarkdownToHTML(markdownContent) {
  let html = markdownContent
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    // Links
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
    // Lists - unordered
    .replace(/^\s*[-*]\s+(.+)$/gm, '<li>$1</li>')
    // Lists - ordered
    .replace(/^\s*\d+\.\s+(.+)$/gm, '<li>$1</li>');

  // Wrap list items in ul/ol
  const lines = html.split('\n');
  const result = [];
  let inList = false;
  let listType = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes('<li>')) {
      // Determine list type from original markdown
      const originalLine = markdownContent.split('\n')[i];
      const currentListType = originalLine.match(/^\s*\d+\./) ? 'ol' : 'ul';

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

  return result.join('\n');
}

async function generatePostHTML(post) {
  const blogDir = path.join(__dirname, 'blog');
  await fs.mkdir(blogDir, { recursive: true });

  const renderedContent = convertMarkdownToHTML(post.content || '');
  const formattedDate = new Date(post.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const imageHTML = post.image
    ? `<p><img src="../${post.image}" style="max-width:100%;margin:1rem 0;" alt="${escapeHTML(post.title)}"></p>`
    : '';

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
  <p><small>${formattedDate}</small></p>

  <nav>
    <a href="index.html">← Blog</a>
  </nav>

  <section>
    <h2>-</h2>
    ${imageHTML}
    <div>${renderedContent}</div>
  </section>
</body>
</html>`;

  await fs.writeFile(
    path.join(blogDir, `${post.slug}.html`),
    html,
    'utf8'
  );
}

async function migrateExistingPosts() {
  const postsDir = path.join(__dirname, 'posts');
  const blogDir = path.join(__dirname, 'blog');

  // Create directory if it doesn't exist
  await fs.mkdir(blogDir, { recursive: true });

  const files = await fs.readdir(postsDir);
  const jsonFiles = files.filter(f => f.endsWith('.json'));

  console.log(`Found ${jsonFiles.length} posts to migrate`);

  for (const file of jsonFiles) {
    const content = await fs.readFile(path.join(postsDir, file), 'utf8');
    const post = JSON.parse(content);

    // Add slug if missing
    if (!post.slug) {
      post.slug = generateSlug(post.title || `post-${post.id}`);

      // Update JSON file with slug
      await fs.writeFile(
        path.join(postsDir, file),
        JSON.stringify(post, null, 2)
      );

      console.log(`✓ Added slug "${post.slug}" to ${file}`);
    } else {
      console.log(`  Post ${file} already has slug: "${post.slug}"`);
    }

    // Generate HTML file
    await generatePostHTML(post);
    console.log(`✓ Generated HTML for "${post.title}"`);
  }

  console.log('\n✨ Migration complete!');
}

migrateExistingPosts().catch(console.error);
