const quoteContainer = document.querySelector('.quote-box');
const quoteText = document.getElementById('quote');
const authorText = document.getElementById('author');
const twitterBtn = document.getElementById('twitter');
const nextQuoteBtn = document.getElementById('next-quote');
const prevQuoteBtn = document.getElementById('prev-quote');
const ttsBtn = document.getElementById('tts-btn');
const favBtn = document.getElementById('fav-btn');
const viewFavBtn = document.getElementById('view-fav-btn');
const whatsappBtn = document.getElementById('whatsapp');
const loader = document.getElementById('loader');
const themeToggleBtn = document.getElementById('theme-toggle');
const themeIcon = themeToggleBtn ? themeToggleBtn.querySelector('i') : null;
const footerCopy = document.getElementById('footer-copy');
const favoritesModal = document.getElementById('favorites-modal');
const favoritesList = document.getElementById('favorites-list');
const closeFavBtn = document.getElementById('close-fav');

const uiText = {
    en: {
        next: 'Next Quote',
        prev: 'Previous Quote',
        tweet: 'Tweet this quote!',
        whatsapp: 'Share on WhatsApp',
        speak: 'Speak',
        favoriteAdd: 'Add to Favorites',
        favoriteAdded: 'Saved',
        viewFavorites: 'View Favorites',
        savedQuotes: 'Saved Quotes',
        empty: 'No favorites yet. Tap the heart to save quotes.',
        footer: '© 2026 Random Quote Generator. All rights reserved.',
        unknown: 'Unknown',
        error: 'An error occurred. Please try again.',
        noResults: 'No quotes found for these filters. Try a different combination.'
    }
};

let quotesHistory = [];
let currentQuoteIndex = -1;
const currentLanguage = 'en';
let isLoadingNew = false;
let activeFilters = { mood: null, topic: null, author: null, quoteLang: 'en' };
let shownQuoteTexts = new Set(); // Tracks recently shown quote texts to avoid repeats
const SHOWN_QUOTES_MAX = 30;

function _buildExclude() {
    return shownQuoteTexts.size > 0 ? [...shownQuoteTexts].join(',') : null;
}
let favorites = []; // [{id, quote, author, language, created_at}]
let availableVoices = [];

function populateVoices() {
    availableVoices = speechSynthesis.getVoices();
}

// ── Favorites API helpers ─────────────────────────────────────────────────────

async function loadFavorites() {
    try {
        if (typeof AUTH === 'undefined' || !AUTH.isLoggedIn()) {
            favorites = [];
            return;
        }
        const res = await AUTH.apiFetch('/api/users/saved-quotes');
        if (!res || !res.ok) { favorites = []; return; }
        favorites = await res.json();
    } catch (e) {
        favorites = [];
    }
}

async function saveFavorite(quoteObj) {
    try {
        if (typeof AUTH === 'undefined' || !AUTH.isLoggedIn()) return;
        const res = await AUTH.apiFetch('/api/users/saved-quotes', {
            method: 'POST',
            body: JSON.stringify({
                quote: quoteObj.quote,
                author: quoteObj.author,
                language: quoteObj.language
            })
        });
        if (!res || !res.ok) throw new Error('Save failed');
        const saved = await res.json();
        // Add to local cache if not already present
        const exists = favorites.some(f => f.id === saved.id);
        if (!exists) favorites.push(saved);
    } catch (e) {
        console.error('Could not save favorite:', e);
    }
}

function getCurrentQuote() {
    return quotesHistory[currentQuoteIndex] || null;
}

function showLoadingSpinner() {
    loader.style.display = 'block';
    quoteContainer.classList.add('quote-loading');
}

function removeLoadingSpinner() {
    loader.style.display = 'none';
    quoteContainer.classList.remove('quote-loading');
    quoteContainer.hidden = false;
}

function updateNavigationState() {
    prevQuoteBtn.disabled = currentQuoteIndex <= 0 || isLoadingNew;
    nextQuoteBtn.disabled = isLoadingNew;
}

// ── Filter helpers ────────────────────────────────────────────────────────────

function hasActiveFilters() {
    return !!(activeFilters.mood || activeFilters.topic || activeFilters.author);
}

function updateClearButtonVisibility() {
    const clearBtn = document.getElementById('clear-filters-btn');
    if (clearBtn) clearBtn.hidden = !hasActiveFilters();
}

function clearAllFilters() {
    const savedLang = activeFilters.quoteLang;
    activeFilters = { mood: null, topic: null, author: null, quoteLang: savedLang };
    shownQuoteTexts.clear();
    document.querySelectorAll('.filter-chip:not([data-filter="quoteLang"])').forEach(c => c.classList.remove('active'));
    const authorSelect = document.getElementById('author-filter');
    if (authorSelect) {
        authorSelect.value = '';
        authorSelect.classList.remove('active');
    }
    updateClearButtonVisibility();
}

async function loadAuthorOptions() {
    const select = document.getElementById('author-filter');
    if (!select) return;
    try {
        const ql = activeFilters.quoteLang || 'en';
        const url = (ql && ql !== 'all') ? `/api/quotes/authors?language=${ql}` : '/api/quotes/authors';
        const res = await fetch(url);
        if (!res.ok) return;
        const authors = await res.json();
        while (select.options.length > 1) select.remove(1);
        authors.forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            select.appendChild(opt);
        });
    } catch (e) {
        console.warn('Could not load author list:', e);
    }
}

async function fetchFilteredQuote() {
    const params = new URLSearchParams();
    const ql = activeFilters.quoteLang;
    if (ql && ql !== 'all') params.set('language', ql);
    if (activeFilters.mood)   params.set('mood',   activeFilters.mood);
    if (activeFilters.topic)  params.set('topic',  activeFilters.topic);
    if (activeFilters.author) params.set('author', activeFilters.author);
    const excl = _buildExclude();
    if (excl) params.set('exclude', excl);

    const response = await fetch(`/api/quotes/filtered?${params.toString()}`);

    if (response.status === 404) {
        const err = new Error('no_results');
        err.code = 'no_results';
        throw err;
    }
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();
    return {
        quote:  data.quote,
        author: data.author || uiText[currentLanguage].unknown,
    };
}

function applyQuoteToUI(quoteObj) {
    const { quote, author } = quoteObj;
    const safeAuthor = author || uiText[currentLanguage].unknown;

    quoteText.classList.toggle('long-quote', quote.length > 120);
    quoteText.innerText = quote;
    authorText.innerText = safeAuthor;

    twitterBtn.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(quote)}%20-%20${encodeURIComponent(safeAuthor)}`;
    twitterBtn.title = uiText[currentLanguage].tweet;
    whatsappBtn.title = uiText[currentLanguage].whatsapp;

    quoteText.classList.remove('animate-in');
    void quoteText.offsetWidth;
    quoteText.classList.add('animate-in');

    updateFavoriteButtonState();
}

// ── Quote fetch helpers ───────────────────────────────────────────────────────

async function fetchEnglishQuote() {
    const excl = _buildExclude();
    const url = excl
        ? `/api/quotes/random?exclude=${encodeURIComponent(excl)}`
        : '/api/quotes/random';
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();
    return { quote: data.quote, author: data.author || uiText[currentLanguage].unknown };
}

async function fetchUrduQuote() {
    const excl = _buildExclude();
    const url = excl
        ? `/api/quotes/urdu/random?exclude=${encodeURIComponent(excl)}`
        : '/api/quotes/urdu/random';
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();
    return { quote: data.quote, author: data.author || uiText[currentLanguage].unknown };
}

async function getQuote() {
    isLoadingNew = true;
    updateNavigationState();
    showLoadingSpinner();

    try {
        let quoteData;
        const quoteLang = activeFilters.quoteLang || 'en';
        if (hasActiveFilters()) {
            quoteData = await fetchFilteredQuote();
        } else if (quoteLang === 'ur') {
            quoteData = await fetchUrduQuote();
        } else if (quoteLang === 'all') {
            quoteData = await fetchFilteredQuote();
        } else {
            quoteData = await fetchEnglishQuote();
        }
        const preparedQuote = { ...quoteData, language: quoteLang === 'all' ? 'en' : quoteLang };

        // Trim forward history if the user navigated back
        quotesHistory = quotesHistory.slice(0, currentQuoteIndex + 1);
        quotesHistory.push(preparedQuote);
        currentQuoteIndex = quotesHistory.length - 1;

        applyQuoteToUI(preparedQuote);
        shownQuoteTexts.add(preparedQuote.quote);
        if (shownQuoteTexts.size > SHOWN_QUOTES_MAX) {
            shownQuoteTexts.delete(shownQuoteTexts.values().next().value);
        }
    } catch (error) {
        console.error('Whoops, no quote', error);
        if (error.code === 'no_results') {
            quoteText.innerText = uiText[currentLanguage].noResults;
        } else {
            quoteText.innerText = uiText[currentLanguage].error;
        }
        authorText.innerText = '';
    } finally {
        isLoadingNew = false;
        removeLoadingSpinner();
        updateNavigationState();
    }
}

function showQuoteAtIndex(index) {
    if (index < 0 || index >= quotesHistory.length) return;
    currentQuoteIndex = index;
    applyQuoteToUI(quotesHistory[currentQuoteIndex]);
    removeLoadingSpinner();
    updateNavigationState();
}

function handlePrevQuote() {
    if (isLoadingNew) return;
    showQuoteAtIndex(currentQuoteIndex - 1);
}

function handleNextQuote() {
    if (isLoadingNew) return;
    if (currentQuoteIndex < quotesHistory.length - 1) {
        showQuoteAtIndex(currentQuoteIndex + 1);
    } else {
        getQuote();
    }
}

// ── Theme handling ────────────────────────────────────────────────────────────

const toggleTheme = () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
};

const updateThemeIcon = (theme) => {
    if (!themeIcon) return;
    if (theme === 'dark') {
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
    } else {
        themeIcon.classList.remove('fa-sun');
        themeIcon.classList.add('fa-moon');
    }
};

const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function updateUILanguage() {
    const strings = uiText[currentLanguage];
    nextQuoteBtn.textContent = strings.next;
    prevQuoteBtn.textContent = strings.prev;
    twitterBtn.title = strings.tweet;
    if (footerCopy) footerCopy.textContent = strings.footer;
    ttsBtn.innerHTML = `<i class="fas fa-volume-up"></i>${strings.speak}`;
    favBtn.innerHTML = `<i class="fas fa-heart"></i>${strings.favoriteAdd}`;
    viewFavBtn.innerHTML = `<i class="fas fa-list"></i>${strings.viewFavorites}`;
    const titleEl = favoritesModal?.querySelector('h2');
    if (titleEl) titleEl.textContent = strings.savedQuotes;
    whatsappBtn.innerHTML = `<i class="fab fa-whatsapp"></i>${strings.whatsapp}`;
}

function speakQuote() {
    const quoteObj = getCurrentQuote();
    if (!quoteObj || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(`${quoteObj.quote} — ${quoteObj.author}`);
    const targetLang = (quoteObj.language === 'ur') ? 'ur' : 'en';
    const urFallback = availableVoices.find(v => v.lang.toLowerCase().startsWith('ar'));
    const pickedVoice = availableVoices.find(v => v.lang.toLowerCase().startsWith(targetLang)) || urFallback || availableVoices[0];

    if (pickedVoice) {
        utterance.voice = pickedVoice;
        utterance.lang = pickedVoice.lang;
    } else {
        utterance.lang = (quoteObj.language === 'ur') ? 'ur-PK' : 'en-US';
    }

    utterance.rate = (quoteObj.language === 'ur') ? 0.9 : 1;
    speechSynthesis.speak(utterance);
}

function updateFavoriteButtonState() {
    const quoteObj = getCurrentQuote();
    if (!quoteObj) {
        favBtn.classList.remove('active');
        favBtn.innerHTML = `<i class="fas fa-heart"></i>${uiText[currentLanguage].favoriteAdd}`;
        return;
    }
    const exists = favorites.some(
        q => q.quote === quoteObj.quote && q.author === quoteObj.author && q.language === quoteObj.language
    );
    if (exists) {
        favBtn.classList.add('active');
        favBtn.innerHTML = `<i class="fas fa-heart"></i>${uiText[currentLanguage].favoriteAdded}`;
    } else {
        favBtn.classList.remove('active');
        favBtn.innerHTML = `<i class="fas fa-heart"></i>${uiText[currentLanguage].favoriteAdd}`;
    }
}

function showLoginPrompt() {
    const modal = document.getElementById('login-prompt-modal');
    if (modal) modal.hidden = false;
}

async function addToFavorites() {
    if (typeof AUTH === 'undefined' || !AUTH.isLoggedIn()) {
        showLoginPrompt();
        return;
    }
    const quoteObj = getCurrentQuote();
    if (!quoteObj) return;
    const exists = favorites.some(
        q => q.quote === quoteObj.quote && q.author === quoteObj.author && q.language === quoteObj.language
    );
    if (!exists) {
        await saveFavorite(quoteObj);
        // Heartbeat animation on successful save
        favBtn.classList.remove('btn-heartbeat');
        void favBtn.offsetWidth; // force reflow to restart animation
        favBtn.classList.add('btn-heartbeat');
        setTimeout(function () { favBtn.classList.remove('btn-heartbeat'); }, 500);
    }
    updateFavoriteButtonState();
}

function shareToWhatsApp() {
    const quoteObj = getCurrentQuote();
    if (!quoteObj) return;
    const text = `${quoteObj.quote} — ${quoteObj.author}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
}

function renderFavoritesList() {
    favoritesList.innerHTML = '';
    if (!favorites.length) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.textContent = uiText[currentLanguage].empty;
        favoritesList.appendChild(empty);
        return;
    }

    favorites.forEach(fav => {
        const item = document.createElement('div');
        item.className = 'favorite-item';

        const quoteEl = document.createElement('div');
        quoteEl.className = 'favorite-quote';
        quoteEl.textContent = fav.quote;

        const authorEl = document.createElement('div');
        authorEl.className = 'favorite-author';
        authorEl.textContent = fav.author || uiText[currentLanguage].unknown;

        item.appendChild(quoteEl);
        item.appendChild(authorEl);
        favoritesList.appendChild(item);
    });
}

async function openFavoritesModal() {
    if (typeof AUTH === 'undefined' || !AUTH.isLoggedIn()) {
        showLoginPrompt();
        return;
    }
    await loadFavorites();
    renderFavoritesList();
    favoritesModal.hidden = false;
}

function closeFavoritesModal() {
    favoritesModal.hidden = true;
}

// ── Filter UI wiring ─────────────────────────────────────────────────────────

function initFilters() {
    const filterBar = document.getElementById('filter-bar');
    if (!filterBar) return;

    const clearBtn     = document.getElementById('clear-filters-btn');
    const authorSelect = document.getElementById('author-filter');

    // Load initial author list for current language
    loadAuthorOptions();

    // Delegated click handler for all filter chips
    filterBar.addEventListener('click', (e) => {
        const chip = e.target.closest('.filter-chip');
        if (!chip) return;

        const filterType = chip.dataset.filter;   // 'mood', 'topic', or 'quoteLang'
        const value      = chip.dataset.value;

        // Language chips behave as radio buttons (always one active, cannot deselect)
        if (filterType === 'quoteLang') {
            filterBar.querySelectorAll('.filter-chip[data-filter="quoteLang"]').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            activeFilters.quoteLang = value;
            loadAuthorOptions();
            getQuote();
            return;
        }

        if (activeFilters[filterType] === value) {
            // Clicking active chip again deactivates it
            activeFilters[filterType] = null;
            chip.classList.remove('active');
        } else {
            // Deactivate any other chip in the same group
            filterBar.querySelectorAll(`.filter-chip[data-filter="${filterType}"]`)
                .forEach(c => c.classList.remove('active'));
            activeFilters[filterType] = value;
            chip.classList.add('active');
        }

        updateClearButtonVisibility();
        getQuote();
    });

    // Author select change
    if (authorSelect) {
        authorSelect.addEventListener('change', () => {
            activeFilters.author = authorSelect.value || null;
            authorSelect.classList.toggle('active', !!authorSelect.value);
            updateClearButtonVisibility();
            getQuote();
        });
    }

    // Clear all filters
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            clearAllFilters();
            getQuote();
        });
    }
}

// ── Event Listeners ───────────────────────────────────────────────────────────

nextQuoteBtn.addEventListener('click', handleNextQuote);
prevQuoteBtn.addEventListener('click', handlePrevQuote);
if (themeToggleBtn) themeToggleBtn.addEventListener('click', toggleTheme);
ttsBtn.addEventListener('click', speakQuote);
favBtn.addEventListener('click', addToFavorites);
whatsappBtn.addEventListener('click', shareToWhatsApp);
viewFavBtn.addEventListener('click', openFavoritesModal);
closeFavBtn.addEventListener('click', closeFavoritesModal);
favoritesModal.addEventListener('click', (e) => {
    if (e.target === favoritesModal) closeFavoritesModal();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !favoritesModal.hidden) {
        closeFavoritesModal();
    }
    if (e.key === 'Escape') {
        const lpm = document.getElementById('login-prompt-modal');
        if (lpm && !lpm.hidden) lpm.hidden = true;
    }
});

document.addEventListener('click', (e) => {
    const lpm = document.getElementById('login-prompt-modal');
    if (lpm && !lpm.hidden && e.target === lpm) lpm.hidden = true;
});

document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.getElementById('close-login-prompt');
    if (closeBtn) closeBtn.addEventListener('click', () => {
        const lpm = document.getElementById('login-prompt-modal');
        if (lpm) lpm.hidden = true;
    });
});

// ── On Load ───────────────────────────────────────────────────────────────────

populateVoices();
if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = populateVoices;
}
loadFavorites().then(() => {
    updateUILanguage();
    initFilters();
    getQuote();
});
