// search.js — Quote Search page logic
// Supports: real-time keyword search, author lookup, tag filtering, language toggle.

(function () {

    // ── State ─────────────────────────────────────────────────────────────────
    var currentQuery    = '';
    var currentTag      = '';
    var currentLanguage = '';   // '' = all, 'en', 'ur'
    var debounceTimer   = null;
    var lastFetchId     = 0;    // For cancelling stale responses

    // ── DOM refs ──────────────────────────────────────────────────────────────
    var searchInput    = document.getElementById('search-input');
    var clearBtn       = document.getElementById('clear-search');
    var spinner        = document.getElementById('search-spinner');
    var emptyState     = document.getElementById('search-empty');
    var noResults      = document.getElementById('search-no-results');
    var resultsGrid    = document.getElementById('search-results');
    var statusLine     = document.getElementById('search-status');
    var authorBanner   = document.getElementById('author-banner');
    var authorName     = document.getElementById('author-banner-name');
    var tagChips       = document.querySelectorAll('.tag-chip');
    var langPills      = document.querySelectorAll('.lang-pill');

    // ── Render ────────────────────────────────────────────────────────────────

    function renderResults(results) {
        resultsGrid.innerHTML = '';

        results.forEach(function (item) {
            var isRtl     = item.language === 'ur';
            var shareText = encodeURIComponent('"' + item.quote + '" \u2014 ' + (item.author || 'Unknown'));
            var tagPills  = '';
            if (item.mood)  tagPills += '<span class="sq-tag sq-tag--mood">'  + item.mood  + '</span>';
            if (item.topic) tagPills += '<span class="sq-tag sq-tag--topic">' + item.topic + '</span>';
            var langBadge = item.language === 'ur'
                ? '<span class="sq-tag sq-tag--lang">اردو</span>'
                : '<span class="sq-tag sq-tag--lang">EN</span>';

            var card = document.createElement('div');
            card.className = 'glass-card sq-card';
            card.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
            card.innerHTML =
                '<div class="fav-card-body">' +
                    '<i class="fas fa-quote-left quote-icon"></i> ' +
                    escapeHTML(item.quote) +
                    ' <i class="fas fa-quote-right quote-icon"></i>' +
                '</div>' +
                '<div class="sq-author">' +
                    '<i class="fas fa-user-circle" style="color:var(--primary-color);margin-right:6px;"></i>' +
                    escapeHTML(item.author || 'Unknown') +
                '</div>' +
                '<div class="sq-pills">' + tagPills + langBadge + '</div>' +
                '<div class="fav-card-actions" style="margin-top:14px;">' +
                    '<a class="btn-sm button" href="https://twitter.com/intent/tweet?text=' + shareText + '" target="_blank" rel="noopener">' +
                        '<i class="fab fa-twitter"></i> Tweet' +
                    '</a>' +
                    '<button class="btn-sm button btn-whatsapp" data-text="' + shareText + '">' +
                        '<i class="fab fa-whatsapp"></i> WhatsApp' +
                    '</button>' +
                    (typeof AUTH !== 'undefined' && AUTH.isLoggedIn()
                        ? '<button class="btn-sm button btn-save-sq" data-quote="' + encodeURIComponent(item.quote) + '" data-author="' + encodeURIComponent(item.author || 'Unknown') + '" data-lang="' + item.language + '">' +
                              '<i class="fas fa-heart"></i> Save' +
                          '</button>'
                        : '') +
                '</div>';

            resultsGrid.appendChild(card);
        });

        // Wire WhatsApp buttons
        resultsGrid.querySelectorAll('.btn-whatsapp').forEach(function (btn) {
            btn.addEventListener('click', function () {
                window.open('https://wa.me/?text=' + btn.getAttribute('data-text'), '_blank');
            });
        });

        // Wire Save buttons
        resultsGrid.querySelectorAll('.btn-save-sq').forEach(function (btn) {
            btn.addEventListener('click', async function () {
                if (typeof AUTH === 'undefined' || !AUTH.isLoggedIn()) return;
                btn.disabled = true;
                var q = decodeURIComponent(btn.getAttribute('data-quote'));
                var a = decodeURIComponent(btn.getAttribute('data-author'));
                var l = btn.getAttribute('data-lang');
                try {
                    var res = await AUTH.apiFetch('/api/users/saved-quotes', {
                        method: 'POST',
                        body: JSON.stringify({ quote: q, author: a, language: l })
                    });
                    if (res && res.ok) {
                        btn.innerHTML = '<i class="fas fa-check"></i> Saved';
                        btn.classList.add('btn-saved');
                    } else {
                        btn.disabled = false;
                    }
                } catch (e) {
                    btn.disabled = false;
                }
            });
        });
    }

    // ── Author lookup banner ──────────────────────────────────────────────────

    function updateAuthorBanner(results) {
        // Show banner if first result is an exact quote-text match
        var q = currentQuery.trim().toLowerCase();
        if (!q || results.length === 0) {
            authorBanner.hidden = true;
            return;
        }
        var first = results[0];
        if (first.quote.toLowerCase() === q) {
            authorName.textContent = first.author || 'Unknown';
            authorBanner.hidden = false;
        } else {
            authorBanner.hidden = true;
        }
    }

    // ── Status line ───────────────────────────────────────────────────────────

    function updateStatus(results) {
        if (results.length === 0) {
            statusLine.textContent = '';
            return;
        }
        var parts = [];
        if (currentQuery) parts.push('"' + currentQuery + '"');
        if (currentTag)   parts.push('#' + currentTag);
        var langLabel = currentLanguage === 'en' ? 'English' : currentLanguage === 'ur' ? 'Urdu' : 'all languages';
        statusLine.textContent =
            results.length + ' result' + (results.length !== 1 ? 's' : '') +
            (parts.length ? ' for ' + parts.join(' + ') : '') +
            ' · ' + langLabel;
    }

    // ── Fetch & render ────────────────────────────────────────────────────────

    async function doSearch() {
        var fetchId = ++lastFetchId;

        // Show/hide states
        spinner.hidden    = false;
        emptyState.hidden = true;
        noResults.hidden  = true;
        resultsGrid.hidden = true;
        authorBanner.hidden = true;
        statusLine.textContent = '';

        // Build query params
        var params = new URLSearchParams();
        if (currentQuery)  params.set('q',        currentQuery);
        if (currentTag)    params.set('tag',       currentTag);
        if (currentLanguage) params.set('language', currentLanguage);
        params.set('limit', '30');

        try {
            var res = await fetch('/api/quotes/search?' + params.toString());
            if (fetchId !== lastFetchId) return; // Stale response — discard
            if (!res.ok) throw new Error('Search failed');
            var results = await res.json();

            spinner.hidden = true;

            if (results.length === 0) {
                noResults.hidden = false;
            } else {
                renderResults(results);
                resultsGrid.hidden = false;
                updateAuthorBanner(results);
                updateStatus(results);
            }

        } catch (e) {
            if (fetchId !== lastFetchId) return;
            spinner.hidden = true;
            statusLine.textContent = 'Search failed. Please try again.';
        }
    }

    function scheduleSearch() {
        clearTimeout(debounceTimer);
        var q   = searchInput.value.trim();
        var hasQ = q.length >= 2;
        var hasTag = !!currentTag;

        clearBtn.hidden = !q;

        if (!hasQ && !hasTag) {
            // Reset to empty state
            spinner.hidden = true;
            resultsGrid.hidden = true;
            noResults.hidden = true;
            authorBanner.hidden = true;
            statusLine.textContent = '';
            emptyState.hidden = false;
            currentQuery = '';
            return;
        }

        currentQuery = q;
        debounceTimer = setTimeout(doSearch, 280);
    }

    // ── Tag chips ─────────────────────────────────────────────────────────────

    tagChips.forEach(function (chip) {
        chip.addEventListener('click', function () {
            var tag = chip.getAttribute('data-tag');
            if (currentTag === tag) {
                // Deactivate
                currentTag = '';
                chip.classList.remove('tag-chip-active');
            } else {
                // Activate — deactivate all others
                tagChips.forEach(function (c) { c.classList.remove('tag-chip-active'); });
                currentTag = tag;
                chip.classList.add('tag-chip-active');
            }
            scheduleSearch();
        });
    });

    // ── Language pills ────────────────────────────────────────────────────────

    langPills.forEach(function (pill) {
        pill.addEventListener('click', function () {
            langPills.forEach(function (p) { p.classList.remove('lang-pill-active'); });
            pill.classList.add('lang-pill-active');
            currentLanguage = pill.getAttribute('data-lang') || '';
            scheduleSearch();
        });
    });

    // ── Search input ──────────────────────────────────────────────────────────

    searchInput.addEventListener('input', scheduleSearch);

    clearBtn.addEventListener('click', function () {
        searchInput.value = '';
        clearBtn.hidden = true;
        currentQuery = '';
        if (!currentTag) {
            spinner.hidden = true;
            resultsGrid.hidden = true;
            noResults.hidden = true;
            authorBanner.hidden = true;
            statusLine.textContent = '';
            emptyState.hidden = false;
        } else {
            doSearch();
        }
        searchInput.focus();
    });

    // ── URL ?tag= and ?q= param support ──────────────────────────────────────

    (function applyURLParams() {
        var params = new URLSearchParams(window.location.search);
        var tagParam = params.get('tag');
        var qParam   = params.get('q');

        if (tagParam) {
            var matchChip = document.querySelector('.tag-chip[data-tag="' + tagParam + '"]');
            if (matchChip) {
                currentTag = tagParam;
                matchChip.classList.add('tag-chip-active');
            }
        }
        if (qParam) {
            searchInput.value = qParam;
            currentQuery = qParam;
            clearBtn.hidden = false;
        }

        if (currentTag || currentQuery) {
            doSearch();
        }
    })();

    // ── Helpers ───────────────────────────────────────────────────────────────

    function escapeHTML(str) {
        return String(str)
            .replace(/&/g,  '&amp;')
            .replace(/</g,  '&lt;')
            .replace(/>/g,  '&gt;')
            .replace(/"/g,  '&quot;')
            .replace(/'/g,  '&#39;');
    }

})();
