// contact.js — Contact form validation and submission (backend API version)

document.addEventListener('DOMContentLoaded', function () {
    var form    = document.getElementById('contact-form');
    var success = document.getElementById('success-msg');

    if (!form) return;

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function setError(fieldId, msg) {
        var field = document.getElementById(fieldId);
        var errEl = document.getElementById(fieldId + '-error');
        if (field) {
            if (msg) {
                field.classList.add('error');
            } else {
                field.classList.remove('error');
            }
        }
        if (errEl) {
            errEl.textContent = msg || '';
        }
    }

    function validate() {
        var name    = (document.getElementById('name')?.value    || '').trim();
        var email   = (document.getElementById('email')?.value   || '').trim();
        var subject = (document.getElementById('subject')?.value || '').trim();
        var message = (document.getElementById('message')?.value || '').trim();
        var valid = true;

        if (name.length < 2) {
            setError('name', 'Name must be at least 2 characters.');
            valid = false;
        } else {
            setError('name', '');
        }

        if (!isValidEmail(email)) {
            setError('email', 'Please enter a valid email address.');
            valid = false;
        } else {
            setError('email', '');
        }

        if (subject.length < 3) {
            setError('subject', 'Please enter a subject (at least 3 characters).');
            valid = false;
        } else {
            setError('subject', '');
        }

        if (message.length < 20) {
            setError('message', 'Message must be at least 20 characters.');
            valid = false;
        } else {
            setError('message', '');
        }

        return valid;
    }

    // Inline validation on blur for better UX
    ['name', 'email', 'subject', 'message'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) {
            el.addEventListener('blur', validate);
        }
    });

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        if (!validate()) return;

        var submitBtn = form.querySelector('[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

        var payload = {
            name:    (document.getElementById('name')?.value    || '').trim(),
            email:   (document.getElementById('email')?.value   || '').trim(),
            subject: (document.getElementById('subject')?.value || '').trim(),
            message: (document.getElementById('message')?.value || '').trim()
        };

        try {
            var res = await fetch('/api/contact/', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(payload)
            });

            if (!res.ok) {
                var errData = await res.json().catch(() => ({}));
                var detail  = errData.detail || 'Server error. Please try again.';
                // Surface first validation error if it's an array
                if (Array.isArray(detail)) {
                    detail = detail.map(function (d) { return d.msg || String(d); }).join(' ');
                }
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Message';
                setError('message', detail);
                return;
            }

            form.hidden    = true;
            success.hidden = false;
        } catch (err) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Message';
            setError('message', 'Could not reach the server. Please try again.');
        }
    });
});
