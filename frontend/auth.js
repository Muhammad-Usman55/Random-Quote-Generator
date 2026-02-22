// auth.js — Authentication state and token management
// Must be loaded BEFORE shared.js on every page.
// Exposes a clean AUTH namespace via an IIFE.

const AUTH = (() => {
    const ACCESS_KEY  = 'qg_access';
    const REFRESH_KEY = 'qg_refresh';
    const USER_KEY    = 'qg_user';

    // ── Storage helpers ────────────────────────────────────────────────────
    const getAccessToken  = () => localStorage.getItem(ACCESS_KEY);
    const getRefreshToken = () => localStorage.getItem(REFRESH_KEY);
    const isLoggedIn      = () => !!getAccessToken();

    const currentUser = () => {
        const raw = localStorage.getItem(USER_KEY);
        return raw ? JSON.parse(raw) : null;
    };

    const clearAll = () => {
        [ACCESS_KEY, REFRESH_KEY, USER_KEY].forEach(k => localStorage.removeItem(k));
    };

    const setTokens = (access, refresh) => {
        localStorage.setItem(ACCESS_KEY, access);
        if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
    };

    // ── Headers helper ─────────────────────────────────────────────────────
    const bearerHeaders = (extra = {}) => {
        const tok = getAccessToken();
        return tok
            ? { 'Authorization': `Bearer ${tok}`, ...extra }
            : { ...extra };
    };

    // ── Refresh access token using the stored refresh token ────────────────
    async function doRefresh() {
        const rt = getRefreshToken();
        if (!rt) return false;
        try {
            const res = await fetch('/api/auth/refresh', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ refresh_token: rt }),
            });
            if (!res.ok) return false;
            const data = await res.json();
            setTokens(data.access_token, data.refresh_token);
            return true;
        } catch {
            return false;
        }
    }

    // ── Authenticated fetch — auto-refreshes on 401 ────────────────────────
    async function apiFetch(url, options = {}) {
        options.headers = {
            'Content-Type': 'application/json',
            ...options.headers,
            ...bearerHeaders(),
        };
        let res = await fetch(url, options);

        if (res.status === 401) {
            const ok = await doRefresh();
            if (ok) {
                options.headers = { ...options.headers, ...bearerHeaders() };
                res = await fetch(url, options);
            } else {
                clearAll();
                window.location.href = '/login?expired=1';
                return null;
            }
        }
        return res;
    }

    // ── Load and cache the current user from the API ───────────────────────
    async function loadUser() {
        if (!isLoggedIn()) return null;
        try {
            const res = await apiFetch('/api/users/me');
            if (!res || !res.ok) { clearAll(); return null; }
            const user = await res.json();
            localStorage.setItem(USER_KEY, JSON.stringify(user));
            return user;
        } catch {
            return null;
        }
    }

    // ── Log out: blacklist token server-side, clear local state ───────────
    async function logout() {
        try {
            await fetch('/api/auth/logout', {
                method:  'POST',
                headers: bearerHeaders({ 'Content-Type': 'application/json' }),
            });
        } catch { /* ignore network errors on logout */ }
        clearAll();
        window.location.href = '/home';
    }

    // ── Handle Google OAuth callback: reads tokens from URL hash ──────────
    // Call this as early as possible (before DOMContentLoaded) so tokens are
    // stored before any page logic checks isLoggedIn().
    function handleOAuthCallback() {
        if (!window.location.hash) return;
        const params = new URLSearchParams(window.location.hash.slice(1));
        const access  = params.get('access');
        const refresh = params.get('refresh');
        if (access) {
            setTokens(access, refresh);
            // Clean the hash so tokens aren't visible in browser history
            history.replaceState(null, '', window.location.pathname + window.location.search);
        }
    }

    // Run immediately on script load (handles Google OAuth redirect)
    handleOAuthCallback();

    return {
        getAccessToken,
        getRefreshToken,
        setTokens,
        clearAll,
        isLoggedIn,
        currentUser,
        loadUser,
        bearerHeaders,
        apiFetch,
        doRefresh,
        logout,
        handleOAuthCallback,
    };
})();
