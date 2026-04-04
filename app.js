/**
 * app.js: The reactive router and state manager for timeslot.ink
 */

import { renderCreateView } from './views/create.js';
import { renderPollView } from './views/poll.js';
import { renderSuccessView } from './views/success.js';

/**
 * Global Toast Utility
 */
window.showToast = function(message) {
    const existing = document.querySelector('.toast-notification');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast-notification fade-in';
    toast.innerHTML = `
        <span class="toast-message">${message}</span>
        <button class="toast-close" aria-label="Close">×</button>
    `;
    document.body.appendChild(toast);
    
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.onclick = () => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 500);
    };

    setTimeout(() => {
        if (toast.parentNode) {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 500);
        }
    }, 4000);
};

const app = document.getElementById('app');

/**
 * Fragment-based/SearchParams Router
 */
async function router() {
    const params = new URLSearchParams(window.location.search);
    const pollId = params.get('id');
    const successId = params.get('success');
    const editToken = params.get('edit'); // Optional for returning user

    // Clear main container
    app.innerHTML = '';

    try {
        if (successId) {
            // View S: Intermediate Success
            await renderSuccessView(app, successId);
        } else if (pollId) {
            // View B: Poll View (Implementation in Phase 4)
            // For now, we'll implement a simple placeholder or the real one
            await renderPollView(app, pollId, editToken);
        } else {
            // View A: Create Poll (Default)
            await renderCreateView(app);
        }
    } catch (err) {
        console.error(err);
        app.innerHTML = `
            <article class="p-4 border border-red-500">
                <h4 class="text-red-600">Error</h4>
                <p>${err.message}</p>
                <a href="/" class="button">Go Home</a>
            </article>
        `;
    }
}

/**
 * Handle navigation without page reloads
 */
window.onpopstate = router;

// Global navigation handler
document.addEventListener('click', e => {
    if (e.target.matches('[data-link]') || e.target.closest('#nav-create')) {
        const target = e.target.matches('[data-link]') ? e.target : e.target.closest('#nav-create');
        if (target.pathname === window.location.pathname && target.search === window.location.search) {
             // Already here
        } else {
            e.preventDefault();
            const href = target.getAttribute('href');
            history.pushState(null, '', href);
            router();
        }
    }

    // Global Theme Toggle
    if (e.target.closest('#theme-toggle')) {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeToggleLabel(newTheme);
    }
});

function updateThemeToggleLabel(theme) {
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
        themeBtn.innerHTML = theme === 'dark' ? '🌙 Dark' : '☀️ Light';
    }
}

// Initial label sync
updateThemeToggleLabel(document.documentElement.getAttribute('data-theme'));

// Initial route
router();
