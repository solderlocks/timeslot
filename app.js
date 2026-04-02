/**
 * app.js: The reactive router and state manager for timeslot.ink
 */

import { renderCreateView } from './views/create.js';
import { renderPollView } from './views/poll.js';
import { renderSuccessView } from './views/success.js';

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
    if (e.target.matches('[data-link]')) {
        e.preventDefault();
        const href = e.target.getAttribute('href');
        history.pushState(null, '', href);
        router();
    }
});

// Initial route
router();
