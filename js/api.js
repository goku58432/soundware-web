// ─── API Configuration ───────────────────────────────────────────────────────
const API_BASE = window.API_BASE || 'https://backend-souware-production.up.railway.app';

let _token = localStorage.getItem('sw_token');
let _user  = JSON.parse(localStorage.getItem('sw_user') || 'null');

const api = {
  // ── Internals ──────────────────────────────────────────────────────────────
  getToken() { return _token; },
  getUser()  { return _user; },
  setAuth(token, user) {
    _token = token; _user = user;
    localStorage.setItem('sw_token', token);
    localStorage.setItem('sw_user', JSON.stringify(user));
  },
  clearAuth() {
    _token = null; _user = null;
    localStorage.removeItem('sw_token');
    localStorage.removeItem('sw_user');
  },

  async request(method, path, body = null, isFormData = false) {
    const headers = {};
    if (_token) headers['Authorization'] = `Bearer ${_token}`;
    if (!isFormData && body) headers['Content-Type'] = 'application/json';

    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: isFormData ? body : (body ? JSON.stringify(body) : null)
    });

    if (res.status === 204) return null;
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Request failed');
    return data;
  },

  get:    (p)    => api.request('GET',    p),
  post:   (p, b) => api.request('POST',   p, b),
  put:    (p, b) => api.request('PUT',    p, b),
  delete: (p)    => api.request('DELETE', p),

// ── Auth ───────────────────────────────────────────────────────────────────
  auth: {
    register: (d) => api.post('/api/auth/register', d),
    verify:   (d) => api.post('/api/auth/verify', d),
    login:    (d) => api.post('/api/auth/login', d),
  },

  // ── Users ──────────────────────────────────────────────────────────────────
  users: {
    me:     ()  => api.get('/api/users/me'),
    update: (d) => api.put('/api/users/me', d),
  },

  // ── Songs ──────────────────────────────────────────────────────────────────
  songs: {
    list:    (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return api.get(`/api/songs/?${q}`);
    },
    get:     (id) => api.get(`/api/songs/${id}`),
    popular: ()   => api.get('/api/songs/top/popular'),
    play:    (id) => api.post(`/api/songs/${id}/play`),
    create:  (fd) => api.request('POST', '/api/songs/', fd, true),
    update:  (id, d) => api.put(`/api/songs/${id}`, d),
    delete:  (id) => api.delete(`/api/songs/${id}`),
    genres:  ()   => api.get('/api/songs/genres'),
  },

  // ── Playlists ──────────────────────────────────────────────────────────────
  playlists: {
    mine:      ()    => api.get('/api/playlists/'),
    get:       (id)  => api.get(`/api/playlists/${id}`),
    create:    (d)   => api.post('/api/playlists/', d),
    update:    (id, d) => api.put(`/api/playlists/${id}`, d),
    delete:    (id)  => api.delete(`/api/playlists/${id}`),
    addSong:   (plId, songId) => api.post(`/api/playlists/${plId}/songs`, { song_id: songId }),
    removeSong:(plId, songId) => api.delete(`/api/playlists/${plId}/songs/${songId}`),
  },

  // ── AI ─────────────────────────────────────────────────────────────────────
  ai: {
    recommend: (songId) => api.get(`/api/ai/recommendations/${songId}`),
  }
};
