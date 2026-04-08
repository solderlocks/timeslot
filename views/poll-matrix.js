/**
 * views/poll-matrix.js
 * Renders the "Group Responses" matrix table view.
 * Pure function — no side effects, no DOM queries.
 */

import { formatDate } from '../api.js';

/**
 * @param {object} poll - Full poll object from API
 * @param {boolean} isFlipped - Whether to flip axes (Timeslots as rows)
 * @returns {string} HTML string
 */
export function renderGroupMatrix(poll, isFlipped = false) {
    if (poll.responses.length === 0) {
        return `
            <div class="read-only-matrix fade-in">
                <p class="instruction-text">Times shown in ${Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
                <div class="empty-state fade-in">
                    <div class="empty-state-icon">🗓️</div>
                    <h3>No responses yet</h3>
                    <p class="empty-state-text">Share the link above with your group to start finding the perfect time.</p>
                </div>
            </div>`;
    }

    const getInitials = (name) => {
        return name
            .split(' ')
            .filter(n => n.length > 0)
            .map(n => n[0].toUpperCase())
            .join('')
            .slice(0, 3); // Max 3 initials
    };

    // Group options by day
    const dayGroups = [];
    let currentDayLabel = null;
    let currentGroup = null;

    poll.options.forEach((opt, idx) => {
        const { weekday, date } = formatDate(opt.start_time);
        const label = `${weekday}, ${date}`;
        if (label !== currentDayLabel) {
            currentDayLabel = label;
            currentGroup = { label, options: [], startIndex: idx };
            dayGroups.push(currentGroup);
        }
        currentGroup.options.push(opt);
    });

    // Map option id → day group index (for zebra striping)
    const optionToDayIdx = {};
    dayGroups.forEach((group, idx) => {
        group.options.forEach(opt => { optionToDayIdx[opt.id] = idx; });
    });

    const isLastInDay = (optionId) =>
        dayGroups.some(g => g.options[g.options.length - 1].id === optionId);

    // Final Consensus: Find the slot with the most availability
    let bestOption = null;
    let maxAvailable = -1;

    poll.options.forEach(opt => {
        const availableCount = poll.responses.reduce((sum, res) => {
            const vote = res.votes.find(v => v.option_id === opt.id);
            return sum + ((vote ? vote.status : 1) !== 0 ? 1 : 0);
        }, 0);

        if (availableCount > maxAvailable) {
            maxAvailable = availableCount;
            bestOption = opt;
        }
    });

    let matrixInnerHtml = '';

    if (isFlipped) {
        // --- FLIPPED VIEW: Timeslots are Rows, Participants are Columns ---
        const participantHeaders = poll.responses.map(res => {
            const initials = getInitials(res.voter_name);
            return `
                <th class="participant-col-header" title="${res.voter_name}">
                    <span class="full-name">${res.voter_name}</span>
                    <span class="initials">${initials}</span>
                </th>`;
        }).join('');

        const gridRows = poll.options.map(opt => {
            const { weekday, date, time } = formatDate(opt.start_time);
            const isStriped = optionToDayIdx[opt.id] % 2 === 0;
            const isBoundary = isLastInDay(opt.id);

            const cells = poll.responses.map(res => {
                const vote = res.votes.find(v => v.option_id === opt.id);
                const status = vote ? vote.status : 1;
                const classes = [
                    'matrix-cell',
                    isBoundary ? 'day-boundary' : '',
                    isStriped ? 'striped-day' : ''
                ].filter(Boolean).join(' ');

                return `
                    <td class="${classes}">
                        <div class="matrix-block" data-status="${status}">
                            ${status === 0 ? '❌' : ''}
                        </div>
                    </td>`;
            }).join('');

            return `
                <tr class="matrix-row ${isStriped ? 'striped-day' : ''}">
                    <td class="sticky-column timeslot-row-label ${isBoundary ? 'day-boundary' : ''} ${isStriped ? 'striped-day' : ''}">
                        <div class="row-label-content">
                            <span class="row-weekday">${weekday}, ${date}</span>
                            <span class="row-time">${time}</span>
                        </div>
                    </td>
                    ${cells}
                </tr>`;
        }).join('');

        matrixInnerHtml = `
            <div class="matrix-table-wrapper flipped-matrix">
                <table class="matrix-table">
                    <thead>
                        <tr>
                            <th class="sticky-column participants-header">Timeslots</th>
                            ${participantHeaders}
                        </tr>
                    </thead>
                    <tbody>${gridRows}</tbody>
                </table>
            </div>
        `;
    } else {
        // --- STANDARD VIEW: Participants are Rows, Timeslots are Columns ---
        const dayHeaders = dayGroups.map((group, groupIdx) => {
            const [weekday, datePart] = group.label.split(', ');
            const isLast = isLastInDay(group.options[group.options.length - 1].id);
            const classes = [
                'day-group-header',
                groupIdx % 2 === 0 ? 'striped-day' : '',
                isLast ? 'day-boundary' : ''
            ].filter(Boolean).join(' ');

            return `
                <th colspan="${group.options.length}" class="${classes}">
                    <span style="white-space: nowrap">${weekday},</span> <span style="white-space: nowrap">${datePart}</span>
                </th>`;
        }).join('');

        const timeHeaders = poll.options.map(opt => {
            const { time } = formatDate(opt.start_time);
            const isBoundary = isLastInDay(opt.id);
            const isStriped = optionToDayIdx[opt.id] % 2 === 0;
            const classes = [
                'time-header',
                isBoundary ? 'day-boundary' : '',
                isStriped ? 'striped-day' : ''
            ].filter(Boolean).join(' ');

            return `
                <th class="${classes}">
                    <div class="header-stack">
                        <div class="time">${time}</div>
                    </div>
                </th>`;
        }).join('');

        const responseRows = poll.responses.map(res => {
            const cells = poll.options.map(opt => {
                const vote = res.votes.find(v => v.option_id === opt.id);
                const status = vote ? vote.status : 1;
                const isBoundary = isLastInDay(opt.id);
                const isStriped = optionToDayIdx[opt.id] % 2 === 0;
                const classes = [
                    'matrix-cell',
                    isBoundary ? 'day-boundary' : '',
                    isStriped ? 'striped-day' : ''
                ].filter(Boolean).join(' ');

                return `
                    <td class="${classes}">
                        <div class="matrix-block" data-status="${status}">
                            ${status === 0 ? '❌' : ''}
                        </div>
                    </td>`;
            }).join('');

            return `
                <tr class="matrix-row">
                    <td class="sticky-column voter-name-cell" title="${res.voter_name}">
                        <span class="full-name">${res.voter_name}</span>
                        <span class="initials">${getInitials(res.voter_name)}</span>
                    </td>
                    ${cells}
                </tr>`;
        }).join('');

        matrixInnerHtml = `
            <div class="matrix-table-wrapper">
                <table class="matrix-table">
                    <thead>
                        <tr>
                            <th rowspan="2" class="sticky-column participants-header">Respondents</th>
                            ${dayHeaders}
                        </tr>
                        <tr>${timeHeaders}</tr>
                    </thead>
                    <tbody>${responseRows}</tbody>
                </table>
            </div>
        `;
    }

    // Minimap (standard view logic)
    const minimapRowLabels = poll.responses.map(res =>
        `<div class="minimap-row-label">${res.voter_name.charAt(0).toUpperCase()}</div>`
    ).join('');

    const minimapCols = poll.options.map((opt, colIdx) => {
        const cells = poll.responses.map(res => {
            const vote = res.votes.find(v => v.option_id === opt.id);
            const status = vote ? vote.status : 1;
            return `<div class="minimap-cell" data-status="${status}"></div>`;
        }).join('');
        return `<div class="minimap-col" data-col-index="${colIdx}">${cells}</div>`;
    }).join('');

    let suggestedSlotHtml = '';
    if (bestOption && maxAvailable === poll.responses.length && poll.responses.length >= 2) {
        const { weekday, date, time } = formatDate(bestOption.start_time);
        const totalRespondents = poll.responses.length;

        const startDate = new Date(bestOption.start_time);
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // Default 1 hour
        const fmtDate = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        const calUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(poll.title)}&dates=${fmtDate(startDate)}/${fmtDate(endDate)}&details=${encodeURIComponent('Scheduled via timeslot.ink')}`;

        suggestedSlotHtml = `
            <label class="suggested-time-label">Suggested Time</label>
            <div class="suggested-slot-card fade-in">
                <div class="suggested-slot-left">
                    <i data-lucide="check-circle" class="consensus-check-icon"></i>
                    <div class="suggested-slot-meta">
                        <div class="suggested-time">${weekday}, ${date} @ ${time}</div>
                        <div class="suggested-consensus">${maxAvailable} / ${totalRespondents} respondents available</div>
                    </div>
                </div>
                <div class="calendar-btn-row">
                    <a href="${calUrl}" target="_blank" class="button outline primary margin-0 compact-button" title="Add to Calendar">
                        <i data-lucide="calendar" style="width: 16px; height: 16px;"></i>
                        <span>Add to Calendar</span>
                    </a>
                </div>
            </div>
        `;
    }

    const tzName = Intl.DateTimeFormat().resolvedOptions().timeZone;
    let tzAbbr = '';
    try {
        const parts = Intl.DateTimeFormat(undefined, { timeZoneName: 'short' }).formatToParts(new Date());
        tzAbbr = parts.find(p => p.type === 'timeZoneName')?.value || '';
    } catch (e) {
        console.warn('Could not get timezone abbreviation', e);
    }
    const timezoneLabel = tzAbbr ? `${tzName} (${tzAbbr})` : tzName;

    return `
        <div class="read-only-matrix fade-in">
            <div class="matrix-utility-row">
                <p class="instruction-text">Times shown in ${timezoneLabel}</p>
                <button type="button" class="clear-btn icon-btn axis-flip-btn" id="axis-flip-btn" title="Flip Table Axes">
                    <i data-lucide="arrow-right-left" style="width: 16px; height: 16px; ${isFlipped ? 'transform: rotate(90deg)' : ''}"></i>

                </button>
            </div>
            ${matrixInnerHtml}
            ${!isFlipped ? `
            <details class="matrix-minimap-container">
                <summary class="minimap-summary">
                    <span class="summary-content">
                        Compact Overview 
                        <i data-lucide="chevron-up" class="icon-up"></i>
                        <i data-lucide="chevron-down" class="icon-down"></i>
                    </span>
                </summary>
                <div class="matrix-minimap">
                    <div class="minimap-row-labels">${minimapRowLabels}</div>
                    <div class="minimap-cols">${minimapCols}</div>
                </div>
            </details>
            ` : ''}
            ${suggestedSlotHtml}
        </div>`;
}
