/**
 * views/poll.js: The high-density Matrix Grid and Voting View.
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

    // 3. Render Page
    container.innerHTML = `
        <article class="fade-in">
            <header>
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <h2>${poll.title}</h2>
                        <p>${poll.description || 'No description provided.'}</p>
                    </div>
                    <button class="outline secondary" id="share-link-btn" style="width: auto;">Share Poll</button>
                </div>
            </header>

            ${tokenError ? `
                <div class="p-4 mb-4 border border-red-300 bg-red-50 text-red-700 rounded-md">
                    <strong>⚠️ Invalid Edit Link:</strong> This link is no longer valid. You can still add a new response below.
                </div>
            ` : ''}

            <p class="timezone-subtitle">Times shown in ${Intl.DateTimeFormat().resolvedOptions().timeZone}</p>

            <form id="unified-vote-form">
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
                                                <div class="weekday">${weekday}</div>
                                                <div class="date">${date}</div>
                                                <div class="time">${time}</div>
                                                ${isOptimal ? '<span class="optimal-badge">Optimal</span>' : ''}
                                            </div>
                                        </th>
                                    `;
                                }).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${poll.responses.map(res => {
                                // Match using both id and response_id to handle API inconsistencies
                                const isEditingThis = userResponse && (res.id === userResponse.id || res.id === userResponse.response_id);
                                if (isEditingThis) return renderActiveRow(poll, userResponse);
                                
                                return `
                                    <tr>
                                        <td class="sticky-column" style="text-align: left;"><strong>${res.voter_name}</strong></td>
                                        ${poll.options.map(opt => {
                                            const vote = res.votes.find(v => v.option_id === opt.id);
                                            const status = vote ? vote.status : null;
                                            return `
                                        <td class="vote-cell" data-status="${status}">
                                                    ${status === 2 ? '⭐' : (status === 1 ? '➖' : (status === 0 ? '❌' : '-'))}
                                                </td>
                                            `;
                                        }).join('')}
                                    </tr>
                                `;
                            }).join('')}

                            ${!userResponse ? renderActiveRow(poll, null) : ''}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td class="sticky-column" style="text-align: left;"><strong>Scores</strong></td>
                                ${poll.options.map(opt => {
                                    const rank = poll.metadata.rankings.find(r => r.option_id === opt.id);
                                    return `<td><strong>${rank ? rank.score : 0}</strong></td>`;
                                }).join('')}
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div style="margin-top: 1.5rem; display: flex; justify-content: flex-end;">
                    <button type="submit" id="submit-vote-btn" class="primary" style="width: auto; padding: 0.75rem 2rem;">
                        ${userResponse ? 'Update My Response' : 'Submit My Response'}
                    </button>
                </div>
                <div id="vote-success-banner" style="display: none; margin-top: 1rem; text-align: right; color: var(--accent-color); font-weight: bold;">
                    Response saved. You can always edit it later.
                </div>
            </form>

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

    function renderActiveRow(poll, existingResponse) {
        const voterName = existingResponse ? existingResponse.voter_name : '';
        return `
            <tr class="active-row">
                <td class="sticky-column" style="text-align: left; vertical-align: middle;">
                    <input type="text" id="voter-name" name="voter_name" 
                           value="${voterName}" 
                           placeholder="Your Name" required 
                           style="margin-bottom: 0; padding: 0.4rem 0.6rem;">
                </td>
                ${poll.options.map((opt, index) => {
                    const vote = existingResponse ? existingResponse.votes.find(v => v.option_id === opt.id) : null;
                    const status = vote ? vote.status : 1; // Default to Implicit OK (1)
                    return `
                        <td>
                            <div class="triage-cell" data-index="${index}" data-option-id="${opt.id}" data-status="${status}">
                                <input type="hidden" name="opt_${opt.id}" value="${status}">
                                <span class="triage-icon">
                                    ${status === 0 ? '❌' : (status === 2 ? '⭐' : '<span class="triage-dash">➖</span>')}
                                </span>
                            </div>
                        </td>
                    `;
                }).join('')}
            </tr>
        `;
    }

    // 4. Interaction Logic
    const voteForm = container.querySelector('#unified-vote-form');
    const shareBtn = container.querySelector('#share-link-btn');
    const copyEditBtn = container.querySelector('#copy-edit-link-btn');
    const submitBtn = voteForm.querySelector('#submit-vote-btn');

    const updateSubmitButtonReceipt = () => {
        const votes = Array.from(voteForm.querySelectorAll('input[type="hidden"]')).map(input => parseInt(input.value));
        const vetoed = votes.filter(v => v === 0).length;
        const preferred = votes.filter(v => v === 2).length;
        const ok = votes.filter(v => v === 1).length;

        let receiptText = "Confirm: ";
        if (vetoed === 0 && preferred === 0) {
            receiptText += "Available for ALL options";
        } else {
            const parts = [];
            if (preferred > 0) parts.push(`${preferred} Preferred`);
            if (vetoed > 0) parts.push(`${vetoed} Impossible`);
            if (ok > 0) parts.push(`${ok} OK`);
            receiptText += parts.join(', ');
        }
        submitBtn.innerText = receiptText;
    };

    // Initialize receipt text
    updateSubmitButtonReceipt();

    // Progressive Triage Logic
    voteForm.querySelectorAll('.triage-cell').forEach(cell => {
        cell.onclick = (e) => {
            const hiddenInput = cell.querySelector('input');
            const status = parseInt(hiddenInput.value);

            if (status === 1) {
                // 1-Tap Veto
                updateCellStatus(cell, 0);
                updateSubmitButtonReceipt();
            } else {
                // 2-Tap Popover
                showTriagePopover(cell);
            }
        };
    });

    function updateCellStatus(cell, status) {
        const hiddenInput = cell.querySelector('input');
        const iconContainer = cell.querySelector('.triage-icon');
        hiddenInput.value = status;
        cell.dataset.status = status;
        iconContainer.innerHTML = status === 0 ? '❌' : (status === 2 ? '⭐' : '<span class="triage-dash">➖</span>');
    }

    function showTriagePopover(cell) {
        // Remove any existing popover
        document.querySelectorAll('.triage-popover').forEach(p => p.remove());

        const popover = document.createElement('div');
        popover.className = 'triage-popover';
        popover.innerHTML = `
            <button type="button" class="popover-clear" data-val="1">➖ Clear</button>
            <button type="button" class="popover-prefer" data-val="2">⭐ Prefer</button>
        `;

        document.body.appendChild(popover);

        const rect = cell.getBoundingClientRect();
        popover.style.left = `${rect.left + (rect.width / 2) - (popover.offsetWidth / 2)}px`;
        popover.style.top = `${rect.top + (rect.height / 2) - (popover.offsetHeight / 2)}px`;

        const closePopover = () => {
            popover.remove();
            document.removeEventListener('mousedown', onOutsideClick);
        };

        const onOutsideClick = (e) => {
            if (!popover.contains(e.target)) closePopover();
        };

        popover.querySelectorAll('button').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                updateCellStatus(cell, parseInt(btn.dataset.val));
                updateSubmitButtonReceipt();
                closePopover();
            };
        });

        setTimeout(() => document.addEventListener('mousedown', onOutsideClick), 10);
    }

    shareBtn.onclick = () => {
        const pollUrl = `${window.location.origin}?id=${pollId}`;
        navigator.clipboard.writeText(pollUrl);
        const originalText = shareBtn.innerText;
        shareBtn.innerText = 'Copied!';
        setTimeout(() => shareBtn.innerText = originalText, 2000);
    };

    if (copyEditBtn) {
        copyEditBtn.onclick = () => {
            const editUrl = `${window.location.host}${window.location.pathname}?id=${pollId}&edit=${activeEditToken}`;
            navigator.clipboard.writeText(editUrl);
            const originalText = copyEditBtn.innerText;
            copyEditBtn.innerText = 'Copied!';
            setTimeout(() => copyEditBtn.innerText = originalText, 2000);
        };
    }

    voteForm.onsubmit = async (e) => {
        e.preventDefault();
        const voterName = voteForm.querySelector('#voter-name').value.trim();

        if (!voterName) {
            voteForm.querySelector('#voter-name').setAttribute('aria-invalid', 'true');
            voteForm.querySelector('#voter-name').focus();
            return;
        }

        const votes = poll.options.map(opt => ({
            option_id: opt.id,
            status: parseInt(voteForm.querySelector(`[name="opt_${opt.id}"]`).value)
        }));

        try {
            submitBtn.setAttribute('aria-busy', 'true');
            submitBtn.disabled = true;

            let result;
            if (activeEditToken && userResponse) {
                // Update
                result = await API.updateResponse(pollId, activeEditToken, { voter_name: voterName, votes });
            } else {
                // New
                result = await API.submitVote(pollId, { voter_name: voterName, votes });
                // Store edit token locally
                pollsMap[pollId] = result.edit_token;
                localStorage.setItem('polls_map', JSON.stringify(pollsMap));
            }

            // Show Success Banner
            const banner = voteForm.querySelector('#vote-success-banner');
            banner.style.display = 'block';
            
            // Refresh view after a short delay
            setTimeout(() => {
                renderPollView(container, pollId, activeEditToken || result?.edit_token);
            }, 1500);
            
        } catch (err) {
            console.error(err);
            alert('Failed to save response: ' + err.message);
            submitBtn.removeAttribute('aria-busy');
            submitBtn.disabled = false;
        }
    };
}
