/**
 * Notorious – API Layer
 * Centralized fetch wrapper with JWT auth injection
 */

const API_BASE = 'http://localhost:5000/api';

const API = {
  _getHeaders() {
    const token = localStorage.getItem('ff_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  },

  async _handle(res) {
    const data = await res.json();
    if (!res.ok || !data.success) {
      const err = new Error(data.message || `HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return data;
  },

  async get(path, params = {}) {
    const qs = Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : '';
    const res = await fetch(API_BASE + path + qs, { headers: this._getHeaders() });
    return this._handle(res);
  },

  async post(path, body = {}) {
    const res = await fetch(API_BASE + path, {
      method: 'POST', headers: this._getHeaders(), body: JSON.stringify(body)
    });
    return this._handle(res);
  },

  async put(path, body = {}) {
    const res = await fetch(API_BASE + path, {
      method: 'PUT', headers: this._getHeaders(), body: JSON.stringify(body)
    });
    return this._handle(res);
  },

  async delete(path) {
    const res = await fetch(API_BASE + path, { method: 'DELETE', headers: this._getHeaders() });
    return this._handle(res);
  },

  // Auth helpers
  getUser()     { try { return JSON.parse(localStorage.getItem('ff_user') || 'null'); } catch { return null; } },
  getToken()    { return localStorage.getItem('ff_token'); },
  isLoggedIn()  { return !!this.getToken(); },
  logout()      { localStorage.removeItem('ff_token'); localStorage.removeItem('ff_user'); window.location.href = 'login.html'; }
};

// Guard: redirect to login if not authenticated
function requireAuth() {
  if (!API.isLoggedIn()) { window.location.href = 'login.html'; return null; }
  return API.getUser();
}

// Toast notification system
const Toast = {
  container: null,
  init() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },
  show(message, type = 'info', duration = 4000) {
    this.init();
    const icons = { success: 'fa-check-circle', danger: 'fa-times-circle', info: 'fa-info-circle', warning: 'fa-exclamation-triangle' };
    const t = document.createElement('div');
    t.className = `toast-ff ${type}`;
    t.innerHTML = `<i class="fa ${icons[type] || 'fa-info-circle'}"></i> <span>${message}</span> <i class="fa fa-times toast-close"></i>`;
    t.querySelector('.toast-close').onclick = () => t.remove();
    this.container.appendChild(t);
    setTimeout(() => { t.style.animation = 'slideOut 0.3s ease forwards'; setTimeout(() => t.remove(), 300); }, duration);
  }
};

// Shared sidebar renderer
function renderSidebar(activePage) {
  const user = API.getUser();
  if (!user) return;

  const navItems = [
    { icon: '🏠', label: 'Dashboard',    href: 'dashboard.html',  key: 'dashboard', roles: ['admin', 'manager'] },
    { icon: '🚚', label: 'Trips',        href: 'trips.html',      key: 'trips',     roles: ['admin', 'manager', 'driver'] },
    { icon: '🗺️', label: 'Route Builder', href: 'builder.html',    key: 'builder',   roles: ['admin', 'manager'] },
    { icon: '⚙️', label: 'Rules & Alerts',href: 'rules.html',      key: 'rules',     roles: ['admin', 'manager'] },
    { icon: '💸', label: 'Expenses',     href: 'expenses.html',   key: 'expenses',  roles: ['admin', 'manager', 'driver'] },
    { icon: '📍', label: 'Live Tracker', href: 'execution.html',  key: 'execution', roles: ['admin', 'manager', 'driver'] },
    { icon: '📈', label: 'Analytics',    href: 'analytics.html',  key: 'analytics', roles: ['admin', 'manager', 'driver'] },
    { icon: '📋', label: 'Audit Logs',   href: 'logs.html',       key: 'logs',      roles: ['admin', 'manager'] },
  ];

  const allowedItems = navItems.filter(item => item.roles.includes(user.role));

  const initial = user.name ? user.name[0].toUpperCase() : 'U';
  const roleColors = { admin: 'var(--primary)', manager: 'var(--accent)', driver: 'var(--success)' };

  const sidebarEl = document.getElementById('sidebar');
  if (!sidebarEl) return;

  sidebarEl.innerHTML = `
    <div class="sidebar-logo">
      <div class="logo-icon">🚚</div>
      <div class="logo-text"><span>Notorious</span></div>
    </div>
    <nav class="sidebar-nav">
      <div class="nav-section-title">Navigation</div>
      ${allowedItems.map(item => `
        <a href="${item.href}" class="nav-link ${activePage === item.key ? 'active' : ''}">
          <span class="nav-icon">${item.icon}</span>
          <span>${item.label}</span>
        </a>
      `).join('')}
    </nav>
    <div class="sidebar-footer">
      <div class="user-card" onclick="if(confirm('Sign out?'))API.logout()">
        <div class="user-avatar" style="background:${roleColors[user.role] || 'var(--primary)'};">${initial}</div>
        <div class="user-info">
          <div class="user-name">${user.name}</div>
          <div class="user-role">
            <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${roleColors[user.role]};margin-right:4px;"></span>
            ${user.role}
          </div>
        </div>
        <i class="fa fa-sign-out-alt ms-auto" style="color:var(--text-dim);font-size:0.85rem;"></i>
      </div>
    </div>
  `;
}

// Format date helper
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fmtDuration(ms) {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms/1000).toFixed(2)}s`;
}

// Status badge helper
function statusBadge(status) {
  const map = {
    success:  'badge-success',
    failed:   'badge-danger',
    running:  'badge-cyan',
    pending:  'badge-warning',
    paused:   'badge-orange',
    info:     'badge-info',
    skipped:  'badge-purple',
    failure:  'badge-danger'
  };
  return `<span class="badge-pill ${map[status] || 'badge-info'}">
    <span class="status-dot ${status === 'success' ? 'success' : (status === 'failed' || status === 'failure') ? 'danger' : status === 'running' ? 'running' : 'warning'}"></span>
    ${status || 'unknown'}
  </span>`;
}

function typeBadge(type) {
  const map = { task: 'type-task', approval: 'type-approval', notification: 'type-notification' };
  const icons = { task: '⚙️', approval: '✅', notification: '🔔' };
  return `<span class="badge-pill ${map[type] || 'badge-info'}">${icons[type] || ''} ${type || ''}</span>`;
}
