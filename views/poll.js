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
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                        <div>
                            <hgroup>
                                <h2>${poll.title}</h2>
                                <p>${poll.description || 'No description provided.'}</p>
                            </hgroup>
                        </div>
                        <button class="outline secondary" id="share-link-btn" style="width: auto;">Share Poll</button>
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
                        <p style="margin-bottom: 0.75rem;"><strong>Want to change your votes later from another device?</strong><br>Save your private edit link below.</p>
                        <div style="display: flex; gap: 0.5rem; max-width: 500px; margin: 0 auto;">
                            <input type="text" readonly value="${window.location.origin}?id=${pollId}&edit=${activeEditToken}" style="margin-bottom: 0;">
                            <button class="secondary outline" id="copy-edit-link-btn" style="width: auto; margin-bottom: 0;">Copy Link</button>
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

                <div style="margin-bottom: 2rem;">
                    <label for="voter-name">Your Name</label>
                    <input type="text" id="voter-name" name="voter_name" 
                           value="${voterName}" 
                           placeholder="Enter your name" required 
                           style="max-width: 400px;">
                </div>

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
                                        const status = vote ? vote.status : 1;
                                        const { time } = formatDate(opt.start_time);
                                        const isOptimal = poll.metadata?.optimal_option_ids?.includes(opt.id);
                                        return `
                                            <div class="time-pill" data-option-id="${opt.id}" data-status="${status}">
                                                <input type="hidden" name="pill_${opt.id}" value="${status}">
                                                <span class="pill-label">
                                                    ${time}
                                                    ${isOptimal ? '<span class="optimal-badge" style="margin-left: 0.5rem; vertical-align: middle;">Optimal</span>' : ''}
                                                </span>
                                                <span class="pill-icon">
                                                    ${status === 0 ? '❌' : (status === 2 ? '⭐' : '<span class="triage-dash">➖</span>')}
                                                </span>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>

                <div style="display: flex; justify-content: center; margin-top: 2rem;">
                    <button type="submit" id="submit-vote-btn" class="primary" style="width: auto; padding: 0.8rem 2.5rem;">
                        ${userResponse ? 'Update My Response' : 'Submit My Response'}
                    </button>
                </div>
            </form>
        `;
    }

    function renderGroupMatrix() {
        return `
            <div class="read-only-matrix fade-in">
                <p class="timezone-subtitle">Times shown in ${Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
                <div class="matrix-table-wrapper">
                    <table class="matrix-table">
                        <thead>
                            <tr>
                                <th class="sticky-column" style="text-align: left; min-width: 150px; vertical-align: bottom;">Participants</th>
                                ${poll.options.map(opt => {
                                    const { weekday, date, time } = formatDate(opt.start_time);
                                    const isOptimal = poll.metadata?.optimal_option_ids?.includes(opt.id);
                                    return `
                                        <th class="${isOptimal ? 'optimal-column' : ''}">
                                            <div class="header-stack">
                                                ${isOptimal ? '<span class="optimal-header-badge">⭐ Best</span>' : ''}
                                                <div class="weekday">${weekday}</div>
                                                <div class="date">${date}</div>
                                                <div class="time">${time}</div>
                                            </div>
                                        </th>
                                    `;
                                }).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${poll.responses.map(res => `
                                <tr>
                                    <td class="sticky-column" style="text-align: left;"><strong>${res.voter_name}</strong></td>
                                    ${poll.options.map(opt => {
                                        const vote = res.votes.find(v => v.option_id === opt.id);
                                        const status = vote ? vote.status : null;
                                        const isOptimal = poll.metadata?.optimal_option_ids?.includes(opt.id);
                                        return `
                                            <td class="vote-cell ${isOptimal ? 'optimal-column' : ''}">
                                                <div class="heatmap-block" data-status="${status}"></div>
                                            </td>
                                        `;
                                    }).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td class="sticky-column" style="text-align: left;"><strong>Scores</strong></td>
                                ${poll.options.map(opt => {
                                    const rank = poll.metadata.rankings.find(r => r.option_id === opt.id);
                                    const isOptimal = poll.metadata?.optimal_option_ids?.includes(opt.id);
                                    return `<td class="${isOptimal ? 'optimal-column' : ''}"><strong>${rank ? rank.score : 0}</strong></td>`;
                                }).join('')}
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        `;
    }

    function attachListeners() {
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

            const updateSummary = () => {
                if (!submitBtn) return;
                const statusValues = Array.from(availabilityForm.querySelectorAll('input[type="hidden"]')).map(i => parseInt(i.value));
                const vetoes = statusValues.filter(v => v === 0).length;
                const stars = statusValues.filter(v => v === 2).length;

                let text = "Confirm: ";
                if (vetoes === 0 && stars === 0) text += "No Conflicts";
                else if (vetoes > 0 && stars > 0) text += `${vetoes} Conflicts, ${stars} Preferred`;
                else if (vetoes > 0) text += `${vetoes} Conflict${vetoes > 1 ? 's' : ''}`;
                else if (stars > 0) text += `${stars} Preferred`;
                
                submitBtn.innerText = text;
            };

            updateSummary();

            availabilityForm.querySelectorAll('.time-pill').forEach(pill => {
                pill.onclick = () => {
                    if (pill.hasAttribute('disabled')) return;
                    const status = parseInt(pill.querySelector('input').value);
                    if (status === 1) {
                        updatePillStatus(pill, 0);
                        updateSummary();
                    } else {
                        showPillPopover(pill, updateSummary);
                    }
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
                        // Update local object
                        userResponse.votes = votes;
                        const idx = poll.responses.findIndex(r => r.id === userResponse.id);
                        if (idx !== -1) poll.responses[idx].votes = votes;
                    } else {
                        result = await API.submitVote(pollId, { voter_name: voterName, votes });
                        pollsMap[pollId] = result.edit_token;
                        localStorage.setItem('polls_map', JSON.stringify(pollsMap));
                        // Re-fetch or update poll object locally to show the new response
                        poll.responses.push({ voter_name: voterName, votes });
                        userResponse = { voter_name: voterName, votes };
                    }

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

    function updatePillStatus(pill, status) {
        pill.dataset.status = status;
        pill.querySelector('input').value = status;
        const iconContainer = pill.querySelector('.pill-icon');
        iconContainer.innerHTML = status === 0 ? '❌' : (status === 2 ? '⭐' : '<span class="triage-dash">➖</span>');
    }

    function showPillPopover(pill, onUpdate) {
        document.querySelectorAll('.triage-popover').forEach(p => p.remove());
        const popover = document.createElement('div');
        popover.className = 'triage-popover';
        popover.innerHTML = `
            <button type="button" class="popover-clear" data-val="1">➖ Clear Selection</button>
            <button type="button" class="popover-prefer" data-val="2">⭐ Mark as Preferred</button>
        `;
        document.body.appendChild(popover);

        const rect = pill.getBoundingClientRect();
        popover.style.left = `${rect.left + (rect.width / 2) - (popover.offsetWidth / 2)}px`;
        popover.style.top = `${rect.top - popover.offsetHeight - 8}px`; // Above the pill

        const onOutsideClick = (e) => {
            if (!popover.contains(e.target)) {
                popover.remove();
                document.removeEventListener('mousedown', onOutsideClick);
            }
        };

        popover.querySelectorAll('button').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                updatePillStatus(pill, parseInt(btn.dataset.val));
                onUpdate();
                popover.remove();
                document.removeEventListener('mousedown', onOutsideClick);
            };
        });

        setTimeout(() => document.addEventListener('mousedown', onOutsideClick), 10);
    }

    function showSuccessReceipt(votes, editToken) {
        const vetoes = votes.filter(v => v.status === 0).length;
        const stars = votes.filter(v => v.status === 2).length;
        const open = votes.length - vetoes - stars;

        const container_receipt = container.querySelector('#success-receipt-container');
        const submitBtn = container.querySelector('#submit-vote-btn');
        const pills = container.querySelectorAll('.time-pill');

        submitBtn.style.display = 'none';
        pills.forEach(p => {
            p.setAttribute('disabled', 'true');
            p.style.pointerEvents = 'none';
            p.style.opacity = '0.7';
        });

        container_receipt.innerHTML = `
            <div class="success-receipt fade-in">
                <h3>✅ Response Saved!</h3>
                <p>You flagged ${vetoes} conflict${vetoes !== 1 ? 's' : ''} and ${stars} preferred time${stars !== 1 ? 's' : ''}. ${open} slot${open !== 1 ? 's' : ''} remain open.
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
