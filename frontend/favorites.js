// favorites.js — Saved Quotes page logic (JWT auth version)
// All API calls go through AUTH.apiFetch for automatic token refresh.

var currentFavorites = []; // [{id, quote, author, language, created_at}]

// ── API helpers ───────────────────────────────────────────────────────────────

async function fetchFavs() {
    var res = await AUTH.apiFetch('/api/users/saved-quotes');
    if (!res || !res.ok) throw new Error('Failed to load favorites');
    return res.json();
}

async function deleteFav(id) {
    var res = await AUTH.apiFetch('/api/users/saved-quotes/' + id, { method: 'DELETE' });
    if (!res) throw new Error('Not authenticated');
    if (res.status !== 204 && !res.ok) throw new Error('Failed to delete favorite');
}

// ── Render ────────────────────────────────────────────────────────────────────

function renderGrid(query) {
    query = (query || '').trim().toLowerCase();

    var filtered = query
        ? currentFavorites.filter(function (f) {
            return (
                f.quote.toLowerCase().includes(query) ||
                (f.author || '').toLowerCase().includes(query)
            );
        })
        : currentFavorites.slice();

    var grid  = document.getElementById('favorites-grid');
    var count = document.getElementById('favorites-count');
    if (!grid) return;

    if (count) {
        count.textContent = filtered.length + ' quote' + (filtered.length !== 1 ? 's' : '') + ' saved';
    }

    if (!filtered.length) {
        var isSearch = query.length > 0;
        grid.innerHTML =
            '<div class="fav-empty-state">' +
                '<i class="fas ' + (isSearch ? 'fa-search' : 'fa-heart-broken') + '"></i>' +
                '<h3>' + (isSearch ? 'No results found' : 'No favorites yet') + '</h3>' +
                '<p>' + (isSearch
                    ? 'Try different keywords.'
                    : 'Visit the <a href="/home">Home page</a> and tap the heart button to save quotes here.') +
                '</p>' +
            '</div>';
        return;
    }

    grid.innerHTML = filtered.map(function (fav) {
        var isRtl = fav.language === 'ur';
        var shareText = encodeURIComponent('"' + fav.quote + '" \u2014 ' + (fav.author || 'Unknown'));
        return (
            '<div class="glass-card" dir="' + (isRtl ? 'rtl' : 'ltr') + '" data-id="' + fav.id + '">' +
                '<div class="fav-card-body">' +
                    '<i class="fas fa-quote-left quote-icon"></i> ' +
                    fav.quote +
                    ' <i class="fas fa-quote-right quote-icon"></i>' +
                '</div>' +
                '<div class="fav-card-author">\u2014 ' + (fav.author || 'Unknown') + '</div>' +
                '<div class="fav-card-actions">' +
                    '<a class="btn-sm button" href="https://twitter.com/intent/tweet?text=' + shareText + '" target="_blank" rel="noopener" aria-label="Share on Twitter">' +
                        '<i class="fab fa-twitter"></i> Tweet' +
                    '</a>' +
                    '<button class="btn-sm button btn-whatsapp" data-text="' + shareText + '" aria-label="Share on WhatsApp">' +
                        '<i class="fab fa-whatsapp"></i> WhatsApp' +
                    '</button>' +
                    '<button class="btn-sm button btn-danger btn-remove" data-id="' + fav.id + '" aria-label="Remove from favorites">' +
                        '<i class="fas fa-trash"></i> Remove' +
                    '</button>' +
                '</div>' +
            '</div>'
        );
    }).join('');

    // Remove button listeners
    grid.querySelectorAll('.btn-remove').forEach(function (btn) {
        btn.addEventListener('click', async function () {
            var id = parseInt(btn.getAttribute('data-id'), 10);
            btn.disabled = true;
            try {
                await deleteFav(id);
                currentFavorites = currentFavorites.filter(function (f) { return f.id !== id; });
                renderGrid(document.getElementById('search-favorites')?.value || '');
            } catch (e) {
                btn.disabled = false;
                console.error('Remove failed:', e);
            }
        });
    });

    // WhatsApp button listeners
    grid.querySelectorAll('.btn-whatsapp').forEach(function (btn) {
        btn.addEventListener('click', function () {
            window.open('https://wa.me/?text=' + btn.getAttribute('data-text'), '_blank');
        });
    });
}

// ── Export ────────────────────────────────────────────────────────────────────

function exportFavs() {
    if (!currentFavorites.length) {
        alert('No favorites to export.');
        return;
    }
    var text = currentFavorites.map(function (f) {
        return '"' + f.quote + '" \u2014 ' + (f.author || 'Unknown');
    }).join('\n\n---\n\n');

    var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    var url  = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href     = url;
    a.download = 'quotegen-favorites.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async function () {
    // Load user's saved quotes from backend
    try {
        currentFavorites = await fetchFavs();
    } catch (e) {
        currentFavorites = [];
        console.error('Could not load favorites:', e);
    }
    renderGrid();

    var searchInput = document.getElementById('search-favorites');
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            renderGrid(searchInput.value);
        });
    }

    var exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportFavs);
    }

    var clearBtn = document.getElementById('clear-all-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', async function () {
            if (!currentFavorites.length) {
                alert('No favorites to clear.');
                return;
            }
            if (!confirm('Remove all saved quotes? This cannot be undone.')) return;

            clearBtn.disabled = true;
            try {
                await Promise.all(currentFavorites.map(function (f) { return deleteFav(f.id); }));
                currentFavorites = [];
                renderGrid();
            } catch (e) {
                console.error('Clear all failed:', e);
            } finally {
                clearBtn.disabled = false;
            }
        });
    }
});
