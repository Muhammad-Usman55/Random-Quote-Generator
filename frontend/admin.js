/* ============================================================
   admin.js — Admin panel controller
   ============================================================ */

'use strict';

// ── Token storage (sessionStorage — clears on tab close) ──────────────────────
const ADMIN_TOKEN_KEY = 'qg_admin_token';

function getToken()       { return sessionStorage.getItem(ADMIN_TOKEN_KEY); }
function setToken(t)      { sessionStorage.setItem(ADMIN_TOKEN_KEY, t); }
function clearToken()     { sessionStorage.removeItem(ADMIN_TOKEN_KEY); }
function isLoggedIn()     { return !!getToken(); }

function authHeaders() {
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` };
}

async function adminFetch(url, opts = {}) {
    const res = await fetch(url, {
        ...opts,
        headers: { ...authHeaders(), ...(opts.headers || {}) },
    });
    if (res.status === 403 || res.status === 401) {
        clearToken();
        showLogin();
        throw new Error('Session expired. Please log in again.');
    }
    return res;
}

// ── Screen switching ──────────────────────────────────────────────────────────
function showLogin() {
    document.getElementById('login-screen').hidden = false;
    document.getElementById('dashboard').hidden = true;
}

function showDashboard() {
    document.getElementById('login-screen').hidden = true;
    document.getElementById('dashboard').hidden = false;
    loadOverview();
    loadUnreadBadge();
}

// ── Theme toggle ──────────────────────────────────────────────────────────────
(function initTheme() {
    const btn  = document.getElementById('theme-toggle-admin');
    const icon = btn ? btn.querySelector('i') : null;

    function apply(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        if (!icon) return;
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    const saved = localStorage.getItem('theme');
    if (saved) apply(saved);

    if (btn) btn.addEventListener('click', () => {
        const cur = document.documentElement.getAttribute('data-theme') || 'light';
        const next = cur === 'dark' ? 'light' : 'dark';
        localStorage.setItem('theme', next);
        apply(next);
        // Re-draw charts so they pick up new colours
        if (chartsDrawn) drawCharts();
    });
})();

// ── Login ─────────────────────────────────────────────────────────────────────
document.getElementById('admin-login-btn').addEventListener('click', doLogin);
document.getElementById('admin-uname').addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
});
document.getElementById('admin-pw').addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
});

async function doLogin() {
    const uname = document.getElementById('admin-uname').value.trim();
    const pw    = document.getElementById('admin-pw').value;
    const btn   = document.getElementById('admin-login-btn');
    const err   = document.getElementById('login-err');

    err.hidden = true;
    if (!uname) { showErr(err, 'Please enter the admin username.'); return; }
    if (!pw)    { showErr(err, 'Please enter the admin password.'); return; }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying…';

    try {
        const res  = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: uname, password: pw }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Invalid credentials.');
        setToken(data.access_token);
        document.getElementById('admin-uname').value = '';
        document.getElementById('admin-pw').value = '';
        showDashboard();
    } catch (e) {
        showErr(err, e.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Log In to Admin Panel';
    }
}

function showErr(el, msg) {
    el.textContent = msg;
    el.hidden = false;
}

// ── Logout ────────────────────────────────────────────────────────────────────
document.getElementById('admin-logout-btn').addEventListener('click', () => {
    clearToken();
    showLogin();
});

// ── Tab navigation ────────────────────────────────────────────────────────────
const tabLoaded = { overview: false, users: false, quotes: false, messages: false, settings: false };

document.querySelectorAll('.admin-tab').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.admin-tab').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.dataset.tab;
        document.getElementById(`tab-${tab}`).classList.add('active');
        if (!tabLoaded[tab]) {
            tabLoaded[tab] = true;
            if (tab === 'users')    loadUsers();
            if (tab === 'quotes')   loadQuotes();
            if (tab === 'messages') loadMessages();
            if (tab === 'settings') loadSettings();
        }
    });
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n) { return Number(n).toLocaleString(); }

function fmtDate(dt) {
    if (!dt) return '—';
    return new Date(dt.endsWith('Z') ? dt : dt + 'Z').toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
    });
}

function isDark() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
}

function chartColors(n) {
    const palette = [
        '#4a90e2','#6c5ce7','#e84393','#f39c12','#2ecc71',
        '#1abc9c','#e74c3c','#9b59b6','#3498db','#e67e22',
        '#1dd3b0','#f72585','#ffd60a','#48cae4',
    ];
    return Array.from({ length: n }, (_, i) => palette[i % palette.length]);
}

function gridColor() {
    return isDark() ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
}

function textColor() {
    return isDark() ? '#94a3b8' : '#64748b';
}

function buildPagination(containerId, page, pages, onPage) {
    const wrap = document.getElementById(containerId);
    wrap.innerHTML = '';
    if (pages <= 1) return;

    const info = document.createElement('span');
    info.className = 'pagination-info';
    info.textContent = `Page ${page} of ${pages}`;
    wrap.appendChild(info);

    function makeBtn(label, targetPage, disabled, active) {
        const b = document.createElement('button');
        b.className = 'page-btn' + (active ? ' active' : '');
        b.textContent = label;
        b.disabled = disabled;
        b.addEventListener('click', () => onPage(targetPage));
        return b;
    }

    wrap.appendChild(makeBtn('‹', page - 1, page <= 1, false));

    const start = Math.max(1, page - 2);
    const end   = Math.min(pages, page + 2);
    for (let i = start; i <= end; i++) {
        wrap.appendChild(makeBtn(String(i), i, false, i === page));
    }

    wrap.appendChild(makeBtn('›', page + 1, page >= pages, false));
}

// ── OVERVIEW ──────────────────────────────────────────────────────────────────
let chartsDrawn = false;
let chartInstances = {};

async function loadOverview() {
    try {
        const res  = await adminFetch('/api/admin/stats');
        const data = await res.json();

        document.getElementById('s-total-users').textContent = fmt(data.total_users);
        document.getElementById('s-new-users').textContent =
            `+${data.new_users_today} today  ·  +${data.new_users_week} this week`;
        document.getElementById('s-verified').textContent = fmt(data.verified_users);
        document.getElementById('s-providers').textContent =
            `${data.google_users} Google  ·  ${data.local_users} Local`;
        document.getElementById('s-db-quotes').textContent = fmt(data.total_quotes_db);
        document.getElementById('s-saved').textContent = fmt(data.total_saved_quotes);
        document.getElementById('s-liked').textContent =
            `${fmt(data.total_liked_quotes)} liked`;
        document.getElementById('s-msgs').textContent = fmt(data.total_contact_messages);
        document.getElementById('s-unread').textContent =
            data.unread_contact_messages
                ? `${data.unread_contact_messages} unread`
                : 'All read';

        updateUnreadBadge(data.unread_contact_messages);
    } catch (e) {
        console.error('Stats error:', e);
    }

    await drawCharts();
    chartsDrawn = true;
}

async function drawCharts() {
    // Destroy existing chart instances before redrawing
    Object.values(chartInstances).forEach(c => c.destroy());
    chartInstances = {};

    const [regData, savedData, authorsData, moodsData, topicsData] = await Promise.all([
        adminFetch('/api/admin/charts/registrations').then(r => r.json()),
        adminFetch('/api/admin/charts/saved-activity').then(r => r.json()),
        adminFetch('/api/admin/charts/top-authors').then(r => r.json()),
        adminFetch('/api/admin/charts/moods').then(r => r.json()),
        adminFetch('/api/admin/charts/topics').then(r => r.json()),
    ]);

    const gc     = gridColor();
    const tc     = textColor();
    const accent = '#4a90e2';

    // Registrations — line chart
    chartInstances.reg = new Chart(document.getElementById('chart-reg'), {
        type: 'line',
        data: {
            labels: regData.map(d => d.date.slice(5)),
            datasets: [{
                label: 'New Users',
                data: regData.map(d => d.count),
                borderColor: accent,
                backgroundColor: 'rgba(74,144,226,0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 3,
                pointHoverRadius: 5,
            }],
        },
        options: _lineBarOpts(tc, gc, 'New Users'),
    });

    // Saved Activity — bar chart
    chartInstances.saved = new Chart(document.getElementById('chart-saved'), {
        type: 'bar',
        data: {
            labels: savedData.map(d => d.date.slice(5)),
            datasets: [{
                label: 'Saves',
                data: savedData.map(d => d.count),
                backgroundColor: 'rgba(108,92,231,0.7)',
                borderRadius: 5,
            }],
        },
        options: _lineBarOpts(tc, gc, 'Saves'),
    });

    // Top Authors — horizontal bar
    const authorColors = chartColors(authorsData.length);
    chartInstances.authors = new Chart(document.getElementById('chart-authors'), {
        type: 'bar',
        data: {
            labels: authorsData.map(d => d.author),
            datasets: [{
                label: 'Times Saved',
                data: authorsData.map(d => d.count),
                backgroundColor: authorColors,
                borderRadius: 4,
            }],
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: gc }, ticks: { color: tc } },
                y: { grid: { display: false }, ticks: { color: tc, font: { size: 11 } } },
            },
        },
    });

    // Moods — doughnut
    chartInstances.moods = new Chart(document.getElementById('chart-moods'), {
        type: 'doughnut',
        data: {
            labels: moodsData.map(d => d.mood),
            datasets: [{ data: moodsData.map(d => d.count), backgroundColor: chartColors(moodsData.length), borderWidth: 0 }],
        },
        options: _doughnutOpts(tc),
    });

    // Topics — doughnut
    chartInstances.topics = new Chart(document.getElementById('chart-topics'), {
        type: 'doughnut',
        data: {
            labels: topicsData.map(d => d.topic),
            datasets: [{ data: topicsData.map(d => d.count), backgroundColor: chartColors(topicsData.length), borderWidth: 0 }],
        },
        options: _doughnutOpts(tc),
    });
}

function _lineBarOpts(tc, gc, label) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            x: { grid: { color: gc }, ticks: { color: tc, maxTicksLimit: 8, font: { size: 11 } } },
            y: { grid: { color: gc }, ticks: { color: tc, stepSize: 1, font: { size: 11 } }, beginAtZero: true },
        },
    };
}

function _doughnutOpts(tc) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: { color: tc, font: { size: 11 }, padding: 10, boxWidth: 12 },
            },
        },
        cutout: '60%',
    };
}

// ── UNREAD BADGE ──────────────────────────────────────────────────────────────
async function loadUnreadBadge() {
    try {
        const res  = await adminFetch('/api/admin/contact?limit=1');
        const data = await res.json();
        updateUnreadBadge(data.unread_count);
    } catch (_) {}
}

function updateUnreadBadge(count) {
    const badge = document.getElementById('unread-badge');
    if (count > 0) {
        badge.textContent = count;
        badge.hidden = false;
    } else {
        badge.hidden = true;
    }
}

// ── USERS ─────────────────────────────────────────────────────────────────────
let usersPage = 1;

async function loadUsers(page = 1) {
    usersPage = page;
    const search = document.getElementById('user-search').value.trim();
    const tbody  = document.getElementById('users-tbody');
    tbody.innerHTML = `<tr><td colspan="9"><div class="admin-empty"><i class="fas fa-spinner fa-spin"></i><p>Loading…</p></div></td></tr>`;

    try {
        const params = new URLSearchParams({ page, limit: 20 });
        if (search) params.set('search', search);
        const res  = await adminFetch(`/api/admin/users?${params}`);
        const data = await res.json();
        renderUsersTable(data);
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="9"><div class="admin-empty"><i class="fas fa-exclamation-circle"></i><p>${e.message}</p></div></td></tr>`;
    }
}

function renderUsersTable({ users, total, page, pages }) {
    const tbody = document.getElementById('users-tbody');
    if (!users.length) {
        tbody.innerHTML = `<tr><td colspan="9"><div class="admin-empty"><i class="fas fa-users-slash"></i><p>No users found.</p></div></td></tr>`;
        document.getElementById('users-pagination').innerHTML = '';
        return;
    }
    tbody.innerHTML = users.map(u => `
        <tr>
            <td class="td-muted">${u.id}</td>
            <td><strong>${esc(u.username)}</strong></td>
            <td class="td-muted">${esc(u.email)}</td>
            <td>${u.provider === 'google'
                ? '<span class="badge badge-blue"><i class="fab fa-google"></i> Google</span>'
                : '<span class="badge badge-gray"><i class="fas fa-user"></i> Local</span>'}</td>
            <td>${u.is_verified
                ? '<span class="badge badge-green"><i class="fas fa-check"></i> Yes</span>'
                : '<span class="badge badge-red"><i class="fas fa-times"></i> No</span>'}</td>
            <td class="td-muted">${u.saved_count}</td>
            <td class="td-muted">${u.liked_count}</td>
            <td class="td-muted">${fmtDate(u.created_at)}</td>
            <td style="display:flex;gap:4px;align-items:center;flex-wrap:wrap;">
                ${u.provider === 'local' ? `
                <button class="btn-icon" title="Reset password"
                    onclick="resetUserPassword(${u.id}, '${esc(u.username)}')">
                    <i class="fas fa-key"></i>
                </button>` : `
                <button class="btn-icon" title="OAuth — no password" disabled style="opacity:0.3;">
                    <i class="fas fa-key"></i>
                </button>`}
                <button class="btn-icon ${u.is_active ? 'danger' : 'success'}"
                    title="${u.is_active ? 'Disable account' : 'Enable account'}"
                    onclick="toggleUserActive(${u.id}, ${u.is_active})">
                    <i class="fas fa-${u.is_active ? 'ban' : 'check'}"></i>
                </button>
            </td>
        </tr>`).join('');
    buildPagination('users-pagination', page, pages, loadUsers);
}

let userSearchTimer;
document.getElementById('user-search').addEventListener('input', () => {
    clearTimeout(userSearchTimer);
    userSearchTimer = setTimeout(() => loadUsers(1), 350);
});

// ── User actions: reset password ───────────────────────────────────────────────
const resetPwModal = document.getElementById('reset-pw-modal');
let _resetPwUserId = null;

function resetUserPassword(id, username) {
    _resetPwUserId = id;
    document.getElementById('reset-pw-for').textContent =
        `Setting a new password for: ${username}`;
    document.getElementById('reset-pw-new').value = '';
    document.getElementById('reset-pw-err').hidden = true;
    resetPwModal.hidden = false;
}

document.getElementById('close-reset-pw').addEventListener('click',
    () => { resetPwModal.hidden = true; });
document.getElementById('cancel-reset-pw').addEventListener('click',
    () => { resetPwModal.hidden = true; });
resetPwModal.addEventListener('click',
    e => { if (e.target === resetPwModal) resetPwModal.hidden = true; });

document.getElementById('submit-reset-pw').addEventListener('click', async () => {
    const pw    = document.getElementById('reset-pw-new').value.trim();
    const errEl = document.getElementById('reset-pw-err');
    const btn   = document.getElementById('submit-reset-pw');

    errEl.hidden = true;
    if (!pw || pw.length < 6) {
        errEl.textContent = 'Password must be at least 6 characters.';
        errEl.hidden = false;
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Resetting…';
    try {
        const res = await adminFetch(`/api/admin/users/${_resetPwUserId}/reset-password`, {
            method: 'POST',
            body: JSON.stringify({ new_password: pw }),
        });
        if (!res.ok) {
            const d = await res.json();
            throw new Error(d.detail || 'Reset failed.');
        }
        resetPwModal.hidden = true;
    } catch (e) {
        errEl.textContent = e.message;
        errEl.hidden = false;
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-key"></i> Reset Password';
    }
});

// ── User actions: toggle active ────────────────────────────────────────────────
async function toggleUserActive(id, isActive) {
    const action = isActive ? 'disable' : 'enable';
    if (!confirm(`Are you sure you want to ${action} this account?`)) return;
    try {
        await adminFetch(`/api/admin/users/${id}/toggle-active`, { method: 'PATCH' });
        loadUsers(usersPage);
    } catch (e) {
        alert('Failed: ' + e.message);
    }
}

// ── QUOTES ────────────────────────────────────────────────────────────────────
let quotesPage = 1;

async function loadQuotes(page = 1) {
    quotesPage = page;
    const search = document.getElementById('quote-search').value.trim();
    const lang   = document.getElementById('quote-filter-lang').value;
    const mood   = document.getElementById('quote-filter-mood').value;
    const topic  = document.getElementById('quote-filter-topic').value;
    const tbody  = document.getElementById('quotes-tbody');
    tbody.innerHTML = `<tr><td colspan="7"><div class="admin-empty"><i class="fas fa-spinner fa-spin"></i><p>Loading…</p></div></td></tr>`;

    try {
        const params = new URLSearchParams({ page, limit: 20 });
        if (search) params.set('search', search);
        if (lang)   params.set('language', lang);
        if (mood)   params.set('mood', mood);
        if (topic)  params.set('topic', topic);
        const res  = await adminFetch(`/api/admin/quotes?${params}`);
        const data = await res.json();
        renderQuotesTable(data);
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="7"><div class="admin-empty"><i class="fas fa-exclamation-circle"></i><p>${e.message}</p></div></td></tr>`;
    }
}

function renderQuotesTable({ quotes, total, page, pages }) {
    const tbody = document.getElementById('quotes-tbody');
    if (!quotes.length) {
        tbody.innerHTML = `<tr><td colspan="7"><div class="admin-empty"><i class="fas fa-quote-right"></i><p>No quotes found.</p></div></td></tr>`;
        document.getElementById('quotes-pagination').innerHTML = '';
        return;
    }
    tbody.innerHTML = quotes.map(q => `
        <tr>
            <td class="td-muted">${q.id}</td>
            <td class="td-truncate" title="${esc(q.quote)}">${esc(q.quote)}</td>
            <td>${esc(q.author)}</td>
            <td>${q.language === 'ur'
                ? '<span class="badge badge-purple">اردو</span>'
                : '<span class="badge badge-blue">EN</span>'}</td>
            <td>${q.mood ? `<span class="badge badge-orange">${q.mood}</span>` : '<span class="td-muted">—</span>'}</td>
            <td>${q.topic ? `<span class="badge badge-green">${q.topic}</span>` : '<span class="td-muted">—</span>'}</td>
            <td>
                <button class="btn-icon danger" title="Delete" onclick="deleteQuote(${q.id})">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        </tr>`).join('');
    buildPagination('quotes-pagination', page, pages, loadQuotes);
}

let quoteSearchTimer;
document.getElementById('quote-search').addEventListener('input', () => {
    clearTimeout(quoteSearchTimer);
    quoteSearchTimer = setTimeout(() => loadQuotes(1), 350);
});
['quote-filter-lang','quote-filter-mood','quote-filter-topic'].forEach(id => {
    document.getElementById(id).addEventListener('change', () => loadQuotes(1));
});

async function deleteQuote(id) {
    if (!confirm('Delete this quote from the database?')) return;
    try {
        await adminFetch(`/api/admin/quotes/${id}`, { method: 'DELETE' });
        loadQuotes(quotesPage);
    } catch (e) {
        alert('Delete failed: ' + e.message);
    }
}

// Add quote modal
const addModal = document.getElementById('add-quote-modal');
document.getElementById('add-quote-btn').addEventListener('click', () => { addModal.hidden = false; });
document.getElementById('close-add-quote').addEventListener('click', () => { addModal.hidden = true; });
document.getElementById('cancel-add-quote').addEventListener('click', () => { addModal.hidden = true; });
addModal.addEventListener('click', e => { if (e.target === addModal) addModal.hidden = true; });

document.getElementById('submit-add-quote').addEventListener('click', async () => {
    const text   = document.getElementById('new-quote-text').value.trim();
    const author = document.getElementById('new-quote-author').value.trim() || 'Unknown';
    const lang   = document.getElementById('new-quote-lang').value;
    const mood   = document.getElementById('new-quote-mood').value || null;
    const topic  = document.getElementById('new-quote-topic').value || null;
    const errEl  = document.getElementById('add-quote-err');

    errEl.hidden = true;
    if (!text) { errEl.textContent = 'Quote text is required.'; errEl.hidden = false; return; }

    const btn = document.getElementById('submit-add-quote');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…';

    try {
        const res = await adminFetch('/api/admin/quotes', {
            method: 'POST',
            body: JSON.stringify({ quote: text, author, language: lang, mood, topic }),
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.detail || 'Failed'); }
        addModal.hidden = true;
        // Reset form
        ['new-quote-text','new-quote-author'].forEach(id => document.getElementById(id).value = '');
        ['new-quote-lang','new-quote-mood','new-quote-topic'].forEach(id => document.getElementById(id).selectedIndex = 0);
        loadQuotes(1);
    } catch (e) {
        errEl.textContent = e.message;
        errEl.hidden = false;
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> Save Quote';
    }
});

// ── MESSAGES ──────────────────────────────────────────────────────────────────
let msgsPage = 1;

async function loadMessages(page = 1) {
    msgsPage = page;
    const unreadOnly = document.getElementById('unread-only-toggle').checked;
    const tbody = document.getElementById('msgs-tbody');
    tbody.innerHTML = `<tr><td colspan="6"><div class="admin-empty"><i class="fas fa-spinner fa-spin"></i><p>Loading…</p></div></td></tr>`;

    try {
        const params = new URLSearchParams({ page, limit: 20 });
        if (unreadOnly) params.set('unread_only', 'true');
        const res  = await adminFetch(`/api/admin/contact?${params}`);
        const data = await res.json();
        updateUnreadBadge(data.unread_count);
        renderMessagesTable(data);
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="6"><div class="admin-empty"><i class="fas fa-exclamation-circle"></i><p>${e.message}</p></div></td></tr>`;
    }
}

function renderMessagesTable({ messages, total, page, pages }) {
    const tbody = document.getElementById('msgs-tbody');
    if (!messages.length) {
        tbody.innerHTML = `<tr><td colspan="6"><div class="admin-empty"><i class="fas fa-inbox"></i><p>No messages found.</p></div></td></tr>`;
        document.getElementById('msgs-pagination').innerHTML = '';
        return;
    }
    tbody.innerHTML = messages.map(m => `
        <tr class="${m.is_read ? '' : 'msg-row-unread'}">
            <td>${esc(m.name)}</td>
            <td class="td-muted">${esc(m.email)}</td>
            <td class="td-truncate" title="${esc(m.subject)}">${esc(m.subject)}</td>
            <td class="td-muted">${fmtDate(m.created_at)}</td>
            <td>${m.is_read
                ? '<span class="badge badge-gray">Read</span>'
                : '<span class="badge badge-blue">Unread</span>'}</td>
            <td style="display:flex;gap:4px;align-items:center;">
                <button class="btn-icon" title="View message" onclick="viewMessage(${JSON.stringify(m).replace(/"/g, '&quot;')})">
                    <i class="fas fa-eye"></i>
                </button>
                ${!m.is_read ? `<button class="btn-icon success" title="Mark as read" onclick="markRead(${m.id})">
                    <i class="fas fa-check"></i>
                </button>` : ''}
                <button class="btn-icon danger" title="Delete" onclick="deleteMessage(${m.id})">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        </tr>`).join('');
    buildPagination('msgs-pagination', page, pages, loadMessages);
}

document.getElementById('unread-only-toggle').addEventListener('change', () => loadMessages(1));

async function markRead(id) {
    try {
        await adminFetch(`/api/admin/contact/${id}/read`, { method: 'PATCH' });
        loadMessages(msgsPage);
        loadUnreadBadge();
    } catch (e) { alert('Failed: ' + e.message); }
}

async function deleteMessage(id) {
    if (!confirm('Delete this contact message permanently?')) return;
    try {
        await adminFetch(`/api/admin/contact/${id}`, { method: 'DELETE' });
        loadMessages(msgsPage);
        loadUnreadBadge();
    } catch (e) { alert('Failed: ' + e.message); }
}

// View message modal
const msgModal = document.getElementById('msg-view-modal');
document.getElementById('close-msg-view').addEventListener('click', () => { msgModal.hidden = true; });
msgModal.addEventListener('click', e => { if (e.target === msgModal) msgModal.hidden = true; });

function viewMessage(m) {
    document.getElementById('mv-from').textContent    = m.name;
    document.getElementById('mv-email').textContent   = m.email;
    document.getElementById('mv-subject').textContent = m.subject;
    document.getElementById('mv-message').textContent = m.message;
    document.getElementById('mv-date').textContent    = 'Received: ' + fmtDate(m.created_at);
    msgModal.hidden = false;
    if (!m.is_read) markRead(m.id);
}

// ── XSS-safe escape ───────────────────────────────────────────────────────────
function esc(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ── SETTINGS ──────────────────────────────────────────────────────────────────
function loadSettings() { /* static form — nothing to load */ }

document.getElementById('submit-change-pw').addEventListener('click', async () => {
    const currentPw = document.getElementById('set-current-pw').value;
    const newPw     = document.getElementById('set-new-pw').value;
    const confirmPw = document.getElementById('set-confirm-pw').value;
    const msgEl     = document.getElementById('set-pw-msg');
    const btn       = document.getElementById('submit-change-pw');

    msgEl.hidden = true;
    msgEl.className = 'settings-msg';

    if (!currentPw || !newPw || !confirmPw) {
        _showSettingsMsg(msgEl, 'error', 'All fields are required.');
        return;
    }
    if (newPw.length < 8) {
        _showSettingsMsg(msgEl, 'error', 'New password must be at least 8 characters.');
        return;
    }
    if (newPw !== confirmPw) {
        _showSettingsMsg(msgEl, 'error', 'New passwords do not match.');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating…';

    try {
        const res = await adminFetch('/api/admin/change-password', {
            method: 'POST',
            body: JSON.stringify({ current_password: currentPw, new_password: newPw }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Update failed.');
        // Clear fields on success
        ['set-current-pw', 'set-new-pw', 'set-confirm-pw'].forEach(id => {
            document.getElementById(id).value = '';
        });
        _showSettingsMsg(msgEl, 'success',
            'Admin password updated successfully. Use the new password on next login.');
    } catch (e) {
        _showSettingsMsg(msgEl, 'error', e.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> Update Password';
    }
});

function _showSettingsMsg(el, type, text) {
    el.textContent = text;
    el.className = `settings-msg settings-msg-${type}`;
    el.hidden = false;
}

// ── Boot ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    if (isLoggedIn()) {
        showDashboard();
    } else {
        showLogin();
    }
});
