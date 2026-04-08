/**
 * views/poll.js
 * Orchestrator for the dual-mode poll view (Availability / Group Matrix).
 * Handles data fetching, state management, and event binding.
 * Rendering is delegated to poll-availability.js and poll-matrix.js.
 */

import { API, formatDate } from '../api.js';
import { renderAvailabilityDashboard } from './poll-availability.js';
import { renderGroupMatrix } from './poll-matrix.js';

export async function renderPollView(container, pollId, urlEditToken, urlAdminToken) {
    // 1. Loading state
    container.innerHTML = `<article aria-busy="true"></article>`;
    const poll = await API.getPoll(pollId);
    poll.options.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

    // 2. Resolve edit token (URL param takes priority over localStorage)
    const pollsMap = JSON.parse(localStorage.getItem('polls_map') || '{}');
    const storedEditToken = pollsMap[pollId];
    const activeAdminToken = urlAdminToken;
    let activeEditToken = urlEditToken || storedEditToken;

    let userResponse = null;
    let tokenError = false;
    // Only validate activeEditToken if it's NOT the admin token (different tables)
    if (activeEditToken && activeEditToken !== activeAdminToken) {
        try {
            userResponse = await API.getResponse(pollId, activeEditToken);
        } catch (e) {
            console.warn('Invalid or expired edit token');
            // Only show the warning if the user explicitly provided an edit token in the URL
            tokenError = !!urlEditToken;
            activeEditToken = null;
        }
    }

    // 3. UI state
    let currentMode = userResponse ? 'group' : 'availability';
    let isFlipped = window.innerWidth <= 600;

    // 4. Persistence State (Unsaved local changes)
    let localVoterName = userResponse ? userResponse.voter_name : '';
    let localVotes = poll.options.map(opt => {
        const existingVote = userResponse?.votes?.find(v => v.option_id === opt.id);
        return {
            option_id: opt.id,
            status: existingVote ? existingVote.status : 1
        };
    });

    function renderPage() {
        container.innerHTML = `
            <article class="fade-in">
                <header>
                    <div class="poll-header-row">
                        <div>
                            <h2 class="poll-title poll-title-compact">${poll.title}</h2>
                            ${poll.description ? `<p class="poll-description-muted">${poll.description}</p>` : ''}
                            ${poll.duration ? `
                                <p class="poll-duration-tag">
                                    <i data-lucide="clock" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;"></i>
                                    <span>${poll.duration}</span>
                                </p>
                            ` : ''}
                        </div>
                        <div class="header-actions">
                            ${(activeEditToken || activeAdminToken) ? `
                                <button class="clear-btn icon-btn private-edit-link" id="copy-edit-link-btn" data-tippy-content="Copy Private Edit Link">
                                    <i data-lucide="link" style="width: 16px; height: 16px;"></i>
                                </button>
                            ` : ''}
                        </div>
                    </div>

                    <div class="mode-toggle">
                        <div class="main-modes">
                            <button type="button" data-mode="availability" data-active="${currentMode === 'availability'}">My Availability</button>
                            <button type="button" data-mode="group" data-active="${currentMode === 'group'}">Group Responses</button>
                        </div>
                        ${currentMode === 'group' && poll.responses.length > 0 ? '' : ''}
                    </div>
                </header>

                ${tokenError ? `
                    <div class="instruction-text hint-text warning-text">
                        ⚠️ This link is no longer valid. You can still add a new response below.
                    </div>
                ` : ''}

                <div id="view-content">
                    ${currentMode === 'availability'
                ? renderAvailabilityDashboard(poll, localVoterName, localVotes, !!userResponse)
                : renderGroupMatrix(poll, isFlipped)}
                </div>
            </article>
        `;

        attachListeners();
    }

    function attachListeners() {
        // Initialize icons
        if (window.lucide) window.lucide.createIcons();

        // Mode toggle
        container.querySelectorAll('.mode-toggle .main-modes button').forEach(btn => {
            btn.onclick = () => {
                currentMode = btn.dataset.mode;
                renderPage();
            };
        });

        const flipBtn = container.querySelector('#axis-flip-btn');
        if (flipBtn) {
            flipBtn.onclick = () => {
                isFlipped = !isFlipped;
                renderPage();
            };
        }

        // Minimap scroll-sync (mobile)
        const minimapCols = container.querySelectorAll('.minimap-cols .minimap-col');
        if (minimapCols.length) {
            const wrapper = container.querySelector('.matrix-table-wrapper');
            // Time headers are in thead's second row (no sticky col in that row)
            const timeHeaders = container.querySelectorAll('.matrix-table thead tr:last-child th');

            minimapCols.forEach(col => {
                col.onclick = () => {
                    const idx = parseInt(col.dataset.colIndex, 10);
                    const th = timeHeaders[idx];
                    if (!wrapper || !th) return;

                    // Scroll so the target column is centered in the wrapper
                    const targetLeft = th.offsetLeft - (wrapper.clientWidth / 2) + (th.offsetWidth / 2);
                    wrapper.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });

                    // Brief active flash on the tapped column
                    minimapCols.forEach(c => c.classList.remove('active'));
                    col.classList.add('active');
                    setTimeout(() => col.classList.remove('active'), 600);
                };
            });
        }

        // Tooltips
        if (window.tippy) {
            const copyEditBtnEl = container.querySelector('#copy-edit-link-btn');
            if (copyEditBtnEl) {
                window.tippy(copyEditBtnEl, {
                    placement: 'top',
                    appendTo: 'parent'
                });
            }
        }

        // Share / copy buttons
        const shareBtn = container.querySelector('#share-link-btn');
        if (shareBtn) {
            shareBtn.onclick = () => {
                const url = `${window.location.origin}?id=${pollId}`;
                navigator.clipboard.writeText(url);
                const tip = shareBtn._tippy;
                if (tip) {
                    tip.setContent('Poll Link Copied!');
                    tip.show();
                    setTimeout(() => {
                        tip.hide();
                        setTimeout(() => tip.setContent('Copy Shareable Poll Link'), 500);
                    }, 2000);
                }
            };
        }
        const copyEditBtn = container.querySelector('#copy-edit-link-btn');
        if (copyEditBtn) {
            copyEditBtn.onclick = () => {
                const url = activeAdminToken
                    ? `${window.location.origin}?id=${pollId}&admin=${activeAdminToken}`
                    : `${window.location.origin}?id=${pollId}&edit=${activeEditToken}`;

                navigator.clipboard.writeText(url);
                const tip = copyEditBtn._tippy;
                if (tip) {
                    tip.setContent('Edit Link Copied!');
                    tip.show();
                    setTimeout(() => {
                        tip.hide();
                        setTimeout(() => tip.setContent('Copy Private Edit Link'), 500);
                    }, 2000);
                }
            };
        }

        // Availability form interactions
        if (currentMode === 'availability') {
            const availabilityForm = container.querySelector('#availability-form');
            if (!availabilityForm) return;

            const submitBtn = availabilityForm.querySelector('#submit-vote-btn');
            const voterNameInput = availabilityForm.querySelector('#voter-name');

            // Pill toggle
            availabilityForm.querySelectorAll('.time-pill').forEach(pill => {
                pill.onclick = () => {
                    const optionId = pill.dataset.optionId;
                    const input = pill.querySelector('input');
                    const newStatus = parseInt(input.value) === 1 ? 0 : 1;

                    updatePillUI(pill, newStatus);

                    // Sync to local state
                    const vote = localVotes.find(v => v.option_id === optionId);
                    if (vote) vote.status = newStatus;
                };
            });

            // Name sync
            if (voterNameInput) {
                voterNameInput.oninput = () => {
                    localVoterName = voterNameInput.value;
                    window.clearFieldErrors(availabilityForm);
                };
            }

            // Form submission
            availabilityForm.onsubmit = async (e) => {
                e.preventDefault();
                window.clearFieldErrors(availabilityForm);

                const voterNameInput = availabilityForm.querySelector('#voter-name');
                const voterName = voterNameInput.value.trim();
                if (!voterName) {
                    window.showFieldError(voterNameInput, 'Please enter your name to save your response.');
                    return;
                }

                const votes = localVotes;

                try {
                    submitBtn.setAttribute('aria-busy', 'true');
                    submitBtn.disabled = true;

                    let result;
                    if (activeEditToken) {
                        result = await API.updateResponse(pollId, activeEditToken, { voter_name: voterName, votes });
                    } else {
                        result = await API.submitVote(pollId, { voter_name: voterName, votes });
                        activeEditToken = result.edit_token;
                        localStorage.setItem('polls_map', JSON.stringify({ ...pollsMap, [pollId]: activeEditToken }));
                    }

                    // Re-fetch with cache-bust to get updated votes
                    const updatedPoll = await API.getPoll(`${pollId}?cb=${Date.now()}`);
                    Object.assign(poll, updatedPoll);

                    userResponse = poll.responses.find(r => r.edit_token === activeEditToken)
                        || poll.responses.find(r => r.voter_name === voterName);

                    currentMode = 'group';
                    tokenError = false;

                    renderPage();
                    window.showToast('Response saved. Viewing group consensus.');
                } catch (err) {
                    console.error(err);
                    window.showToast('Failed to save response. Please try again.');
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
        iconContainer.innerHTML = status === 1
            ? '<i data-lucide="circle" style="width: 14px; height: 14px;"></i>'
            : '<i data-lucide="x" class="x-icon"></i>';

        // Re-initialize icons for this specific container
        if (window.lucide) window.lucide.createIcons({
            attrs: { 'class': 'lucide-icon' },
            nameAttr: 'data-lucide',
            icons: undefined
        });
    }

    function showSuccessReceipt(votes, editToken) {
        const conflicts = votes.filter(v => v.status === 0).length;
        const available = votes.length - conflicts;

        const containerReceipt = container.querySelector('#success-receipt-container');
        const submitBtn = container.querySelector('#submit-vote-btn');
        const pills = container.querySelectorAll('.time-pill');

        submitBtn.style.display = 'none';
        pills.forEach(p => {
            p.style.pointerEvents = 'none';
            p.style.opacity = '0.7';
        });

        containerReceipt.innerHTML = `
            <div class="success-receipt fade-in">
                <h3>✅ Response Saved!</h3>
                <p>You flagged ${conflicts} conflict${conflicts !== 1 ? 's' : ''}. ${available} slot${available !== 1 ? 's' : ''} are marked as available.
                <span class="clear-btn" id="edit-response-link" style="margin-left: 0.5rem;">Edit Response</span></p>
            </div>
        `;

        container.querySelector('#edit-response-link').onclick = () => {
            containerReceipt.innerHTML = '';
            submitBtn.style.display = 'block';
            submitBtn.removeAttribute('aria-busy');
            submitBtn.disabled = false;
            pills.forEach(p => {
                p.removeAttribute('disabled');
                p.style.pointerEvents = 'auto';
                p.style.opacity = '1';
            });
        };

        window.scrollTo({ top: container.querySelector('#availability-form').offsetTop - 20, behavior: 'smooth' });
    }

    // Initial render
    renderPage();
}
