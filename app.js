/**
 * app.js: The reactive router and state manager for timeslot.ink
 */

import { renderLandingView } from './views/landing.js';
import { renderCreateView } from './views/create.js';
import { renderPollView } from './views/poll.js';
import { renderSuccessView } from './views/success.js';

/**
 * Global Utilities
 */
window.showToast = function (message) {
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

window.openPhilosophyModal = function () {
    const modal = document.getElementById('philosophy-modal');
    if (modal) {
        modal.showModal();
        if (window.lucide) window.lucide.createIcons();
    }
};

window.closePhilosophyModal = function () {
    const modal = document.getElementById('philosophy-modal');
    if (modal) modal.close();
};

/**
 * Reusable Form Validation Helpers
 */
window.showFieldError = function (input, message) {
    // Prevent duplicate errors for the same input
    const existing = input.parentNode.querySelector(`.form-error[data-for="${input.id || input.name}"]`);
    if (existing) return;

    input.setAttribute('aria-invalid', 'true');
    const errorEl = document.createElement('small');
    errorEl.className = 'form-error fade-in';
    errorEl.innerText = message;
    errorEl.setAttribute('data-for', input.id || input.name);

    if (input.classList.contains('slot-input')) {
        const row = input.closest('.slot-row');
        row.parentNode.insertBefore(errorEl, row.nextSibling);
    } else {
        input.parentNode.insertBefore(errorEl, input.nextSibling);
    }
};

window.clearFieldErrors = function (form) {
    form.querySelectorAll('.form-error').forEach(el => el.remove());
    form.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
};

// Initialize Modal Close Buttons
document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.getElementById('close-philosophy-modal');
    const closeBtn2 = document.getElementById('close-philosophy-btn');
    if (closeBtn) closeBtn.onclick = window.closePhilosophyModal;
    if (closeBtn2) closeBtn2.onclick = window.closePhilosophyModal;

    // Close modals on backdrop click
    document.querySelectorAll('dialog').forEach(modal => {
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.close();
            }
        };
    });
});

const app = document.getElementById('app');

/**
 * Fragment-based/SearchParams Router
 */
async function router() {
    const params = new URLSearchParams(window.location.search);
    const pollId = params.get('id');
    const successId = params.get('success');
    const editToken = params.get('edit');   // respondent edit token
    const adminToken = params.get('admin'); // poll creator admin token
    const edited = params.get('edited') === 'true';
    const path = window.location.pathname;

    // Clear main container
    app.innerHTML = '';

    try {
        if (successId) {
            // Resolve the admin token without trusting the URL.
            // Priority: (1) history.state set by SPA nav, (2) sessionStorage for refreshes.
            const resolvedToken =
                history.state?.adminToken ??
                sessionStorage.getItem(`poll_admin_token_${successId}`);
            await renderSuccessView(app, successId, resolvedToken, edited);
        } else if (pollId && adminToken) {
            // Admin link lands on the "Original Creation View" to Edit the poll
            await renderCreateView(app, pollId, adminToken);
        } else if (pollId) {
            await renderPollView(app, pollId, editToken);
        } else if (path === '/create') {
            await renderCreateView(app);
        } else if (path === '/') {
            await renderLandingView(app);
        } else {
            // Fallback to landing if path unknown
            history.replaceState(null, '', '/');
            await renderLandingView(app);
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
window.router = router;
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

    // Global Philosophy Modal Trigger
    if (e.target.closest('.philosophy-trigger')) {
        e.preventDefault();
        window.openPhilosophyModal();
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

/**
 * Grid Selector Modal Logic
 */
let gridState = {
    currentWeekStart: new Date(),
    granularity: 60,
    startHour: 8,
    endHour: 21,
    selectedUTCs: new Set()
};

function toLocalISO(date) {
    const offset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() - offset);
    return localDate.toISOString().slice(0, 16);
}

window.openGridModal = function () {
    const modal = document.getElementById('grid-selector-modal');
    if (!modal) return;

    // Sync existing selections from the form
    gridState.selectedUTCs.clear();
    const existingSlots = document.querySelectorAll('.slot-input');
    existingSlots.forEach(input => {
        if (input.value) {
            const date = new Date(input.value);
            if (!isNaN(date.getTime())) {
                gridState.selectedUTCs.add(date.toISOString());
            }
        }
    });

    // Reset to current week, but keep current settings/selections for continuity
    const now = new Date();
    // Round to start of today local
    now.setHours(0, 0, 0, 0);
    gridState.currentWeekStart = now;

    initGridSelectorUI();
    renderBulkGrid();
    modal.showModal();
};

window.closeGridModal = function () {
    const modal = document.getElementById('grid-selector-modal');
    if (modal) modal.close();
};

function initGridSelectorUI() {
    const startSelect = document.getElementById('grid-start-hour');
    const endSelect = document.getElementById('grid-end-hour');
    const prevBtn = document.getElementById('prev-week-btn');
    const nextBtn = document.getElementById('next-week-btn');
    const granButtons = document.querySelectorAll('[data-granularity]');
    const closeBtn = document.getElementById('close-grid-modal');
    const addBtn = document.getElementById('add-selected-times-btn');

    if (!startSelect || !endSelect) return;

    // Populate selects
    startSelect.innerHTML = '';
    endSelect.innerHTML = '';
    for (let i = 0; i < 24; i++) {
        const ampm = i >= 12 ? 'PM' : 'AM';
        const displayHour = i % 12 || 12;
        const opt = `<option value="${i}">${displayHour}:00 ${ampm}</option>`;
        startSelect.insertAdjacentHTML('beforeend', opt);
        endSelect.insertAdjacentHTML('beforeend', opt);
    }

    startSelect.value = gridState.startHour;
    endSelect.value = gridState.endHour;

    // Boundary Listeners
    startSelect.onchange = (e) => {
        gridState.startHour = parseInt(e.target.value);
        renderBulkGrid();
    };
    endSelect.onchange = (e) => {
        gridState.endHour = parseInt(e.target.value);
        renderBulkGrid();
    };

    // Week Nav
    prevBtn.onclick = () => {
        gridState.currentWeekStart.setDate(gridState.currentWeekStart.getDate() - 7);
        renderBulkGrid();
    };
    nextBtn.onclick = () => {
        gridState.currentWeekStart.setDate(gridState.currentWeekStart.getDate() + 7);
        renderBulkGrid();
    };

    // Granularity
    granButtons.forEach(btn => {
        btn.onclick = () => {
            granButtons.forEach(b => b.removeAttribute('data-active'));
            btn.setAttribute('data-active', 'true');
            gridState.granularity = parseInt(btn.dataset.granularity);
            renderBulkGrid();
        };
    });

    closeBtn.onclick = window.closeGridModal;

    // Handoff to Create Form
    addBtn.onclick = () => {
        const slotsContainer = document.getElementById('slots-container');
        if (!slotsContainer) {
            window.closeGridModal();
            return;
        }

        const minDateAttr = slotsContainer.querySelector('input')?.getAttribute('min') || '';

        // Sort all selections by time
        const sortedUTCs = Array.from(gridState.selectedUTCs).sort();

        if (sortedUTCs.length > 0) {
            // Clear existing slots to replace them with the sorted set
            slotsContainer.innerHTML = '';

            sortedUTCs.forEach(utc => {
                const date = new Date(utc);
                const localValue = toLocalISO(date);

                const newRow = document.createElement('div');
                newRow.className = 'slot-row';
                newRow.innerHTML = `
                    <input type="datetime-local" class="slot-input" value="${localValue}" min="${minDateAttr}" required>
                    <button type="button" class="outline secondary remove-btn">×</button>
                `;
                slotsContainer.appendChild(newRow);
            });
        }

        gridState.selectedUTCs.clear();
        window.closeGridModal();
        window.showToast(`Added ${sortedUTCs.length} timeslots.`);
    };
}

function renderBulkGrid() {
    const container = document.getElementById('bulk-grid-container');
    const rangeText = document.getElementById('current-week-range');
    const prevBtn = document.getElementById('prev-week-btn');
    if (!container) return;

    container.innerHTML = '';

    const now = new Date();
    const todayMidnight = new Date(now);
    todayMidnight.setHours(0, 0, 0, 0);

    // Hide Previous Button if we're at or before today's week
    if (prevBtn) {
        // prevBtn.style.visibility = (gridState.currentWeekStart <= todayMidnight) ? 'hidden' : 'visible';
        prevBtn.style.display = (gridState.currentWeekStart <= todayMidnight) ? 'none' : 'inline-block';
    }

    // Update Week Range Display
    const weekStart = new Date(gridState.currentWeekStart);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const options = { month: 'short', day: 'numeric' };
    rangeText.innerText = `${weekStart.toLocaleDateString('en-US', options)} - ${weekEnd.toLocaleDateString('en-US', options)}`;

    // Generate Days
    for (let i = 0; i < 7; i++) {
        const dayDate = new Date(weekStart);
        dayDate.setDate(dayDate.getDate() + i);

        const dayCol = document.createElement('div');
        dayCol.className = 'bulk-grid-day';
        dayCol.innerHTML = `
            <div class="grid-day-header">
                <div class="grid-day-weekday">${dayDate.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                <div class="grid-day-date">${dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
            </div>
        `;

        // Generate Slots
        let startMins = gridState.startHour * 60;
        let endMins = gridState.endHour * 60;
        if (endMins <= startMins) endMins += 24 * 60;

        for (let m = startMins; m <= endMins; m += gridState.granularity) {
            const slotDate = new Date(dayDate);
            slotDate.setHours(Math.floor(m / 60) % 24, m % 60, 0, 0);

            const utcStr = slotDate.toISOString();
            const isSelected = gridState.selectedUTCs.has(utcStr);
            const isPast = slotDate < now;

            const cell = document.createElement('div');
            cell.className = `bulk-grid-cell ${isSelected ? 'selected' : ''} ${isPast ? 'past' : ''}`;
            cell.dataset.utc = utcStr;

            const displayTime = slotDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
            cell.innerHTML = `<span class="grid-cell-label">${displayTime.toLowerCase().replace(' ', '')}</span>`;

            if (!isPast) {
                cell.onclick = () => {
                    if (gridState.selectedUTCs.has(utcStr)) {
                        gridState.selectedUTCs.delete(utcStr);
                        cell.classList.remove('selected');
                    } else {
                        gridState.selectedUTCs.add(utcStr);
                        cell.classList.add('selected');
                    }
                };
            }

            dayCol.appendChild(cell);
        }

        container.appendChild(dayCol);
    }
}

// Initial label sync
updateThemeToggleLabel(document.documentElement.getAttribute('data-theme'));

// Initial route
router();

