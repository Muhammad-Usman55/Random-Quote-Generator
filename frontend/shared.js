// shared.js — Theme init, navigation, hamburger, lang toggle
// This file is loaded on ALL pages. On index.html, window.QUOTE_PAGE = true
// is set before this script loads to prevent double-listener conflicts with script.js.

// ─── IIFE: Apply saved theme immediately to prevent flash ───────────────────
;(function () {
    var saved = localStorage.getItem('theme');
    if (saved) {
        document.documentElement.setAttribute('data-theme', saved);
    }
})();

// ─── DOM-Ready Logic ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {

    // ── 1. Sync theme icon to match current saved state ──────────────────
    var themeBtn  = document.getElementById('theme-toggle');
    var themeIcon = themeBtn ? themeBtn.querySelector('i') : null;

    function isDark() {
        return document.documentElement.getAttribute('data-theme') === 'dark';
    }

    function syncThemeIcon() {
        if (!themeIcon) return;
        if (isDark()) {
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
        } else {
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
        }
    }
    syncThemeIcon();

    // ── 2. Active nav link detection ─────────────────────────────────────
    var page = window.location.pathname;
    // Treat bare root as /home
    if (page === '/' || page === '') page = '/home';

    document.querySelectorAll('.nav-link').forEach(function (link) {
        var href = link.getAttribute('href');
        if (href === page) {
            link.classList.add('nav-active');
        }
    });

    // ── 3. Hamburger menu ─────────────────────────────────────────────────
    var hamburger = document.getElementById('hamburger');
    var navMenu   = document.getElementById('nav-menu');

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function () {
            var open = navMenu.classList.toggle('nav-open');
            hamburger.setAttribute('aria-expanded', String(open));
        });

        // Close menu when a nav link is clicked (mobile)
        navMenu.querySelectorAll('.nav-link').forEach(function (link) {
            link.addEventListener('click', function () {
                navMenu.classList.remove('nav-open');
                hamburger.setAttribute('aria-expanded', 'false');
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', function (e) {
            if (!hamburger.contains(e.target) && !navMenu.contains(e.target)) {
                navMenu.classList.remove('nav-open');
                hamburger.setAttribute('aria-expanded', 'false');
            }
        });
    }

    // ── 4. Language is always English — clear any stale Urdu preference ──────
    localStorage.removeItem('language');
    document.documentElement.lang = 'en';
    document.body.dir = 'ltr';

    // ── 5. Theme controls (NON-HOME PAGES ONLY) ──────────────────────────
    //    On index.html, window.QUOTE_PAGE = true, so we skip these listeners
    //    to avoid double-toggling with script.js which registers its own.
    if (!window.QUOTE_PAGE) {

        // Theme toggle
        if (themeBtn) {
            themeBtn.addEventListener('click', function () {
                var next = isDark() ? 'light' : 'dark';
                document.documentElement.setAttribute('data-theme', next);
                localStorage.setItem('theme', next);
                syncThemeIcon();
            });
        }
    }

    // ── 6. Auth-aware nav slot ────────────────────────────────────────────
    // auth.js must be loaded before shared.js for AUTH to be defined.
    if (typeof AUTH !== 'undefined') {
        var authSlot = document.getElementById('auth-slot');
        if (authSlot) {
            if (AUTH.isLoggedIn()) {
                var _u = AUTH.currentUser();
                var _displayName = _u ? (_u.username || _u.email) : 'Account';
                var _avatarHtml = (_u && _u.profile_picture)
                    ? '<img src="' + _u.profile_picture + '" class="auth-avatar" alt="avatar">'
                    : '<i class="fas fa-user-circle auth-avatar-icon"></i>';

                authSlot.innerHTML =
                    '<div class="auth-dropdown">' +
                        '<button class="auth-user-btn" id="auth-user-btn" aria-expanded="false">' +
                            _avatarHtml +
                            '<span class="auth-username">' + _displayName + '</span>' +
                            ' <i class="fas fa-chevron-down fa-xs"></i>' +
                        '</button>' +
                        '<div class="auth-dropdown-menu" id="auth-dropdown-menu" hidden>' +
                            '<a href="/profile"><i class="fas fa-user fa-xs"></i> Profile</a>' +
                            '<a href="/favorites"><i class="fas fa-heart fa-xs"></i> Saved Quotes</a>' +
                            '<button id="auth-logout-btn"><i class="fas fa-sign-out-alt fa-xs"></i> Log Out</button>' +
                        '</div>' +
                    '</div>';

                document.getElementById('auth-user-btn').addEventListener('click', function () {
                    var menu = document.getElementById('auth-dropdown-menu');
                    var isOpen = menu.hidden;
                    menu.hidden = !isOpen;
                    this.setAttribute('aria-expanded', String(isOpen));
                });

                document.getElementById('auth-logout-btn').addEventListener('click', function () {
                    AUTH.logout();
                });

                // Close dropdown on outside click
                document.addEventListener('click', function (e) {
                    var btn  = document.getElementById('auth-user-btn');
                    var menu = document.getElementById('auth-dropdown-menu');
                    if (btn && menu && !btn.contains(e.target) && !menu.contains(e.target)) {
                        menu.hidden = true;
                        btn.setAttribute('aria-expanded', 'false');
                    }
                });

            } else {
                // Guest: show Login + Sign Up buttons
                authSlot.innerHTML =
                    '<a href="/login" class="button auth-nav-btn auth-login-btn">Log In</a>' +
                    '<a href="/signup" class="button auth-nav-btn auth-signup-btn">Sign Up</a>';
            }
        }
    }

    // ── 7. Scroll-reveal for glass-cards and .sr-item elements ───────────
    if ('IntersectionObserver' in window) {
        var srObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('sr-visible');
                    srObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.08 });

        var srCount = 0;
        document.querySelectorAll('.glass-card, .sr-item').forEach(function (el) {
            var rect = el.getBoundingClientRect();
            // Only reveal-animate elements that start BELOW the visible area
            if (rect.top >= window.innerHeight - 50) {
                el.classList.add('sr');
                el.style.transitionDelay = Math.min(srCount * 0.07, 0.42) + 's';
                srObserver.observe(el);
                srCount++;
            }
        });
    }

});

// ── Button ripple effect ──────────────────────────────────────────────────
document.addEventListener('click', function (e) {
    var btn = e.target.closest('.button');
    if (!btn) return;
    var r = document.createElement('span');
    r.className = 'ripple-wave';
    var rect = btn.getBoundingClientRect();
    var size = Math.max(rect.width, rect.height) * 2;
    r.style.cssText = 'width:' + size + 'px;height:' + size + 'px;' +
        'left:' + (e.clientX - rect.left - size / 2) + 'px;' +
        'top:'  + (e.clientY - rect.top  - size / 2) + 'px;';
    btn.appendChild(r);
    setTimeout(function () { r.remove(); }, 620);
});

