/* VENDOR BRIDGE - shared client helpers */
const VB = {
  tokenKey: 'vb_token',
  userKey: 'vb_user',

  getToken() {
    return localStorage.getItem(this.tokenKey) || sessionStorage.getItem(this.tokenKey);
  },
  getUser() {
    const raw = localStorage.getItem(this.userKey) || sessionStorage.getItem(this.userKey);
    return raw ? JSON.parse(raw) : null;
  },
  setAuth(token, user, remember) {
    const store = remember ? localStorage : sessionStorage;
    store.setItem(this.tokenKey, token);
    store.setItem(this.userKey, JSON.stringify(user));
  },
  clearAuth() {
    [localStorage, sessionStorage].forEach((s) => {
      s.removeItem(this.tokenKey);
      s.removeItem(this.userKey);
    });
  },

  /** Core fetch wrapper. Returns parsed JSON; throws Error(message) on failure. */
  async request(method, url, body, isForm) {
    const headers = {};
    const token = this.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    let payload;
    if (body && !isForm) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    } else {
      payload = body;
    }

    const res = await fetch(`/api${url}`, { method, headers, body: payload });

    // Auto-logout on invalid/expired token
    if (res.status === 401 && token) {
      this.clearAuth();
      if (!location.pathname.endsWith('index.html') && location.pathname !== '/') {
        location.href = 'index.html';
      }
    }

    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      if (!res.ok) throw new Error('Request failed');
      return res;
    }
    const data = await res.json();
    if (!res.ok || data.success === false) {
      throw new Error(data.message || 'Something went wrong');
    }
    return data;
  },

  get(url) { return this.request('GET', url); },
  post(url, body) { return this.request('POST', url, body); },
  put(url, body) { return this.request('PUT', url, body); },
  del(url) { return this.request('DELETE', url); },

  /** Toast notifications */
  toast(message, type = 'success', title) {
    let stack = document.querySelector('.toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'toast-stack';
      document.body.appendChild(stack);
    }
    const el = document.createElement('div');
    el.className = `vb-toast ${type}`;
    el.innerHTML = `<div class="tt">${title || (type === 'error' ? 'Error' : 'Success')}</div><div class="tm">${message}</div>`;
    stack.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(40px)'; }, 3200);
    setTimeout(() => el.remove(), 3600);
  },

  /** Format Indian Rupees */
  inr(n) {
    return '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  },
  date(d) {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  },
  dateTime(d) {
    if (!d) return '-';
    return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  },
  timeAgo(d) {
    const s = Math.floor((Date.now() - new Date(d)) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  },
  escape(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },
  statusClass(s) {
    return 's-' + String(s || '').toLowerCase().replace(/\s+/g, '-');
  },
  badge(s) {
    return `<span class="badge-soft ${this.statusClass(s)}">${this.escape(s)}</span>`;
  },
  stars(rating) {
    const r = Math.round(rating || 0);
    return `<span class="stars">${'★'.repeat(r)}${'☆'.repeat(5 - r)}</span>`;
  },
};
