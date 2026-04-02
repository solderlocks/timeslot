/**
 * views/create.js: The "Create Poll" view logic.
 */

import { API, toUTC, isPastDate } from '../api.js';

export async function renderCreateView(container) {
    container.innerHTML = `
        <article class="fade-in">
            <header>
                <h2>Create Your Poll</h2>
                <p>Stateless. Serverless. Seamless. No accounts required.</p>
            </header>
            
            <form id="create-poll-form">
                <label for="title">Poll Title
                    <input type="text" id="title" name="title" placeholder="e.g., Launch Party" required>
                </label>
                
                <label for="description">Description (Optional)
                    <textarea id="description" name="description" placeholder="Where and why..."></textarea>
                </label>
                
                <fieldset>
                    <legend>Proposed Time Slots</legend>
                    <div id="slots-container">
                        <div class="slot-row">
                            <input type="datetime-local" class="slot-input" required>
                            <button type="button" class="outline secondary remove-btn" style="flex: 0 0 auto;">×</button>
                        </div>
                    </div>
                    <footer style="margin-top: 1rem;">
                        <button type="button" id="add-slot-btn" class="secondary outline">+ Add another slot</button>
                    </footer>
                </fieldset>
                
                <hr>
                
                <button type="submit" id="submit-poll-btn" class="primary">Create My Poll</button>
            </form>
        </article>
    `;

    const form = container.querySelector('#create-poll-form');
    const slotsContainer = container.querySelector('#slots-container');
    const addSlotBtn = container.querySelector('#add-slot-btn');

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
            <input type="datetime-local" class="slot-input" value="${nextValue}" required>
            <button type="button" class="outline secondary remove-btn" style="flex: 0 0 auto;">×</button>
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
            // Keep at least one slot
            if (slotsContainer.children.length > 1) {
                row.remove();
            }
        }
    };

    /**
     * Form Submission with Aria-Invalid Validation.
     */
    form.onsubmit = async (e) => {
        e.preventDefault();
        const inputs = slotsContainer.querySelectorAll('.slot-input');
        const titleInput = form.querySelector('#title');
        
        let isValid = true;

        // Reset all aria-invalid states
        form.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));

        if (!titleInput.value.trim()) {
            titleInput.setAttribute('aria-invalid', 'true');
            isValid = false;
        }

        const options = [];
        inputs.forEach(input => {
            const utcString = toUTC(input.value);
            if (!input.value || isPastDate(utcString)) {
                input.setAttribute('aria-invalid', 'true');
                isValid = false;
            } else {
                options.push({
                    start_time: utcString,
                    end_time: null // We'll add end-time support later if needed, or simple points in time
                });
            }
        });

        if (!isValid) return;

        try {
            const submitBtn = form.querySelector('#submit-poll-btn');
            submitBtn.setAttribute('aria-busy', 'true');
            submitBtn.disabled = true;

            const payload = {
                title: titleInput.value,
                description: form.querySelector('#description').value,
                options
            };

            const poll = await API.createPoll(payload);
            
            // Navigate to Success view
            window.location.search = `?success=${poll.id}`;
        } catch (err) {
            console.error(err);
            alert('Failed to create poll: ' + err.message);
        }
    };
}
