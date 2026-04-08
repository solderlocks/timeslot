/**
 * views/create.js: The "Create Poll" view logic.
 */

import { API, toUTC, toLocal, isPastDate } from '../api.js';

export async function renderCreateView(container, pollId = null, adminToken = null) {
    let poll = null;
    let isEdit = !!(pollId && adminToken);

    if (isEdit) {
        container.innerHTML = `<article aria-busy="true"></article>`;
        try {
            poll = await API.getPoll(pollId);
        } catch (err) {
            console.error(err);
            container.innerHTML = `<article><h3>Error</h3><p>Could not load poll for editing.</p></article>`;
            return;
        }
    }

    // Current local time for min attribute
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const minDate = new Date(now.getTime() - offset).toISOString().slice(0, 16);

    container.innerHTML = `
        <article class="fade-in">
            <header>
                <div class="poll-header-row">
                    <div>
                        <h2 class="poll-title poll-title-compact">${isEdit ? 'Edit Poll' : 'Create a Poll'}</h2>
                        <p class="poll-description-muted">${isEdit ? 'Update your poll details and timeslots.' : 'Propose times and share the link.'}</p>
                    </div>
                </div>
            </header>
            ${isEdit ? `<p class="instruction-text hint-text" style="color: #d97706; margin-top: 1rem;">⚠️ Saving changes will permanently reset the poll and delete all current responses.</p>` : ''}
            <form id="create-poll-form">
                <label for="title">Poll Title
                    <input type="text" id="title" name="title" placeholder="e.g., Launch Party" required value="${isEdit ? poll.title : ''}">
                </label>
                
                <label for="description">Description (Optional)
                    <textarea id="description" name="description" placeholder="Where, why, duration, etc.">${isEdit ? (poll.description || '') : ''}</textarea>
                </label>
                
                <label for="duration" style="display: none;">Duration (Optional)
                    <input type="text" id="duration" name="duration" placeholder="e.g., 1 hour, 45 mins" value="${isEdit ? (poll.duration || '') : ''}">
                </label>
                
                <fieldset>
                    <legend>Proposed Times</legend>
                    <div id="slots-container">
                        ${isEdit ?
            poll.options.map(opt => `
                                <div class="slot-row">
                                    <input type="datetime-local" class="slot-input" value="${toLocal(opt.start_time)}" min="${minDate}" required>
                                    <button type="button" class="outline secondary remove-btn">×</button>
                                </div>
                            `).join('')
            : `
                                <div class="slot-row">
                                    <input type="datetime-local" class="slot-input" min="${minDate}" required>
                                    <button type="button" class="outline secondary remove-btn">×</button>
                                </div>
                            `
        }
                    </div>
                    <footer class="slot-footer">
                        <button type="button" id="add-slot-btn" class="clear-btn">+ Add another slot</button>
                        <button type="button" id="open-grid-btn" class="clear-btn float-right">🗓️ Grid View</button>
                    </footer>
                </fieldset>
                
                <hr>
                
                <button type="submit" id="submit-poll-btn" class="primary margin-0">${isEdit ? 'Save Changes' : 'Create Poll'}</button>
            </form>
            
        </article>
    `;

    const form = container.querySelector('#create-poll-form');
    const slotsContainer = container.querySelector('#slots-container');
    const addSlotBtn = container.querySelector('#add-slot-btn');
    const openGridBtn = container.querySelector('#open-grid-btn');

    if (openGridBtn) openGridBtn.onclick = window.openGridModal;

    /**
     * Smart Slot Logic: New slot = Previous slot + 1 hour.
     */
    addSlotBtn.onclick = () => {
        const lastInput = slotsContainer.querySelector('.slot-row:last-child input');
        let nextValue = '';

        if (lastInput && lastInput.value) {
            const lastDate = new Date(lastInput.value);
            lastDate.setHours(lastDate.getHours() + 1);

            // Format to YYYY-MM-DDTHH:mm for datetime-local
            const offset = lastDate.getTimezoneOffset() * 60000;
            const localDate = new Date(lastDate.getTime() - offset);
            nextValue = localDate.toISOString().slice(0, 16);
        }

        const newRow = document.createElement('div');
        newRow.className = 'slot-row';
        newRow.innerHTML = `
            <input type="datetime-local" class="slot-input" value="${nextValue}" min="${minDate}" required>
            <button type="button" class="outline secondary remove-btn">×</button>
        `;
        slotsContainer.appendChild(newRow);

        // Focus the new input
        newRow.querySelector('input').focus();
    };

    /**
     * Keyboard Interaction: Enter key on slot input adds a new slot.
     */
    slotsContainer.onkeydown = (e) => {
        if (e.key === 'Enter' && e.target.classList.contains('slot-input')) {
            e.preventDefault();
            addSlotBtn.click();
        }
    };

    /**
     * Event Delegation for "Remove" Button clicks.
     */
    slotsContainer.onclick = (e) => {
        if (e.target.closest('.remove-btn')) {
            const row = e.target.closest('.slot-row');
            if (slotsContainer.children.length > 1) {
                row.remove();
            } else {
                // Clear value of the first/only slot instead of removing it
                row.querySelector('input').value = '';
            }
        }
    };

    /**
     * Form Submission with Field-Specific Errors.
     */
    form.onsubmit = async (e) => {
        e.preventDefault();

        // 1. Clear previous errors
        window.clearFieldErrors(form);

        const titleInput = form.querySelector('#title');
        const inputs = slotsContainer.querySelectorAll('.slot-input');
        let isValid = true;

        // 2. Validate Title
        if (!titleInput.value.trim()) {
            window.showFieldError(titleInput, "Title is required.");
            isValid = false;
        }

        // 3. Validate Slots
        const options = [];
        inputs.forEach(input => {
            const utcString = toUTC(input.value);
            if (!input.value) {
                window.showFieldError(input, "Please select a date and time.");
                isValid = false;
            } else if (isPastDate(utcString)) {
                window.showFieldError(input, "Date cannot be in the past.");
                isValid = false;
            } else {
                options.push({
                    start_time: utcString,
                    end_time: null
                });
            }
        });

        if (!isValid) {
            window.showToast("Please fix the highlighted errors.");
            return;
        }

        try {
            const submitBtn = form.querySelector('#submit-poll-btn');
            submitBtn.setAttribute('aria-busy', 'true');
            submitBtn.disabled = true;

            const payload = {
                title: titleInput.value,
                description: form.querySelector('#description').value,
                duration: form.querySelector('#duration').value,
                options
            };

            if (isEdit) {
                await API.updatePoll(pollId, adminToken, payload);
                // Redirect back to edit success view
                window.location.search = `?success=${pollId}&admin=${adminToken}&edited=true`;
            } else {
                const newPoll = await API.createPoll(payload);
                // Navigate to Success view
                window.location.search = `?success=${newPoll.id}&admin=${newPoll.edit_token}`;
            }
        } catch (err) {
            console.error(err);
            alert('Failed to create poll: ' + err.message);
        }
    };
}
