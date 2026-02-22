// home.js — Typed text, scroll reveal, animated counters, smooth scroll

// ── Typed text animation ─────────────────────────────────────────────────────
const typedWordsMap = {
    en: ['Inspire You', 'Move You', 'Guide You', 'Motivate You', 'Uplift You', 'Change You', 'Awaken You', 'Push Your Limits'],
    ur: ['\u0622\u067e \u06a9\u0648 \u0645\u062a\u0627\u062b\u0631 \u06a9\u0631\u06cc\u06ba', '\u0622\u067e \u06a9\u0648 \u0645\u062a\u062d\u0631\u06a9 \u06a9\u0631\u06cc\u06ba', '\u0622\u067e \u06a9\u06cc \u0631\u06c1\u0646\u0645\u0627\u0626\u06cc \u06a9\u0631\u06cc\u06ba', '\u0622\u067e \u06a9\u0648 \u062d\u0648\u0635\u0644\u06c1 \u062f\u06cc\u06ba', '\u0622\u067e \u06a9\u0648 \u0628\u062f\u0644 \u062f\u06cc\u06ba', '\u0622\u067e \u06a9\u0648 \u062c\u06af\u0627\u0626\u06cc\u06ba', '\u0622\u067e \u06a9\u06cc \u062d\u062f\u0648\u062f \u0628\u0691\u06be\u0627\u0626\u06cc\u06ba']
};
let currentTypedLang = localStorage.getItem('language') || 'en';
let typedWords   = typedWordsMap[currentTypedLang] || typedWordsMap.en;
let typedWordIdx   = 0;
let typedCharIdx   = 0;
let typedDeleting  = false;
const typedTarget  = document.getElementById('typed-text');

function runTyped() {
    if (!typedTarget) return;
    const word = typedWords[typedWordIdx];

    if (typedDeleting) {
        typedTarget.textContent = word.substring(0, typedCharIdx--);
    } else {
        typedTarget.textContent = word.substring(0, typedCharIdx++);
    }

    let speed = typedDeleting ? 48 : 88;

    if (!typedDeleting && typedCharIdx === word.length + 1) {
        typedDeleting = true;
        speed = 1700;
    } else if (typedDeleting && typedCharIdx < 0) {
        typedDeleting  = false;
        typedCharIdx   = 0;
        typedWordIdx   = (typedWordIdx + 1) % typedWords.length;
        speed = 400;
    }

    setTimeout(runTyped, speed);
}

// ── Scroll reveal via IntersectionObserver ───────────────────────────────────
function initScrollReveal() {
    const els = document.querySelectorAll(
        '.reveal, .reveal-left, .reveal-right'
    );

    if (!els.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    els.forEach(el => observer.observe(el));
}

// ── Animated number counter ──────────────────────────────────────────────────
function initCounters() {
    const counters = document.querySelectorAll('.counter');
    if (!counters.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const el     = entry.target;
            const target = parseInt(el.getAttribute('data-target'), 10);
            const dur    = 1800;
            const step   = target / (dur / 16);
            let current  = 0;

            const tick   = setInterval(() => {
                current = Math.min(current + step, target);
                el.textContent = Math.floor(current).toLocaleString();
                if (current >= target) clearInterval(tick);
            }, 16);

            observer.unobserve(el);
        });
    }, { threshold: 0.5 });

    counters.forEach(c => observer.observe(c));
}

// ── Smooth scroll to quote section ──────────────────────────────────────────
function initScrollBtn() {
    const quoteSection = document.getElementById('quote-section');
    const scrollEl     = document.getElementById('scroll-to-quote');

    function scrollToQuote(e) {
        if (e) e.preventDefault();   // stop the native anchor jump; JS handles it
        quoteSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    scrollEl?.addEventListener('click', scrollToQuote);

    // Also wire the "Get a Quote" hero button
    document.getElementById('hero-get-quote')
        ?.addEventListener('click', scrollToQuote);
}

// ── Init all on DOM ready ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    runTyped();
    initScrollReveal();
    initCounters();
    initScrollBtn();
});

// ── Switch typed words when UI language changes ───────────────────────────────
document.addEventListener('langChanged', () => {
    const lang = localStorage.getItem('language') || 'en';
    typedWords   = typedWordsMap[lang] || typedWordsMap.en;
    typedWordIdx  = 0;
    typedCharIdx  = 0;
    typedDeleting = false;
    if (typedTarget) typedTarget.textContent = '';
});
