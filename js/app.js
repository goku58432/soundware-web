// ─── State ────────────────────────────────────────────────────────────────────
let allSongs = [];
let allGenres = [];
let myPlaylists = [];
let pendingRegEmail = '';
let addSongTarget = null;

// ─── Init ─────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  player.init();
  if (api.getToken() && api.getUser()) {
    initApp();
  } else {
    showAuthScreen();
  }
});

function showAuthScreen() {
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
}

async function initApp() {
  const user = api.getUser();
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');

  document.getElementById('sidebar-username').textContent = user.username;
  document.getElementById('welcome-name').textContent = user.full_name || user.username;
  document.getElementById('sidebar-role').textContent = user.is_admin ? 'Admin' : '';

  if (user.is_admin) {
    document.getElementById('admin-link').classList.remove('hidden');
  }

  await Promise.all([loadGenres(), loadSongs()]);
  showPage('home');
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
function showLogin()    { document.getElementById('login-form').classList.remove('hidden'); document.getElementById('register-form').classList.add('hidden'); document.getElementById('verify-form').classList.add('hidden'); }
function showRegister() { document.getElementById('register-form').classList.remove('hidden'); document.getElementById('login-form').classList.add('hidden'); document.getElementById('verify-form').classList.add('hidden'); }

async function login() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const err = document.getElementById('login-error');
  err.textContent = '';
  try {
    const data = await api.auth.login({ email, password });
    api.setAuth(data.access_token, data.user);
    initApp();
  } catch (e) {
    err.textContent = e.message;
  }
}

async function register() {
  const username = document.getElementById('reg-username').value.trim();
  const full_name = document.getElementById('reg-fullname').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const err = document.getElementById('reg-error');
  err.textContent = '';
  try {
    const data = await api.auth.register({ username, email, password, full_name });
    pendingRegEmail = email;
    document.getElementById('code-display').textContent = data.validation_code;
    document.getElementById('register-form').classList.add('hidden');
    document.getElementById('verify-form').classList.remove('hidden');
  } catch (e) {
    err.textContent = e.message;
  }
}

async function verify() {
  const code = document.getElementById('verify-code').value.trim().toUpperCase();
  const err = document.getElementById('verify-error');
  err.textContent = '';
  try {
    await api.auth.verify({ email: pendingRegEmail, code });
    showToast('✅ Cuenta verificada. ¡Inicia sesión!');
    showLogin();
  } catch (e) {
    err.textContent = e.message;
  }
}

function logout() {
  api.clearAuth();
  showAuthScreen();
  showLogin();
}

// ─── NAVIGATION ───────────────────────────────────────────────────────────────
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => { p.classList.remove('active'); p.classList.add('hidden'); });
  const page = document.getElementById(`page-${name}`);
  if (page) { page.classList.add('active'); page.classList.remove('hidden'); }

  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const nav = document.querySelector(`[onclick="showPage('${name}')"]`);
  if (nav) nav.classList.add('active');

  document.getElementById('recommendations-panel').classList.add('hidden');

  if (name === 'playlists') loadPlaylists();
  if (name === 'admin')     loadAdminSongs();
  if (name === 'library')   loadLibrary();
}

// ─── DATA LOADERS ─────────────────────────────────────────────────────────────
async function loadGenres() {
  try {
    allGenres = await api.songs.genres();
    renderGenres();
    populateGenreSelect();
  } catch {}
}

async function loadSongs() {
  try {
    const [popular, all] = await Promise.all([
      api.songs.popular(),
      api.songs.list({ limit: 100 })
    ]);
    allSongs = all;
    renderPopular(popular);
    renderAllSongs(all, 'all-songs');
  } catch {}
}

async function loadPlaylists() {
  try {
    myPlaylists = await api.playlists.mine();
    renderPlaylists();
  } catch {}
}

async function loadLibrary() {
  renderSongList(allSongs.slice(0, 30), 'library-content');
}

async function loadAdminSongs() {
  renderSongList(allSongs, 'admin-songs-list', true);
}

// ─── RENDER ───────────────────────────────────────────────────────────────────
function renderPopular(songs) {
  const el = document.getElementById('popular-songs');
  if (!el) return;
  el.innerHTML = songs.map(s => `
    <div class="song-card" onclick="playSong(${s.id})">
      <img src="${s.image_url || 'https://picsum.photos/seed/' + s.id + '/300/300'}" alt="${s.title}" class="song-card-img" loading="lazy">
      <div class="song-card-info">
        <div class="song-card-title">${s.title}</div>
        <div class="song-card-artist">${s.author}</div>
      </div>
    </div>
  `).join('');
}

function renderGenres() {
  const el = document.getElementById('genres-grid');
  if (!el) return;
  el.innerHTML = allGenres.map(g => `
    <div class="genre-card" style="background:${g.color}" onclick="filterByGenre(${g.id}, '${g.name}')">
      ${g.name}
    </div>
  `).join('');
}

function renderAllSongs(songs, containerId) {
  renderSongList(songs, containerId, false);
}

function renderSongList(songs, containerId, adminMode = false) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!songs.length) { el.innerHTML = '<p style="color:var(--text-muted);padding:1rem">No hay canciones</p>'; return; }
  el.innerHTML = songs.map((s, i) => `
    <div class="song-row" data-song-id="${s.id}" onclick="playSong(${s.id})">
      <div class="song-row-num">${i + 1}</div>
      <div class="song-row-info">
        <div class="song-row-title">${s.title}</div>
        <div class="song-row-artist">${s.author}${s.album ? ' · ' + s.album : ''}</div>
      </div>
      <div class="song-row-dur">${formatTime(s.duration)}</div>
      <div class="song-row-actions" onclick="event.stopPropagation()">
        <button class="action-btn" onclick="openAddToPlaylist(${s.id})" title="Agregar a playlist">➕</button>
        ${adminMode ? `<button class="action-btn" style="color:#ff6b6b" onclick="deleteSong(${s.id})" title="Eliminar">🗑</button>` : ''}
      </div>
    </div>
  `).join('');
}

function renderPlaylists() {
  const el = document.getElementById('playlists-grid');
  if (!el) return;
  if (!myPlaylists.length) { el.innerHTML = '<p style="color:var(--text-muted)">No tienes playlists aún. ¡Crea una!</p>'; return; }
  el.innerHTML = myPlaylists.map(p => `
    <div class="playlist-card" onclick="openPlaylist(${p.id})">
      <div class="playlist-card-cover">
        ${p.cover_url ? `<img src="${p.cover_url}" style="width:100%;height:100%;object-fit:cover">` : '🎵'}
      </div>
      <div class="playlist-card-info">
        <div class="playlist-card-name">${p.name}</div>
        <div class="playlist-card-meta">${p.songs.length} canciones</div>
      </div>
    </div>
  `).join('');
}

// ─── PLAYBACK ─────────────────────────────────────────────────────────────────
function playSong(id) {
  const song = allSongs.find(s => s.id === id);
  if (song) player.play(song, allSongs);
}

function filterByGenre(genreId, name) {
  const filtered = allSongs.filter(s => s.genre_id === genreId);
  showPage('search');
  document.getElementById('search-input').value = '';
  renderSongList(filtered, 'search-results');
  document.querySelector('#page-search h2')?.remove();
  const h = document.createElement('h2');
  h.style.cssText = 'font-family:var(--font-display);margin-bottom:1rem;';
  h.textContent = `Género: ${name}`;
  document.getElementById('search-results').before(h);
}

// ─── SEARCH ───────────────────────────────────────────────────────────────────
let searchTimeout;
async function searchSongs() {
  clearTimeout(searchTimeout);
  const q = document.getElementById('search-input').value.trim();
  if (!q) { document.getElementById('search-results').innerHTML = ''; return; }
  searchTimeout = setTimeout(async () => {
    try {
      const results = await api.songs.list({ search: q, limit: 50 });
      renderSongList(results, 'search-results');
    } catch {}
  }, 300);
}

// ─── PLAYLISTS ────────────────────────────────────────────────────────────────
function showCreatePlaylist()  { document.getElementById('create-playlist-form').classList.remove('hidden'); }
function hideCreatePlaylist()  { document.getElementById('create-playlist-form').classList.add('hidden'); }

async function createPlaylist() {
  const name = document.getElementById('pl-name').value.trim();
  if (!name) return showToast('Ingresa un nombre');
  const desc = document.getElementById('pl-desc').value.trim();
  try {
    await api.playlists.create({ name, description: desc, is_public: true });
    document.getElementById('pl-name').value = '';
    document.getElementById('pl-desc').value = '';
    hideCreatePlaylist();
    await loadPlaylists();
    showToast('✅ Playlist creada');
  } catch (e) { showToast('Error: ' + e.message); }
}

async function openPlaylist(id) {
  try {
    const pl = await api.playlists.get(id);
    document.getElementById('pd-cover').src = pl.cover_url || 'https://picsum.photos/seed/pl' + id + '/200/200';
    document.getElementById('pd-name').textContent = pl.name;
    document.getElementById('pd-desc').textContent = pl.description || '';
    document.getElementById('pd-count').textContent = `${pl.songs.length} canciones`;

    const container = document.getElementById('pd-songs');
    container.innerHTML = '';
    if (!pl.songs.length) {
      container.innerHTML = '<p style="color:var(--text-muted)">Esta playlist está vacía</p>';
    } else {
      pl.songs.forEach((s, i) => {
        const row = document.createElement('div');
        row.className = 'song-row';
        row.dataset.songId = s.id;
        row.innerHTML = `
          <div class="song-row-num">${i + 1}</div>
          <div class="song-row-info">
            <div class="song-row-title">${s.title}</div>
            <div class="song-row-artist">${s.author}</div>
          </div>
          <div class="song-row-dur">${formatTime(s.duration)}</div>
          <div class="song-row-actions" onclick="event.stopPropagation()">
            <button class="action-btn" style="color:#ff6b6b" onclick="removeSongFromPlaylist(${id},${s.id})">✕</button>
          </div>
        `;
        row.addEventListener('click', () => player.play(s, pl.songs));
        container.appendChild(row);
      });
    }

    showPage('playlist-detail');
  } catch (e) { showToast('Error cargando playlist'); }
}

async function removeSongFromPlaylist(plId, songId) {
  try {
    await api.playlists.removeSong(plId, songId);
    openPlaylist(plId);
    showToast('Canción eliminada');
  } catch (e) { showToast('Error: ' + e.message); }
}

// Add to playlist modal
function openAddToPlaylist(songId) {
  addSongTarget = songId;
  const el = document.getElementById('modal-playlists');
  if (!myPlaylists.length) {
    el.innerHTML = '<p style="color:var(--text-muted)">No tienes playlists. Crea una primero.</p>';
  } else {
    el.innerHTML = myPlaylists.map(p => `
      <div class="modal-pl-item" onclick="addToPlaylist(${p.id})">
        <span>${p.name}</span>
        <span style="color:var(--text-muted);font-size:0.8rem">${p.songs.length} canciones</span>
      </div>
    `).join('');
  }
  document.getElementById('add-to-playlist-modal').classList.remove('hidden');
}

async function addToPlaylist(plId) {
  closeModal();
  try {
    await api.playlists.addSong(plId, addSongTarget);
    showToast('✅ Canción agregada a la playlist');
    myPlaylists = await api.playlists.mine();
  } catch (e) { showToast('Error: ' + e.message); }
}

function closeModal() {
  document.getElementById('add-to-playlist-modal').classList.add('hidden');
  addSongTarget = null;
}

// ─── AI RECOMMENDATIONS ───────────────────────────────────────────────────────
async function loadRecommendations(songId) {
  try {
    const data = await api.ai.recommend(songId);
    const panel = document.getElementById('recommendations-panel');
    document.getElementById('recs-reason').textContent = data.reason;
    const container = document.getElementById('recs-songs');
    container.innerHTML = '';
    data.songs.forEach((s, i) => {
      const row = document.createElement('div');
      row.className = 'song-row';
      row.innerHTML = `
        <div class="song-row-num">${i + 1}</div>
        <div class="song-row-info">
          <div class="song-row-title">${s.title}</div>
          <div class="song-row-artist">${s.author}</div>
        </div>
        <div class="song-row-dur">${formatTime(s.duration)}</div>
      `;
      row.addEventListener('click', () => player.play(s, data.songs));
      container.appendChild(row);
    });
    if (data.songs.length) panel.classList.remove('hidden');
    setTimeout(() => panel.classList.add('hidden'), 15000);
  } catch {}
}

// ─── ADMIN ────────────────────────────────────────────────────────────────────
function showAdminTab(tab) {
  document.querySelectorAll('.admin-panel').forEach(p => p.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.remove('hidden');
  event.target.classList.add('active');
  if (tab === 'manage') loadAdminSongs();
}

function populateGenreSelect() {
  ['a-genre', 'edit-genre'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const first = id === 'a-genre' ? '<option value="">Seleccionar género</option>' : '';
    sel.innerHTML = first + allGenres.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
  });
}

// ── Preview helpers ────────────────────────────────────────────────────────
function updatePreviewMeta() {
  const title  = document.getElementById('a-title').value  || 'Título de la canción';
  const artist = document.getElementById('a-author').value || 'Artista';
  document.getElementById('preview-title').textContent  = title;
  document.getElementById('preview-artist').textContent = artist;
}

function updatePreviewGenre() {
  const sel   = document.getElementById('a-genre');
  const badge = document.getElementById('preview-genre-badge');
  if (!sel.value) { badge.style.display = 'none'; return; }
  const genre = allGenres.find(g => g.id == sel.value);
  if (genre) {
    badge.textContent   = genre.name;
    badge.style.display = 'inline-block';
    badge.style.background = genre.color;
    badge.style.color   = '#fff';
  }
}

function setPreviewImage(src) {
  const img  = document.getElementById('preview-img');
  const ph   = document.getElementById('preview-cover-placeholder');
  img.src    = src;
  img.style.display = 'block';
  ph.style.display  = 'none';
}

function setPreviewAudio(src) {
  const audio = document.getElementById('preview-audio');
  audio.src   = src;
  audio.style.display = 'block';
}

function setPreviewDuration(secs) {
  const display = document.getElementById('preview-duration');
  const badge   = document.getElementById('duration-display');
  const label   = formatTime(secs);
  display.textContent   = `⏱ ${label}`;
  display.style.display = 'block';
  badge.textContent     = label;
  badge.style.display   = 'inline-block';
  document.getElementById('a-duration').value = Math.round(secs);
}

function previewImageFromUrl() {
  const url = document.getElementById('a-image-url').value.trim();
  if (url) setPreviewImage(url);
}

function previewAudioFromUrl() {
  const url = document.getElementById('a-audio-url').value.trim();
  if (!url) return;
  setPreviewAudio(url);
  const tmp = new Audio(url);
  tmp.addEventListener('loadedmetadata', () => setPreviewDuration(tmp.duration));
}

function handleImageFileSelect(input) {
  const file = input.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  setPreviewImage(url);
}

function handleAudioFileSelect(input) {
  const file = input.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  setPreviewAudio(url);
  const nameEl = document.getElementById('audio-file-name');
  nameEl.textContent   = `📎 ${file.name}`;
  nameEl.style.display = 'block';
  const tmp = new Audio(url);
  tmp.addEventListener('loadedmetadata', () => setPreviewDuration(tmp.duration));
}

// ── Media tab switcher ─────────────────────────────────────────────────────
function switchMediaTab(type, mode) {
  document.getElementById(`${type}-url-panel`).style.display  = mode === 'url'  ? 'block' : 'none';
  document.getElementById(`${type}-file-panel`).style.display = mode === 'file' ? 'block' : 'none';
  document.getElementById(`${type}-tab-url`).classList.toggle('active',  mode === 'url');
  document.getElementById(`${type}-tab-file`).classList.toggle('active', mode === 'file');
}

// ── Drag & drop ────────────────────────────────────────────────────────────
function handleDragOver(e, zoneId) {
  e.preventDefault();
  document.getElementById(zoneId).classList.add('drag-over');
}
function handleDragLeave(zoneId) {
  document.getElementById(zoneId).classList.remove('drag-over');
}
function handleDrop(e, type) {
  e.preventDefault();
  document.getElementById(`${type}-drop`).classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (!file) return;
  const input = document.getElementById(`a-${type}-file`);
  const dt = new DataTransfer();
  dt.items.add(file);
  input.files = dt.files;
  if (type === 'audio') handleAudioFileSelect(input);
  if (type === 'image') handleImageFileSelect(input);
}

// ── Upload ─────────────────────────────────────────────────────────────────
async function uploadSong() {
  const msg = document.getElementById('upload-msg');
  msg.className = 'msg-box';
  msg.textContent = '';

  const title    = document.getElementById('a-title').value.trim();
  const author   = document.getElementById('a-author').value.trim();
  const album    = document.getElementById('a-album').value.trim();
  const date     = document.getElementById('a-date').value;
  const duration = parseFloat(document.getElementById('a-duration').value);
  const genreId  = document.getElementById('a-genre').value;
  const imageUrl = document.getElementById('a-image-url').value.trim();
  const audioUrl = document.getElementById('a-audio-url').value.trim();
  const imageFile = document.getElementById('a-image-file').files[0];
  const audioFile = document.getElementById('a-audio-file').files[0];

  if (!title || !author || !duration || !genreId) {
    msg.className = 'msg-box error';
    msg.textContent = '⚠️ Título, artista, duración y género son requeridos';
    return;
  }

  const btn = document.getElementById('upload-btn');
  btn.disabled = true;
  btn.textContent = '⏳ Subiendo...';

  const fd = new FormData();
  fd.append('title', title);
  fd.append('author', author);
  if (album)    fd.append('album', album);
  if (date)     fd.append('release_date', date);
  fd.append('duration', duration);
  fd.append('genre_id', genreId);
  if (imageUrl)  fd.append('image_url', imageUrl);
  if (audioUrl)  fd.append('audio_url', audioUrl);
  if (imageFile) fd.append('image_file', imageFile);
  if (audioFile) fd.append('audio_file', audioFile);

  try {
    await api.request('POST', '/api/songs/', fd, true);
    msg.className = 'msg-box success';
    msg.textContent = '✅ Canción subida exitosamente';
    allSongs = await api.songs.list({ limit: 100 });
    renderAllSongs(allSongs, 'all-songs');
    // Reset form
    ['a-title','a-author','a-album','a-duration','a-image-url','a-audio-url'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    document.getElementById('a-genre').value = '';
    document.getElementById('a-date').value  = '';
    document.getElementById('a-audio-file').value = '';
    document.getElementById('a-image-file').value = '';
    document.getElementById('audio-file-name').style.display = 'none';
    document.getElementById('preview-img').style.display     = 'none';
    document.getElementById('preview-cover-placeholder').style.display = 'block';
    document.getElementById('preview-audio').style.display   = 'none';
    document.getElementById('preview-duration').style.display = 'none';
    document.getElementById('duration-display').style.display = 'none';
    document.getElementById('preview-genre-badge').style.display = 'none';
    document.getElementById('preview-title').textContent  = 'Título de la canción';
    document.getElementById('preview-artist').textContent = 'Artista';
  } catch (e) {
    msg.className = 'msg-box error';
    msg.textContent = 'Error: ' + e.message;
  } finally {
    btn.disabled    = false;
    btn.textContent = '⬆️ Subir Canción';
  }
}

// ── Manage / Delete / Edit ─────────────────────────────────────────────────
async function loadAdminSongs() {
  const count = document.getElementById('admin-songs-count');
  if (count) count.textContent = `${allSongs.length} canciones`;
  renderAdminSongList(allSongs);
}

function filterAdminSongs() {
  const q = document.getElementById('admin-search').value.toLowerCase();
  const filtered = allSongs.filter(s =>
    s.title.toLowerCase().includes(q) || s.author.toLowerCase().includes(q)
  );
  renderAdminSongList(filtered);
}

function renderAdminSongList(songs) {
  const el = document.getElementById('admin-songs-list');
  if (!el) return;
  if (!songs.length) {
    el.innerHTML = '<p style="color:var(--text-muted);padding:1rem">No hay canciones</p>';
    return;
  }
  el.innerHTML = songs.map((s, i) => `
    <div class="song-row" data-song-id="${s.id}">
      <div class="song-row-num">${i + 1}</div>
      <div class="song-row-info">
        <div class="song-row-title">${s.title}</div>
        <div class="song-row-artist">${s.author}${s.album ? ' · ' + s.album : ''}</div>
      </div>
      <div class="song-row-dur">${formatTime(s.duration)}</div>
      <div class="song-row-actions admin-song-actions" onclick="event.stopPropagation()">
        <button class="action-btn" onclick="openEditModal(${s.id})" title="Editar" style="color:var(--accent)">✏️</button>
        <button class="action-btn" onclick="deleteSong(${s.id})" title="Eliminar" style="color:#ff6b6b">🗑</button>
      </div>
    </div>
  `).join('');
}

async function deleteSong(id) {
  if (!confirm('¿Eliminar esta canción?')) return;
  try {
    await api.songs.delete(id);
    allSongs = allSongs.filter(s => s.id !== id);
    loadAdminSongs();
    showToast('🗑 Canción eliminada');
  } catch (e) { showToast('Error: ' + e.message); }
}

function openEditModal(id) {
  const song = allSongs.find(s => s.id === id);
  if (!song) return;
  document.getElementById('edit-song-id').value    = id;
  document.getElementById('edit-title').value      = song.title   || '';
  document.getElementById('edit-author').value     = song.author  || '';
  document.getElementById('edit-album').value      = song.album   || '';
  document.getElementById('edit-audio-url').value  = song.audio_url  || '';
  document.getElementById('edit-image-url').value  = song.image_url  || '';
  document.getElementById('edit-duration').value   = song.duration   || '';
  document.getElementById('edit-date').value       = song.release_date || '';
  // Populate genre select
  const sel = document.getElementById('edit-genre');
  sel.innerHTML = allGenres.map(g =>
    `<option value="${g.id}" ${g.id === song.genre_id ? 'selected' : ''}>${g.name}</option>`
  ).join('');
  document.getElementById('edit-msg').textContent = '';
  document.getElementById('edit-msg').className   = 'msg-box';
  document.getElementById('edit-song-modal').classList.remove('hidden');
}

function closeEditModal() {
  document.getElementById('edit-song-modal').classList.add('hidden');
}

async function saveEditSong() {
  const id = document.getElementById('edit-song-id').value;
  const msg = document.getElementById('edit-msg');
  const payload = {
    title:        document.getElementById('edit-title').value.trim(),
    author:       document.getElementById('edit-author').value.trim(),
    album:        document.getElementById('edit-album').value.trim(),
    genre_id:     parseInt(document.getElementById('edit-genre').value),
    audio_url:    document.getElementById('edit-audio-url').value.trim(),
    image_url:    document.getElementById('edit-image-url').value.trim(),
    duration:     parseFloat(document.getElementById('edit-duration').value),
    release_date: document.getElementById('edit-date').value,
  };
  try {
    await api.songs.update(id, payload);
    // Update local cache
    const idx = allSongs.findIndex(s => s.id == id);
    if (idx >= 0) allSongs[idx] = { ...allSongs[idx], ...payload };
    msg.className   = 'msg-box success';
    msg.textContent = '✅ Cambios guardados';
    loadAdminSongs();
    renderAllSongs(allSongs, 'all-songs');
    setTimeout(closeEditModal, 1200);
  } catch (e) {
    msg.className   = 'msg-box error';
    msg.textContent = 'Error: ' + e.message;
  }
}

// ─── LIKE (local) ─────────────────────────────────────────────────────────────
let likedSongs = JSON.parse(localStorage.getItem('sw_liked') || '[]');
function toggleLike() {
  const song = player.queue[player.currentIndex];
  if (!song) return;
  const btn = document.getElementById('player-like');
  const idx = likedSongs.indexOf(song.id);
  if (idx >= 0) { likedSongs.splice(idx,1); btn.textContent='♡'; btn.classList.remove('liked'); }
  else           { likedSongs.push(song.id); btn.textContent='♥'; btn.classList.add('liked'); }
  localStorage.setItem('sw_liked', JSON.stringify(likedSongs));
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 3000);
}

// Close modal on backdrop click
document.getElementById('add-to-playlist-modal')?.addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeModal();
});
document.getElementById('edit-song-modal')?.addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeEditModal();
});
