# Alex Boyko - Personal Website

A minimal, early-internet (Y2K) style personal website with client-side blogging capabilities.

## Features

- **Y2K Aesthetic**: Late 90s/early 2000s design with Courier New monospace, Times New Roman headings, and classic web colors
- **Progress Bar Hero**: Loads to 500% productivity with engineer joke
- **Client-Side Blog**: Simple localStorage-based blog system (no backend required)
- **Admin Panel**: Add/delete blog posts directly from the site
- **GitHub Pages Ready**: Fully static, works on any static hosting

## Blog Admin Access

### Opening the Admin Panel

Press **`Ctrl + Shift + B`** on any page to open the blog admin panel.

### Default Passphrase

The default admin passphrase is: `alexboyko2026`

**Important**: Change this in [blog.js](blog.js) line 7:
```javascript
PASSPHRASE: 'your-new-passphrase-here',
```

### Using the Blog System

1. Press `Ctrl + Shift + B` to open admin panel
2. Enter your passphrase (first time only per browser session)
3. Fill in title, date, and content
4. Click "Publish" to add the post
5. Posts are stored in browser localStorage
6. Delete posts by clicking the "Delete" button (only visible when authenticated)
7. Click "Logout" to end your session

### Blog Data Storage

- All blog posts are stored in **localStorage** in your browser
- Storage key: `nexusboyko_blog_posts`
- Posts persist across page refreshes
- **Note**: Posts are browser-specific (not synced across devices)
- To backup posts: Use browser's localStorage inspector to export the data

## File Structure

```
/
├── index.html          # Main page with Y2K structure
├── index.css           # Y2K stylesheet
├── blog.js             # Blog system with localStorage
├── docs/               # Resume and documents
│   └── AlexanderBoyko_CV_Jan2025.pdf
├── images/             # Project screenshots and assets
└── .ARCHIVE/           # Backup of previous versions
    ├── index_backup.html
    └── index_backup.css
```

## Technologies

- Pure HTML5/CSS3/JavaScript (ES6+)
- No frameworks or build tools
- localStorage API for blog storage
- Responsive design for mobile

## Design Philosophy

This site embraces early-internet minimalism:
- Monospace fonts (Courier New)
- Serif headings (Times New Roman)
- Classic blue links (#0000EE)
- Simple borders and HR dividers
- No excessive animations or effects
- Fast, lightweight, accessible

## Deployment

This site is designed for GitHub Pages but works on any static host:

1. Push changes to your repository
2. Enable GitHub Pages in repository settings
3. Site will be live at `https://yourusername.github.io`

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires JavaScript for blog functionality
- Static content (work, projects) visible without JS

## Future Enhancements

Potential additions:
- Export/import blog posts (JSON)
- Edit existing posts
- Markdown support in post content
- Post permalinks with URL hashes
- Search/filter posts
- Tags/categories

## License

© 2026 Alex Boyko. Personal website.

---

**Pro tip**: The admin keyboard shortcut `Ctrl+Shift+B` is intentionally "hidden" to give the site a classic early-internet "power user" feel. Only those who know can post!
