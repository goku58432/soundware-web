// ─── Player State ─────────────────────────────────────────────────────────────
const player = {
  queue: [],
  currentIndex: -1,
  isPlaying: false,
  audio: null,

  init() {
    this.audio = document.getElementById('audio-element');
    this.audio.volume = 0.8;
    this.audio.addEventListener('timeupdate', () => this.updateProgress());
    this.audio.addEventListener('ended', () => this.nextSong());
    this.audio.addEventListener('loadedmetadata', () => this.updateDuration());
    this.audio.addEventListener('error', () => {
      showToast('⚠️ No se pudo cargar el audio');
      this.isPlaying = false;
      document.getElementById('play-btn').textContent = '▶';
    });
  },

  loadSong(song, autoplay = true) {
    this.audio.src = song.audio_url || '';
    document.getElementById('player-img').src = song.image_url || 'https://picsum.photos/seed/default/60/60';
    document.getElementById('player-title').textContent = song.title;
    document.getElementById('player-artist').textContent = song.author;
    document.getElementById('progress-fill').style.width = '0%';
    document.getElementById('current-time').textContent = '0:00';
    document.getElementById('duration-time').textContent = formatTime(song.duration);

    if (autoplay) {
      this.audio.play().then(() => {
        this.isPlaying = true;
        document.getElementById('play-btn').textContent = '⏸';
      }).catch(() => {
        showToast('▶ Haz clic en play para reproducir');
      });
    }

    // Highlight playing row
    document.querySelectorAll('.song-row').forEach(r => r.classList.remove('playing'));
    const row = document.querySelector(`[data-song-id="${song.id}"]`);
    if (row) row.classList.add('playing');

    // Register play in backend
    if (api.getToken()) {
      api.songs.play(song.id).catch(() => {});
    }

    // Load AI recommendations
    setTimeout(() => loadRecommendations(song.id), 1000);
  },

  play(song, queue = null) {
    if (queue) this.queue = queue;
    const idx = this.queue.findIndex(s => s.id === song.id);
    this.currentIndex = idx >= 0 ? idx : 0;
    this.loadSong(song);
  },

  togglePlay() {
    if (!this.audio.src) return;
    if (this.isPlaying) {
      this.audio.pause();
      this.isPlaying = false;
      document.getElementById('play-btn').textContent = '▶';
    } else {
      this.audio.play().then(() => {
        this.isPlaying = true;
        document.getElementById('play-btn').textContent = '⏸';
      });
    }
  },

  nextSong() {
    if (this.queue.length === 0) return;
    this.currentIndex = (this.currentIndex + 1) % this.queue.length;
    this.loadSong(this.queue[this.currentIndex]);
  },

  prevSong() {
    if (this.queue.length === 0) return;
    if (this.audio.currentTime > 3) {
      this.audio.currentTime = 0;
      return;
    }
    this.currentIndex = (this.currentIndex - 1 + this.queue.length) % this.queue.length;
    this.loadSong(this.queue[this.currentIndex]);
  },

  updateProgress() {
    if (!this.audio.duration) return;
    const pct = (this.audio.currentTime / this.audio.duration) * 100;
    document.getElementById('progress-fill').style.width = `${pct}%`;
    document.getElementById('current-time').textContent = formatTime(this.audio.currentTime);
  },

  updateDuration() {
    document.getElementById('duration-time').textContent = formatTime(this.audio.duration);
  },

  seek(e) {
    const bar = document.getElementById('progress-bar');
    const rect = bar.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    if (this.audio.duration) {
      this.audio.currentTime = ratio * this.audio.duration;
    }
  },

  setVolume(v) {
    this.audio.volume = parseFloat(v);
  }
};

function formatTime(secs) {
  if (!secs || isNaN(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// Global player controls (called from HTML)
function togglePlay() { player.togglePlay(); }
function nextSong()   { player.nextSong(); }
function prevSong()   { player.prevSong(); }
function seekTo(e)    { player.seek(e); }
function setVolume(v) { player.setVolume(v); }
