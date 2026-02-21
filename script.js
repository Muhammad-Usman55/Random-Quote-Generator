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
const themeIcon = themeToggleBtn.querySelector('i');
const langToggleBtn = document.getElementById('lang-toggle');
const footerCopy = document.querySelector('.main-footer p');
const favoritesModal = document.getElementById('favorites-modal');
const favoritesList = document.getElementById('favorites-list');
const closeFavBtn = document.getElementById('close-fav');

const urduQuotes = [
    { quote: 'اپنے دشمنوں کو معاف کر دو مگر ان کے نام کبھی مت بھولو۔', author: 'جان ایف کینیڈی' },
    { quote: 'ہزاروں خواہشیں ایسی کہ ہر خواہش پہ دم نکلے۔', author: 'مرزا غالب' },
    { quote: 'جو ہمت کرتا ہے وہی کامیابی پاتا ہے۔', author: 'علامہ اقبال' },
    { quote: 'انسان وہی ہے جو انسانیت کے کام آئے۔', author: 'عبدالستار ایدھی' },
    { quote: 'امید وہ روشنی ہے جو اندھیرے میں بھی راستہ دکھاتی ہے۔', author: 'نامعلوم' },
    { quote: 'حاصلِ زندگی کیا ہے؟ ایک مسکراہٹ اور سکون۔', author: 'اشفاق احمد' }
];

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
        langBtn: 'اردو',
        footer: '© 2026 Random Quote Generator. All rights reserved.',
        unknown: 'Unknown',
        error: 'An error occurred. Please try again.'
    },
    ur: {
        next: 'اگلا اقتباس',
        prev: 'پچھلا اقتباس',
        tweet: 'اس اقتباس کو ٹویٹ کریں!',
        whatsapp: 'واٹس ایپ پر شیئر کریں',
        speak: 'آواز',
        favoriteAdd: 'پسندیدہ میں شامل کریں',
        favoriteAdded: 'محفوظ',
        viewFavorites: 'محفوظ اقتباسات',
        savedQuotes: 'محفوظ اقتباسات',
        empty: 'ابھی تک کوئی پسندیدہ محفوظ نہیں ہے۔ دل پر ٹیپ کریں۔',
        langBtn: 'English',
        footer: '© 2026 رینڈم کوٹ جنریٹر۔ جملہ حقوق محفوظ ہیں۔',
        unknown: 'نامعلوم',
        error: 'کچھ مسئلہ آیا۔ دوبارہ کوشش کریں۔'
    }
};

let quotesHistory = [];
let currentQuoteIndex = -1;
let currentLanguage = localStorage.getItem('language') || 'en';
let isLoadingNew = false;
let favorites = [];
let availableVoices = [];

function populateVoices() {
    availableVoices = speechSynthesis.getVoices();
}

function loadFavorites() {
    try {
        const stored = localStorage.getItem('favorites');
        favorites = stored ? JSON.parse(stored) : [];
    } catch (e) {
        favorites = [];
    }
}

function saveFavorites() {
    localStorage.setItem('favorites', JSON.stringify(favorites));
}

function getCurrentQuote() {
    return quotesHistory[currentQuoteIndex] || null;
}

function showLoadingSpinner() {
    loader.style.display = 'block';
    quoteContainer.hidden = true;
}

function removeLoadingSpinner() {
    loader.style.display = 'none';
    quoteContainer.hidden = false;
}

function updateNavigationState() {
    prevQuoteBtn.disabled = currentQuoteIndex <= 0 || isLoadingNew;
    nextQuoteBtn.disabled = isLoadingNew;
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

async function fetchEnglishQuote() {
    const apiUrl = 'https://dummyjson.com/quotes/random';
    const [response] = await Promise.all([
        fetch(apiUrl),
        new Promise(resolve => setTimeout(resolve, 600))
    ]);

    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();
    return { quote: data.quote, author: data.author || uiText[currentLanguage].unknown };
}

async function fetchUrduQuote() {
    await new Promise(resolve => setTimeout(resolve, 250));
    const randomQuote = urduQuotes[Math.floor(Math.random() * urduQuotes.length)];
    return { quote: randomQuote.quote, author: randomQuote.author || uiText[currentLanguage].unknown };
}

async function getQuote() {
    isLoadingNew = true;
    updateNavigationState();
    showLoadingSpinner();

    try {
        const quoteData = currentLanguage === 'ur' ? await fetchUrduQuote() : await fetchEnglishQuote();
        const preparedQuote = { ...quoteData, language: currentLanguage };

        // Trim forward history if the user navigated back
        quotesHistory = quotesHistory.slice(0, currentQuoteIndex + 1);
        quotesHistory.push(preparedQuote);
        currentQuoteIndex = quotesHistory.length - 1;

        applyQuoteToUI(preparedQuote);
    } catch (error) {
        console.error('Whoops, no quote', error);
        quoteText.innerText = uiText[currentLanguage].error;
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

// Theme Handling
const toggleTheme = () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
};

const updateThemeIcon = (theme) => {
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

function applyLanguageDirection() {
    document.documentElement.lang = currentLanguage === 'ur' ? 'ur' : 'en';
    document.body.dir = currentLanguage === 'ur' ? 'rtl' : 'ltr';
}

function updateUILanguage() {
    const strings = uiText[currentLanguage];
    nextQuoteBtn.textContent = strings.next;
    prevQuoteBtn.textContent = strings.prev;
    twitterBtn.title = strings.tweet;
    langToggleBtn.textContent = strings.langBtn;
    langToggleBtn.setAttribute('aria-label', strings.langBtn === 'اردو' ? 'Switch to Urdu' : 'Switch to English');
    if (footerCopy) footerCopy.textContent = strings.footer;
    ttsBtn.innerHTML = `<i class="fas fa-volume-up"></i>${strings.speak}`;
    favBtn.innerHTML = `<i class="fas fa-heart"></i>${strings.favoriteAdd}`;
    viewFavBtn.innerHTML = `<i class="fas fa-list"></i>${strings.viewFavorites}`;
    const titleEl = favoritesModal?.querySelector('h2');
    if (titleEl) titleEl.textContent = strings.savedQuotes;
    whatsappBtn.innerHTML = `<i class="fab fa-whatsapp"></i>${strings.whatsapp}`;
    applyLanguageDirection();
}

function toggleLanguage() {
    currentLanguage = currentLanguage === 'en' ? 'ur' : 'en';
    localStorage.setItem('language', currentLanguage);
    updateUILanguage();
    quotesHistory = [];
    currentQuoteIndex = -1;
    getQuote();
}

function speakQuote() {
    const quoteObj = getCurrentQuote();
    if (!quoteObj || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(`${quoteObj.quote} — ${quoteObj.author}`);
    const targetLang = currentLanguage === 'ur' ? 'ur' : 'en';
    const urFallback = availableVoices.find(v => v.lang.toLowerCase().startsWith('ar'));
    const pickedVoice = availableVoices.find(v => v.lang.toLowerCase().startsWith(targetLang)) || urFallback || availableVoices[0];

    if (pickedVoice) {
        utterance.voice = pickedVoice;
        utterance.lang = pickedVoice.lang;
    } else {
        utterance.lang = currentLanguage === 'ur' ? 'ur-PK' : 'en-US';
    }

    utterance.rate = currentLanguage === 'ur' ? 0.9 : 1;
    speechSynthesis.speak(utterance);
}

function updateFavoriteButtonState() {
    const quoteObj = getCurrentQuote();
    if (!quoteObj) {
        favBtn.classList.remove('active');
        favBtn.innerHTML = `<i class="fas fa-heart"></i>${uiText[currentLanguage].favoriteAdd}`;
        return;
    }
    const exists = favorites.some(q => q.quote === quoteObj.quote && q.author === quoteObj.author && q.language === quoteObj.language);
    if (exists) {
        favBtn.classList.add('active');
        favBtn.innerHTML = `<i class="fas fa-heart"></i>${uiText[currentLanguage].favoriteAdded}`;
    } else {
        favBtn.classList.remove('active');
        favBtn.innerHTML = `<i class="fas fa-heart"></i>${uiText[currentLanguage].favoriteAdd}`;
    }
}

function addToFavorites() {
    const quoteObj = getCurrentQuote();
    if (!quoteObj) return;
    const exists = favorites.some(q => q.quote === quoteObj.quote && q.author === quoteObj.author && q.language === quoteObj.language);
    if (!exists) {
        favorites.push(quoteObj);
        saveFavorites();
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

function openFavoritesModal() {
    renderFavoritesList();
    favoritesModal.hidden = false;
}

function closeFavoritesModal() {
    favoritesModal.hidden = true;
}

// Event Listeners
nextQuoteBtn.addEventListener('click', handleNextQuote);
prevQuoteBtn.addEventListener('click', handlePrevQuote);
themeToggleBtn.addEventListener('click', toggleTheme);
langToggleBtn.addEventListener('click', toggleLanguage);
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
});

// On Load
populateVoices();
if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = populateVoices;
}
loadFavorites();
updateUILanguage();
getQuote();
