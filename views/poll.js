/**
 * views/poll.js: Dual-Mode Architecture (Dashboard vs Matrix)
 */

import { API, formatDate, formatRange } from '../api.js';

export async function renderPollView(container, pollId, urlEditToken) {
    // 1. Initial Data Fetch
    container.innerHTML = `<article aria-busy="true"></article>`;
    const poll = await API.getPoll(pollId);
    
    // 2. Check for Edit Context
    const pollsMap = JSON.parse(localStorage.getItem('polls_map') || '{}');
    const storedEditToken = pollsMap[pollId];
    const activeEditToken = urlEditToken || storedEditToken;

    let userResponse = null;
    let tokenError = false;
    if (activeEditToken) {
        try {
            userResponse = await API.getResponse(pollId, activeEditToken);
        } catch (e) {
            console.warn('Invalid or expired edit token');
            tokenError = true;
        }
    }

    // 3. UI State
    let currentMode = userResponse ? 'group' : 'availability';

    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    function renderPage() {
        container.innerHTML = `
            <article class="fade-in">
                <header>
                    <div class="poll-header-row">
                        <div>
                            <hgroup>
                                <h2>${poll.title}</h2>
                                <p>${poll.description || 'No description provided.'}</p>
                            </hgroup>
                        </div>
                        <div style="display: flex; gap: 0.5rem; align-items: flex-start;">
                            <button class="outline secondary share-btn" id="theme-toggle-btn" title="Toggle Theme">
                                ${document.documentElement.getAttribute('data-theme') === 'dark' ? '☀️' : '🌙'}
                            </button>
                            <button class="outline secondary share-btn" id="share-link-btn">Share Poll</button>
                        </div>
                    </div>

                    <div class="mode-toggle">
                        <button type="button" data-mode="availability" data-active="${currentMode === 'availability'}">My Availability</button>
                        <button type="button" data-mode="group" data-active="${currentMode === 'group'}">Group Responses</button>
                    </div>
                </header>

                ${tokenError ? `
                    <div class="p-4 mb-4 border border-red-300 bg-red-50 text-red-700 rounded-md">
                        <strong>⚠️ Invalid Edit Link:</strong> This link is no longer valid. You can still add a new response below.
                    </div>
                ` : ''}

                <div id="view-content">
                    ${currentMode === 'availability' ? renderAvailabilityDashboard() : renderGroupMatrix()}
                </div>

                ${activeEditToken && !tokenError ? `
                    <div class="edit-link-footer fade-in">
                        <p class="edit-link-title"><strong>Want to change your votes later from another device?</strong><br>Save your private edit link below.</p>
                        <div class="edit-link-copy-group">
                            <input type="text" readonly value="${window.location.origin}?id=${pollId}&edit=${activeEditToken}" class="no-margin">
                            <button class="secondary outline share-btn no-margin" id="copy-edit-link-btn">Copy Link</button>
                        </div>
                    </div>
                ` : ''}
            </article>
        `;

        attachListeners();
    }

    function renderAvailabilityDashboard() {
        // Group options by day
        const dayGroups = {};
        poll.options.forEach(opt => {
            const { date } = formatDate(opt.start_time);
            if (!dayGroups[date]) dayGroups[date] = [];
            dayGroups[date].push(opt);
        });

        const voterName = userResponse ? userResponse.voter_name : '';

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

                <p class="instruction-text">Select the times that conflict with your schedule.</p>

                <div class="dashboard-grid">
                    ${Object.entries(dayGroups).map(([dateLabel, options]) => {
                        const { weekday } = formatDate(options[0].start_time);
                        return `
                            <div class="day-card">
                                <div class="day-header">
                                    <h4>${weekday}</h4>
                                    <div class="date-label">${dateLabel}</div>
                                </div>
                                <div class="pill-stack">
                                    ${options.map(opt => {
                                        const vote = userResponse ? userResponse.votes.find(v => v.option_id === opt.id) : null;
                                        const status = (vote && vote.status === 0) ? 0 : 1; // Default to 1 (OK)
                                        const { time } = formatDate(opt.start_time);
                                        return `
                                            <div class="time-pill" data-option-id="${opt.id}" data-status="${status}">
                                                <input type="hidden" name="pill_${opt.id}" value="${status}">
                                                <span class="pill-label">${time}</span>
                                                <div class="pill-icon">
                                                    ${status === 1 ? '<span class="chk-icon-outline">○</span>' : '<span class="veto-icon">❌</span>'}
                                                </div>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>

                <div class="submit-container">
                    <button type="submit" id="submit-vote-btn" class="primary save-btn">
                        ${userResponse ? 'Update Response' : 'Save Response'}
                    </button>
                </div>
            </form>
        `;
    }

    function renderGroupMatrix() {
        // Group options by day for the top-tier header
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

        // Helper to check if an option is the last in its day group
        const isLastInDay = (optionId) => {
            return dayGroups.some(group => group.options[group.options.length - 1].id === optionId);
        };

        return `
            <div class="read-only-matrix fade-in">
                <p class="timezone-subtitle">Times shown in ${Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
                <div class="matrix-table-wrapper">
                    <table class="matrix-table">
                        <thead>
                            <tr>
                                <th rowspan="2" class="sticky-column participants-header">Participants</th>
                                ${dayGroups.map(group => `
                                    <th colspan="${group.options.length}" class="day-group-header ${isLastInDay(group.options[group.options.length - 1].id) ? 'day-boundary' : ''}">
                                        ${group.label}
                                    </th>
                                `).join('')}
                            </tr>
                            <tr>
                                ${poll.options.map(opt => {
                                    const { time } = formatDate(opt.start_time);
                                    const isBoundary = isLastInDay(opt.id);
                                    return `
                                        <th class="${isBoundary ? 'day-boundary' : ''} time-header">
                                            <div class="header-stack">
                                                <div class="time">${time}</div>
                                            </div>
                                        </th>
                                    `;
                                }).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${poll.responses.map(res => `
                                <tr class="matrix-row">
                                    <td class="sticky-column voter-name-cell"><strong>${res.voter_name}</strong></td>
                                    ${poll.options.map(opt => {
                                        const vote = res.votes.find(v => v.option_id === opt.id);
                                        const status = vote ? vote.status : 1;
                                        const isBoundary = isLastInDay(opt.id);
                                        return `
                                            <td class="matrix-cell ${isBoundary ? 'day-boundary' : ''}">
                                                <div class="matrix-block" data-status="${status}"></div>
                                            </td>
                                        `;
                                    }).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td class="sticky-column voter-name-cell"><strong>Scores</strong></td>
                                ${poll.options.map(opt => {
                                    const rank = poll.metadata.rankings.find(r => r.option_id === opt.id);
                                    const isBoundary = isLastInDay(opt.id);
                                    return `<td class="${isBoundary ? 'day-boundary' : ''} score-cell"><strong>${rank ? rank.score : 0}</strong></td>`;
                                }).join('')}
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        `;
    }

    function attachListeners() {
        const themeBtn = container.querySelector('#theme-toggle-btn');
        if (themeBtn) {
            themeBtn.onclick = () => {
                const currentTheme = document.documentElement.getAttribute('data-theme');
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                document.documentElement.setAttribute('data-theme', newTheme);
                localStorage.setItem('theme', newTheme);
                renderPage(); // Refresh to update icon
            };
        }

        const toggleBtns = container.querySelectorAll('.mode-toggle button');
        toggleBtns.forEach(btn => {
            btn.onclick = () => {
                currentMode = btn.dataset.mode;
                renderPage();
            };
        });

        const shareBtn = container.querySelector('#share-link-btn');
        shareBtn.onclick = () => {
            const pollUrl = `${window.location.origin}?id=${pollId}`;
            navigator.clipboard.writeText(pollUrl);
            const originalText = shareBtn.innerText;
            shareBtn.innerText = 'Copied!';
            setTimeout(() => shareBtn.innerText = originalText, 2000);
        };

        const copyEditBtn = container.querySelector('#copy-edit-link-btn');
        if (copyEditBtn) {
            copyEditBtn.onclick = () => {
                const editUrl = `${window.location.origin}?id=${pollId}&edit=${activeEditToken}`;
                navigator.clipboard.writeText(editUrl);
                const originalText = copyEditBtn.innerText;
                copyEditBtn.innerText = 'Copied!';
                setTimeout(() => copyEditBtn.innerText = originalText, 2000);
            };
        }

        if (currentMode === 'availability') {
            const availabilityForm = container.querySelector('#availability-form');
            const submitBtn = availabilityForm.querySelector('#submit-vote-btn');

            availabilityForm.querySelectorAll('.time-pill').forEach(pill => {
                pill.onclick = () => {
                    const input = pill.querySelector('input');
                    const currentStatus = parseInt(input.value);
                    const newStatus = currentStatus === 1 ? 0 : 1;
                    updatePillUI(pill, newStatus);
                };
            });

            availabilityForm.onsubmit = async (e) => {
                e.preventDefault();
                const voterName = availabilityForm.querySelector('#voter-name').value.trim();
                if (!voterName) return;

                const votes = poll.options.map(opt => ({
                    option_id: opt.id,
                    status: parseInt(availabilityForm.querySelector(`[name="pill_${opt.id}"]`).value)
                }));

                try {
                    submitBtn.setAttribute('aria-busy', 'true');
                    submitBtn.disabled = true;

                    let result;
                    if (activeEditToken && userResponse) {
                        result = await API.updateResponse(pollId, activeEditToken, { voter_name: voterName, votes });
                    } else {
                        result = await API.submitVote(pollId, { voter_name: voterName, votes });
                        localStorage.setItem('polls_map', JSON.stringify({ ...pollsMap, [pollId]: result.edit_token }));
                    }

                    // CRITICAL: Re-fetch the full poll object to get updated consensus scores and optimal slots
                    const updatedPoll = await API.getPoll(pollId);
                    Object.assign(poll, updatedPoll);

                    // Update local userResponse reference from the fresh data
                    userResponse = poll.responses.find(r => r.voter_name === voterName) || { voter_name: voterName, votes };

                    // Transition to Group mode
                    currentMode = 'group';
                    renderPage();
                    showToast("Response Saved. Viewing group consensus.");
                } catch (err) {
                    console.error(err);
                    alert('Submission failed: ' + err.message);
                    submitBtn.removeAttribute('aria-busy');
                    submitBtn.disabled = false;
                }
            };
        }
    }

    function updatePillUI(pill, status) {
        const input = pill.querySelector('input');
        const iconContainer = pill.querySelector('.pill-icon');

        pill.dataset.status = status;
        input.value = status;
        
        if (status === 1) {
            iconContainer.innerHTML = '<span class="chk-icon-outline">○</span>';
        } else {
            iconContainer.innerHTML = '<span class="veto-icon">❌</span>';
        }
    }


    function showSuccessReceipt(votes, editToken) {
        const conflicts = votes.filter(v => v.status === 0).length;
        const available = votes.length - conflicts;

        const container_receipt = container.querySelector('#success-receipt-container');
        const submitBtn = container.querySelector('#submit-vote-btn');
        const pills = container.querySelectorAll('.time-pill');

        submitBtn.style.display = 'none';
        pills.forEach(p => {
            p.style.pointerEvents = 'none';
            p.style.opacity = '0.7';
        });

        container_receipt.innerHTML = `
            <div class="success-receipt fade-in">
                <h3>✅ Response Saved!</h3>
                <p>You flagged ${conflicts} conflict${conflicts !== 1 ? 's' : ''}. ${available} slot${available !== 1 ? 's' : ''} are marked as available.
                <span class="edit-link" id="edit-response-link">Edit Response</span></p>
            </div>
        `;

        container.querySelector('#edit-response-link').onclick = () => {
            container_receipt.innerHTML = '';
            submitBtn.style.display = 'block';
            submitBtn.removeAttribute('aria-busy');
            submitBtn.disabled = false;
            pills.forEach(p => {
                p.removeAttribute('disabled');
                p.style.pointerEvents = 'auto';
                p.style.opacity = '1';
            });
        };

        // Scroll to top of form
        window.scrollTo({ top: container.querySelector('#availability-form').offsetTop - 20, behavior: 'smooth' });
    }

    // Initial render
    renderPage();
}
