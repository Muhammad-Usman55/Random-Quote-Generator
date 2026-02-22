// profile.js — Profile page logic (JWT auth)
// Loads user info, saved quotes, liked quotes; handles tab switching and removal.

var savedQuotes = [];
var likedQuotes = [];

// ── Render a quote grid ────────────────────────────────────────────────────────

function renderQuoteGrid(quotes, gridId, deleteEndpoint) {
    var grid = document.getElementById(gridId);
    if (!grid) return;

    if (!quotes.length) {
        grid.innerHTML =
            '<div class="fav-empty-state">' +
                '<i class="fas fa-heart-broken"></i>' +
                '<h3>Nothing here yet</h3>' +
                '<p>Visit the <a href="/home">Home page</a> to save quotes.</p>' +
            '</div>';
        return;
    }

    grid.innerHTML = quotes.map(function (q) {
        var isRtl     = q.language === 'ur';
        var shareText = encodeURIComponent('"' + q.quote + '" \u2014 ' + (q.author || 'Unknown'));
        return (
            '<div class="glass-card" dir="' + (isRtl ? 'rtl' : 'ltr') + '" data-id="' + q.id + '">' +
                '<div class="fav-card-body">' +
                    '<i class="fas fa-quote-left quote-icon"></i> ' +
                    q.quote +
                    ' <i class="fas fa-quote-right quote-icon"></i>' +
                '</div>' +
                '<div class="fav-card-author">\u2014 ' + (q.author || 'Unknown') + '</div>' +
                '<div class="fav-card-actions">' +
                    '<a class="btn-sm button" href="https://twitter.com/intent/tweet?text=' + shareText + '" target="_blank" rel="noopener">' +
                        '<i class="fab fa-twitter"></i> Tweet' +
                    '</a>' +
                    '<button class="btn-sm button btn-danger btn-remove" data-id="' + q.id + '">' +
                        '<i class="fas fa-trash"></i> Remove' +
                    '</button>' +
                '</div>' +
            '</div>'
        );
    }).join('');

    // Wire remove buttons
    grid.querySelectorAll('.btn-remove').forEach(function (btn) {
        btn.addEventListener('click', async function () {
            var id = parseInt(btn.getAttribute('data-id'), 10);
            btn.disabled = true;
            try {
                var res = await AUTH.apiFetch(deleteEndpoint + id, { method: 'DELETE' });
                if (!res || (res.status !== 204 && !res.ok)) throw new Error('Remove failed');
                if (deleteEndpoint.includes('saved')) {
                    savedQuotes = savedQuotes.filter(function (q) { return q.id !== id; });
                    document.getElementById('saved-count').textContent = savedQuotes.length;
                    renderQuoteGrid(savedQuotes, 'saved-grid', '/api/users/saved-quotes/');
                } else {
                    likedQuotes = likedQuotes.filter(function (q) { return q.id !== id; });
                    document.getElementById('liked-count').textContent = likedQuotes.length;
                    renderQuoteGrid(likedQuotes, 'liked-grid', '/api/users/liked-quotes/');
                }
            } catch (e) {
                btn.disabled = false;
                console.error('Remove failed:', e);
            }
        });
    });
}

// ── Tab switching ──────────────────────────────────────────────────────────────

function switchTab(tab) {
    var savedGrid = document.getElementById('saved-grid');
    var likedGrid = document.getElementById('liked-grid');
    var tabSaved  = document.getElementById('tab-saved');
    var tabLiked  = document.getElementById('tab-liked');

    if (tab === 'saved') {
        savedGrid.hidden = false;
        likedGrid.hidden = true;
        tabSaved.classList.add('profile-tab-active');
        tabLiked.classList.remove('profile-tab-active');
    } else {
        savedGrid.hidden = true;
        likedGrid.hidden = false;
        tabSaved.classList.remove('profile-tab-active');
        tabLiked.classList.add('profile-tab-active');
    }
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async function () {

    // Tab wiring
    document.getElementById('tab-saved').addEventListener('click', function () { switchTab('saved'); });
    document.getElementById('tab-liked').addEventListener('click', function () { switchTab('liked'); });

    // Load user info
    try {
        await AUTH.loadUser();
        var user = AUTH.currentUser();
        if (!user) throw new Error('No user data');

        // Render avatar
        var avatarWrap = document.getElementById('profile-avatar-wrap');
        if (user.profile_picture) {
            avatarWrap.innerHTML =
                '<img src="' + user.profile_picture + '" alt="Avatar" ' +
                'style="width:72px;height:72px;border-radius:50%;object-fit:cover;border:3px solid var(--primary-color);">';
        } else {
            avatarWrap.innerHTML =
                '<div style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,var(--primary-color),#6c5ce7);display:flex;align-items:center;justify-content:center;color:#fff;font-size:2rem;">' +
                    '<i class="fas fa-user"></i>' +
                '</div>';
        }

        document.getElementById('profile-username').textContent = user.username || user.email;
        document.getElementById('profile-email').textContent    = user.email;
        document.getElementById('profile-provider').innerHTML   =
            '<span style="display:inline-flex;align-items:center;gap:6px;font-size:0.78rem;font-weight:600;color:var(--secondary-color);text-transform:uppercase;letter-spacing:0.8px;">' +
            (user.provider === 'google'
                ? '<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" style="width:14px;height:14px;" alt="Google"> Google Account'
                : '<i class="fas fa-envelope"></i> Email Account') +
            '</span>';

        if (!user.is_verified) {
            document.getElementById('profile-unverified').hidden = false;
        }

        document.getElementById('profile-loading').hidden = true;
        document.getElementById('profile-info').hidden    = false;

    } catch (e) {
        document.getElementById('profile-loading').innerHTML =
            '<p style="color:var(--secondary-color);">Could not load profile.</p>';
    }

    // Load saved + liked quotes concurrently
    try {
        var [savedRes, likedRes] = await Promise.all([
            AUTH.apiFetch('/api/users/saved-quotes'),
            AUTH.apiFetch('/api/users/liked-quotes')
        ]);

        savedQuotes = (savedRes && savedRes.ok) ? await savedRes.json() : [];
        likedQuotes = (likedRes && likedRes.ok) ? await likedRes.json() : [];

        document.getElementById('saved-count').textContent = savedQuotes.length;
        document.getElementById('liked-count').textContent = likedQuotes.length;

        document.getElementById('quotes-loading').hidden = true;

        renderQuoteGrid(savedQuotes, 'saved-grid', '/api/users/saved-quotes/');
        renderQuoteGrid(likedQuotes, 'liked-grid', '/api/users/liked-quotes/');

        // Show saved tab by default
        document.getElementById('saved-grid').hidden = false;

    } catch (e) {
        document.getElementById('quotes-loading').innerHTML =
            '<p style="color:var(--secondary-color);text-align:center;">Could not load quotes.</p>';
    }

});
