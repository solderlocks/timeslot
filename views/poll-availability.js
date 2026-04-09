/**
 * views/poll-availability.js
 * Renders the "My Availability" dashboard view (pill-based input UI).
 * Pure function — no side effects, no DOM queries.
 */

import { formatDate } from '../api.js';

/**
 * @param {object} poll       - Full poll object from API
 * @param {string} voterName  - Local voter name state
 * @param {Array} localVotes  - Local unsaved votes state
 * @param {boolean} isEdit    - Whether we are updating an existing response
 * @returns {string} HTML string
 */
export function renderAvailabilityDashboard(poll, voterName, localVotes, isEdit) {
    // Group options by date label
    const dayGroups = {};
    poll.options.forEach(opt => {
        const { date } = formatDate(opt.start_time);
        if (!dayGroups[date]) dayGroups[date] = [];
        dayGroups[date].push(opt);
    });

    const dayCards = Object.entries(dayGroups).map(([dateLabel, options]) => {
        const { weekday } = formatDate(options[0].start_time);

        const pills = options.map(opt => {
            const vote = localVotes.find(v => v.option_id === opt.id);
            const status = (vote && vote.status === 0) ? 0 : 1;
            const { time } = formatDate(opt.start_time);

            return `
                <div class="time-pill" data-option-id="${opt.id}" data-status="${status}">
                    <input type="hidden" name="pill_${opt.id}" value="${status}">
                    <span class="pill-label">${time}</span>
                    <div class="pill-icon">
                        ${status === 1
                    ? '<i data-lucide="circle" style="width: 14px; height: 14px;"></i>'
                    : '<i data-lucide="x" class="x-icon"></i>'}
                    </div>
                </div>`;
        }).join('');

        return `
            <div class="day-card">
                <div class="day-header">
                    <h4>${weekday}</h4>
                    <div class="date-label">${dateLabel}</div>
                </div>
                <div class="pill-stack">${pills}</div>
            </div>`;
    }).join('');

    return `
        <form id="availability-form" class="fade-in">
            <div id="success-receipt-container"></div>
           
            <div class="voter-input-group">
                <label for="voter-name">Your Name</label>
                <input type="text" id="voter-name" name="voter_name"
                       value="${voterName}"
                       placeholder="Enter your name" required
                       class="voter-name-input">
            </div>
            <p class="instruction-text">
                Select the times below that conflict with your schedule.
            </p>
            <div class="dashboard-grid">${dayCards}</div>

            <hr>

            <div class="submit-container">
                <button type="submit" id="submit-vote-btn" class="primary save-btn margin-0">
                    ${isEdit ? 'Update Response' : 'Save Response'}
                </button>
            </div>
        </form>`;
}
