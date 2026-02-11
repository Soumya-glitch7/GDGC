import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const NOTES_FILE = path.join(__dirname, 'my-notes.json');

// Middleware
app.use(express.urlencoded({ extended: true }));

// Load notes from file
function loadNotes() {
  if (!fs.existsSync(NOTES_FILE)) {
    fs.writeFileSync(NOTES_FILE, JSON.stringify([], null, 2));
    return [];
  }
  const data = fs.readFileSync(NOTES_FILE, 'utf-8');
  return JSON.parse(data);
}

// Save notes to file
function saveNotes(notes) {
  fs.writeFileSync(NOTES_FILE, JSON.stringify(notes, null, 2));
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Homepage
app.get('/', (req, res) => {
  const notes = loadNotes();
  
  let html = `
<!DOCTYPE html>
<html>
<head>
  <title>My Notes</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; padding: 0 20px; }
    input, textarea { width: 100%; padding: 8px; margin: 5px 0; box-sizing: border-box; font-family: Arial; }
    button { padding: 8px 16px; background: #007bff; color: white; border: none; cursor: pointer; }
    button:hover { background: #0056b3; }
    .note { border: 1px solid #ddd; padding: 10px; margin: 10px 0; }
    .note-title { font-weight: bold; }
    .note-content { margin: 5px 0; white-space: pre-wrap; word-break: break-word; }
    .note-actions { margin-top: 8px; }
    .note-actions a { margin-right: 10px; color: #007bff; text-decoration: none; font-size: 14px; }
    .note-actions a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>My Notes</h1>
  
  <form method="POST" action="/add-note">
    <input type="text" name="title" placeholder="Note title" required>
    <textarea name="content" placeholder="Note content" required></textarea>
    <button type="submit">Add Note</button>
  </form>
  
  <h2>Notes (${notes.length})</h2>
  `;

  if (notes.length === 0) {
    html += '<p>No notes yet.</p>';
  } else {
    notes.forEach((note, index) => {
      html += `
        <div class="note">
          <div class="note-title">${escapeHtml(note.title)}</div>
          <div class="note-content">${escapeHtml(note.content)}</div>
          <div class="note-actions">
            <a href="/edit/${index}">Edit</a>
            <a href="/delete/${index}" onclick="return confirm('Delete this note?')">Delete</a>
          </div>
        </div>
      `;
    });
  }

  html += `
</body>
</html>
  `;

  res.send(html);
});

// Add note
app.post('/add-note', (req, res) => {
  const { title, content } = req.body;
  
  if (!title || !content) {
    return res.redirect('/');
  }

  const notes = loadNotes();
  notes.unshift({
    title,
    content,
    createdAt: new Date().toISOString()
  });
  
  saveNotes(notes);
  res.redirect('/');
});

// Edit form
app.get('/edit/:id', (req, res) => {
  const notes = loadNotes();
  const id = parseInt(req.params.id);
  
  if (id < 0 || id >= notes.length) {
    return res.redirect('/');
  }

  const note = notes[id];
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Edit Note</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; padding: 0 20px; }
    input, textarea { width: 100%; padding: 8px; margin: 5px 0; box-sizing: border-box; font-family: Arial; }
    button { padding: 8px 16px; background: #007bff; color: white; border: none; cursor: pointer; }
    button:hover { background: #0056b3; }
    .button-group { margin-top: 10px; }
    .button-group a { margin-left: 10px; color: #007bff; text-decoration: none; }
    .button-group a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>Edit Note</h1>
  
  <form method="POST" action="/update/${id}">
    <input type="text" name="title" value="${escapeHtml(note.title)}" required>
    <textarea name="content" required>${escapeHtml(note.content)}</textarea>
    <div class="button-group">
      <button type="submit">Save</button>
      <a href="/">Cancel</a>
    </div>
  </form>
</body>
</html>
  `;

  res.send(html);
});

// Update note
app.post('/update/:id', (req, res) => {
  const { title, content } = req.body;
  const id = parseInt(req.params.id);
  
  if (!title || !content) {
    return res.redirect(`/edit/${id}`);
  }

  const notes = loadNotes();
  
  if (id < 0 || id >= notes.length) {
    return res.redirect('/');
  }

  notes[id] = {
    title,
    content,
    createdAt: notes[id].createdAt,
    updatedAt: new Date().toISOString()
  };

  saveNotes(notes);
  res.redirect('/');
});

// Delete note
app.get('/delete/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const notes = loadNotes();

  if (id >= 0 && id < notes.length) {
    notes.splice(id, 1);
    saveNotes(notes);
  }

  res.redirect('/');
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
