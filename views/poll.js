/**
 * views/poll.js: Dual-Mode Architecture (Dashboard vs Matrix)
 */

import { API, formatDate, formatRange } from '../api.js';

export async function renderPollView(container, pollId, urlEditToken) {
    // 1. Initial Data Fetch
    container.innerHTML = `<article aria-busy="true"></article>`;
    const poll = await API.getPoll(pollId);
    // Enforce chronological order for options
    poll.options.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

    // 2. Check for Edit Context
    const pollsMap = JSON.parse(localStorage.getItem('polls_map') || '{}');
    const storedEditToken = pollsMap[pollId];
    let activeEditToken = urlEditToken || storedEditToken;

    let userResponse = null;
    let tokenError = false;
    if (activeEditToken) {
        try {
            userResponse = await API.getResponse(pollId, activeEditToken);
        } catch (e) {
            console.warn('Invalid or expired edit token');
            tokenError = true;
            activeEditToken = null; // Reset token if invalid
        }
    }

    // 3. UI State
    let currentMode = userResponse ? 'group' : 'availability';


    function renderPage() {
        container.innerHTML = `
            <article class="fade-in">
                <header>
                    <div class="poll-header-row">
                        <div>
                            <h2 class="poll-title poll-title-compact">${poll.title}</h2>
                            <p class="poll-description-muted">${poll.description || 'No description provided.'}</p>
                        </div>
                        <div class="header-actions">
                            ${activeEditToken ? `
                                <button class="outline secondary icon-btn" id="copy-edit-link-btn" title="Copy Private Edit Link">
                                    <i data-lucide="link-2" style="width: 16px; height: 16px;"></i>
                                </button>
                            ` : ''}
                            <button class="outline secondary share-btn" id="share-link-btn" title="Copy Shareable Poll Link">
                                <i data-lucide="share-2" style="width: 16px; height: 16px;"></i>
                            </button>
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
                <p class="instruction-text">
                    Select the times that conflict with your schedule.
                    <button type="button" class="philosophy-trigger philosophy-icon" id="open-philosophy-btn-poll" title="Subtractive Scheduling">
                        <i data-lucide="info"></i>
                    </button>
                </p>
                <div class="voter-input-group">
                    <label for="voter-name">Your Name</label>
                    <input type="text" id="voter-name" name="voter_name" 
                           value="${voterName}" 
                           placeholder="Enter your name" required 
                           class="voter-name-input">
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
                const votes = userResponse && userResponse.votes ? userResponse.votes : [];
                const vote = votes.find(v => v.option_id === opt.id);
                const status = (vote && vote.status === 0) ? 0 : 1;
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

                <hr>

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

        // Pre-calculate option to day-group index for zebra striping
        const optionToDayIdx = {};
        dayGroups.forEach((group, idx) => {
            group.options.forEach(opt => {
                optionToDayIdx[opt.id] = idx;
            });
        });

        // Helper to check if an option is the last in its day group
        const isLastInDay = (optionId) => {
            return dayGroups.some(group => group.options[group.options.length - 1].id === optionId);
        };

        const matrixContent = poll.responses.length === 0
            ? `
                <div class="empty-state fade-in">
                    <div class="empty-state-icon">🗓️</div>
                    <h3>No responses yet</h3>
                    <p class="empty-state-text">Share the link above with your group to start finding the perfect time.</p>
                </div>
            `
            : `
                <div class="matrix-table-wrapper">
                    <table class="matrix-table">
                        <thead>
                            <tr>
                                <th rowspan="2" class="sticky-column participants-header">Respondents</th>
                                ${dayGroups.map((group, groupIdx) => `
                                    <th colspan="${group.options.length}" class="day-group-header ${groupIdx % 2 === 0 ? 'striped-day' : ''} ${isLastInDay(group.options[group.options.length - 1].id) ? 'day-boundary' : ''}">
                                        ${group.label}
                                    </th>
                                `).join('')}
                            </tr>
                            <tr>
                                ${poll.options.map(opt => {
                const { time } = formatDate(opt.start_time);
                const isBoundary = isLastInDay(opt.id);
                const isStriped = optionToDayIdx[opt.id] % 2 === 0;
                return `
                                        <th class="${isBoundary ? 'day-boundary' : ''} ${isStriped ? 'striped-day' : ''} time-header">
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
                                    <td class="sticky-column voter-name-cell">
                                        <span class="name-full"><strong>${res.voter_name}</strong></span>
                                        <span class="name-initial"><strong>${res.voter_name.charAt(0).toUpperCase()}</strong></span>
                                    </td>
                                    ${poll.options.map(opt => {
                const vote = res.votes.find(v => v.option_id === opt.id);
                const status = vote ? vote.status : 1;
                const isBoundary = isLastInDay(opt.id);
                const isStriped = optionToDayIdx[opt.id] % 2 === 0;
                return `
                                            <td class="matrix-cell ${isBoundary ? 'day-boundary' : ''} ${isStriped ? 'striped-day' : ''}">
                                                <div class="matrix-block" data-status="${status}">
                                                    ${status === 0 ? '❌' : ''}
                                                </div>
                                            </td>
                                        `;
            }).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot class="score-row">
                            <tr>
                                <td class="sticky-column voter-name-cell"><strong>Scores</strong></td>
                                ${poll.options.map(opt => {
                const rank = poll.metadata.rankings.find(r => r.option_id === opt.id);
                const isBoundary = isLastInDay(opt.id);
                const isStriped = optionToDayIdx[opt.id] % 2 === 0;
                return `<td class="${isBoundary ? 'day-boundary' : ''} ${isStriped ? 'striped-day' : ''} score-cell"><strong>${rank ? rank.score : 0}</strong></td>`;
            }).join('')}
                            </tr>
                        </tfoot>
                    </table>
                </div>
            `;

        return `
            <div class="read-only-matrix fade-in">
                <p class="instruction-text">Times shown in ${Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
                ${matrixContent}
            </div>
        `;
    }

    function attachListeners() {
        // Tooltips Initialization
        if (window.tippy) {
            // Standard tooltips
            window.tippy(container.querySelectorAll('[data-tippy-content]'), {
                arrow: true,
                theme: 'translucent',
            });

            // Special handling for dynamic "Copied" feedback
            const shareBtnEl = container.querySelector('#share-link-btn');
            const copyEditBtnEl = container.querySelector('#copy-edit-link-btn');

            if (shareBtnEl) {
                window.tippy(shareBtnEl, {
                    content: 'Copy Shareable Poll Link',
                    hideOnClick: false,
                    onShow(instance) {
                        if (instance.props.content === 'Poll Link Copied!') {
                            setTimeout(() => {
                                instance.hide();
                                setTimeout(() => instance.setContent('Copy Shareable Poll Link'), 500);
                            }, 2000);
                        }
                    }
                });
            }

            if (copyEditBtnEl) {
                window.tippy(copyEditBtnEl, {
                    content: 'Copy Private Edit Link',
                    hideOnClick: false,
                    onShow(instance) {
                        if (instance.props.content === 'Edit Link Copied!') {
                            setTimeout(() => {
                                instance.hide();
                                setTimeout(() => instance.setContent('Copy Private Edit Link'), 500);
                            }, 2000);
                        }
                    }
                });
            }
        }

        if (window.lucide) {
            window.lucide.createIcons();
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
            if (shareBtn._tippy) {
                shareBtn._tippy.setContent('Poll Link Copied!');
                shareBtn._tippy.show();
            }
        };

        const copyEditBtn = container.querySelector('#copy-edit-link-btn');
        if (copyEditBtn) {
            copyEditBtn.onclick = () => {
                const editUrl = `${window.location.origin}?id=${pollId}&edit=${activeEditToken}`;
                navigator.clipboard.writeText(editUrl);
                if (copyEditBtn._tippy) {
                    copyEditBtn._tippy.setContent('Edit Link Copied!');
                    copyEditBtn._tippy.show();
                }
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
                window.clearFieldErrors(availabilityForm);

                const voterNameInput = availabilityForm.querySelector('#voter-name');
                const voterName = voterNameInput.value.trim();

                if (!voterName) {
                    window.showFieldError(voterNameInput, "Please enter your name to save your response.");
                    return;
                }

                const votes = poll.options.map(opt => ({
                    option_id: opt.id,
                    status: parseInt(availabilityForm.querySelector(`[name="pill_${opt.id}"]`).value)
                }));

                try {
                    submitBtn.setAttribute('aria-busy', 'true');
                    submitBtn.disabled = true;

                    let result;
                    if (activeEditToken) {
                        result = await API.updateResponse(pollId, activeEditToken, { voter_name: voterName, votes });
                    } else {
                        result = await API.submitVote(pollId, { voter_name: voterName, votes });
                        activeEditToken = result.edit_token; // Update the session token
                        localStorage.setItem('polls_map', JSON.stringify({ ...pollsMap, [pollId]: activeEditToken }));
                    }

                    // CRITICAL: Re-fetch the full poll object with cache-busting to get updated votes/consensus
                    const updatedPoll = await API.getPoll(`${pollId}?cb=${Date.now()}`);
                    Object.assign(poll, updatedPoll);

                    // Update userResponse from the fresh, confirmed server data
                    userResponse = poll.responses.find(r => r.edit_token === activeEditToken) ||
                        poll.responses.find(r => r.voter_name === voterName);

                    // Transition to Group mode
                    currentMode = 'group';
                    renderPage();
                    window.showToast("Response Saved. Viewing group consensus.");
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
