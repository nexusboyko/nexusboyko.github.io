// Load OverType in the browser (ES module) or fall back to simple contenteditable sync.
function loadOvertypeAndInit() {
  const editorEl = document.getElementById("editor");
  const hiddenTa = document.getElementById("content");

  function fallbackSync() {
    if (!editorEl) return;
    // Make the editor editable and sync changes into the hidden textarea
    editorEl.contentEditable = "true";
    editorEl.setAttribute("role", "textbox");
    editorEl.setAttribute("tabindex", "0");
    if (hiddenTa) hiddenTa.value = editorEl.innerHTML || hiddenTa.value || "";
    editorEl.addEventListener("input", () => {
      const v = editorEl.innerHTML;
      console.log("editor value:", v);
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
            window.toolbarButtons.link,
          ].filter(Boolean);
          toolbarOptions.toolbar = true;
        } else {
          toolbarOptions.toolbar = true;
        }

        const [editor] = new window.OverType(
          "#editor",
          Object.assign(
            {
              placeholder: "New post…",
              value: hiddenTa ? hiddenTa.value : "",
              onChange: (value) => {
                console.log("editor value:", value);
                if (hiddenTa) hiddenTa.value = value;
              }
            },
            toolbarOptions
          )
        );

        // Customize the editor textarea after initialization
        const textarea = editorEl.querySelector('textarea.overtype-input');
        if (textarea) {
          textarea.style.padding = '0px';
          textarea.style.margin = '0';
          textarea.style.minHeight = '400px';
          textarea.style.fontSize = '10px';
          textarea.style.lineHeight = '1.5';
        }
        // expose instance for later use (submit/export)
        window.overtypeEditor = editor;
        return;
      } catch (err) {
        console.warn("OverType initialization failed, falling back:", err);
        fallbackSync();
        return;
      }
    }

    if (attempts < 25) {
      setTimeout(tryInit, 200);
    } else {
      // give up and use fallback
      console.warn(
        "OverType not available; using simple contenteditable sync."
      );
      fallbackSync();
    }
  }

  tryInit();
}

// Compute API base for admin operations only
const API_BASE = (function () {
  if (window.API_BASE) return window.API_BASE;
  const proto =
    window.location.protocol === "file:" ? "http:" : window.location.protocol;
  const host = window.location.hostname || "localhost";
  const port = window.location.port;
  // If page is served from the API server (port 3001) or same origin, use relative paths.
  if (port === "3001" || port === "") return "";
  // Otherwise, call the local API server on port 3001.
  return `${proto}//${host}:3001`;
})();
console.info("Using API base for admin:", API_BASE || "(same origin)");

async function deletePost(id) {
  if (!confirm("Delete this post?")) return;
  const token = localStorage.getItem("blog_token");
  await fetch(`${API_BASE}/api/posts/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  // Post list is updated by server in index.html - page refresh needed
  window.location.reload();
}

function esc(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Admin
function toggleAdmin() {
  const admin = document.getElementById("admin");
  const adminDelete = document.getElementById("admin-del");
  const isVisible = admin && admin.style.display === "block";

  if (isVisible) {
    // Logout: hide panel and clear token
    admin.style.display = "none";
    adminDelete.style.display = "none";
    localStorage.removeItem("blog_token");
    return;
  }

  // Login flow
  if (!localStorage.getItem("blog_token")) {
    const pass = prompt("Password:");
    if (!pass) return; // cancelled
    localStorage.setItem("blog_token", pass);
  }

  if (admin) {
    admin.style.display = "block";
    adminDelete.style.display = "block";
  }
  const editor = document.getElementById("editor");
  if (editor) editor.focus();
}

document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.shiftKey && e.key === "B") {
    e.preventDefault();
    toggleAdmin();
  }
});

document.getElementById("cancel")?.addEventListener("click", () => {
  const form = document.getElementById("post-form");
  form.reset?.();
  const editor = document.getElementById("editor");
  if (editor) editor.innerHTML = "";
  // Keep panel open if logged in, just clear the form
});
document.getElementById("post-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData();
  formData.append("title", document.getElementById("title").value);
  // Ensure hidden textarea has latest content from editor (if present)
  const hiddenTa = document.getElementById("content");
  // If OverType instance exists, prefer its markdown value.
  if (
    window.overtypeEditor &&
    typeof window.overtypeEditor.getValue === "function"
  ) {
    const md = window.overtypeEditor.getValue();
    if (hiddenTa) hiddenTa.value = md;
    formData.append("content", md);
  } else {
    // fallback: use hidden textarea (which may have been synced from contenteditable)
    const editorEl = document.getElementById("editor");
    if (editorEl && hiddenTa && !hiddenTa.value)
      hiddenTa.value = editorEl.innerHTML;
    formData.append("content", hiddenTa ? hiddenTa.value : "");
  }

  const img = document.getElementById("image").files[0];
  if (img) formData.append("image", img);

  const token = localStorage.getItem("blog_token");

  try {
    const response = await fetch(`${API_BASE}/api/posts`, {
      method: "POST",
      body: formData,
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      console.error("Failed to create post:", response.status, error);
      alert(`Failed to create post: ${error.error || response.statusText}`);
      return;
    }

    const result = await response.json();
    console.log("Post created successfully:", result);

    // Post list is updated by server in index.html - page refresh needed
    window.location.reload();
  } catch (err) {
    console.error("Error creating post:", err);
    alert(`Error: ${err.message}`);
  }
});

// Mobile / touch-friendly admin activation: hidden trigger button + multi-click header
const adminTrigger = document.getElementById("admin-trigger");
if (adminTrigger) {
  adminTrigger.addEventListener("click", (ev) => {
    ev.preventDefault();
    toggleAdmin();
  });
}

let headerClickCount = 0;
let headerClickTimer = null;
const headerEl = document.getElementById("site-header");
if (headerEl) {
  headerEl.addEventListener("click", () => {
    headerClickCount++;
    if (headerClickTimer) clearTimeout(headerClickTimer);
    headerClickTimer = setTimeout(() => {
      headerClickCount = 0;
    }, 4000);
    if (headerClickCount >= 5) {
      headerClickCount = 0;
      toggleAdmin();
    }
  });
}

// initialize overtype or fallback sync after DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadOvertypeAndInit);
} else {
  loadOvertypeAndInit();
}

// Auto-show admin panel if already logged in
if (localStorage.getItem("blog_token")) {
  const admin = document.getElementById("admin");
  const adminDelete = document.getElementById("admin-del");

  if (admin) {
    admin.style.display = "block";
    adminDelete.style.display = "block";
  }
}
