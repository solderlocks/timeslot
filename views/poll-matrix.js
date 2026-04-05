/**
 * views/poll-matrix.js
 * Renders the "Group Responses" matrix table view.
 * Pure function — no side effects, no DOM queries.
 */

import { formatDate } from '../api.js';

/**
 * @param {object} poll - Full poll object from API
 * @returns {string} HTML string
 */
export function renderGroupMatrix(poll) {
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

    // Build day-group header row
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

    // Build time sub-header row
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

    // Build response rows
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
                <td class="sticky-column voter-name-cell">
                    <strong>${res.voter_name}</strong>
                </td>
                ${cells}
            </tr>`;
    }).join('');

    // Build minimap (mobile bird's-eye view)
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

    return `
        <div class="read-only-matrix fade-in">
            <p class="instruction-text">Times shown in ${Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
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
        </div>`;
}
