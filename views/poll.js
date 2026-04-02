/**
 * views/poll.js: The high-density Matrix Grid and Voting View.
 */

import { API, formatDate } from '../api.js';

export async function renderPollView(container, pollId, urlEditToken) {
    // 1. Initial Data Fetch
    container.innerHTML = `<article aria-busy="true"></article>`;
    const poll = await API.getPoll(pollId);
    
    // 2. Check for Edit Context
    // Priority: URL Param > LocalStorage mapping
    const pollsMap = JSON.parse(localStorage.getItem('polls_map') || '{}');
    const storedEditToken = pollsMap[pollId];
    const activeEditToken = urlEditToken || storedEditToken;

    let userResponse = null;
    if (activeEditToken) {
        try {
            userResponse = await API.getResponse(pollId, activeEditToken);
        } catch (e) {
            console.warn('Invalid or expired edit token');
        }
    }

    // 3. Render Header
    container.innerHTML = `
        <article class="fade-in">
            <header>
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <h2>${poll.title}</h2>
                        <p>${poll.description || 'No description provided.'}</p>
                    </div>
                    <button class="outline secondary" id="share-poll-btn" style="width: auto;">Share Link</button>
                </div>
            </header>

            <div style="overflow-x: auto;">
                <table class="matrix-table">
                    <thead>
                        <tr>
                            <th style="text-align: left; min-width: 150px;">Participants</th>
                            ${poll.options.map(opt => `
                                <th class="${poll.metadata.optimal_option_ids.includes(opt.id) ? 'optimal-column' : ''}">
                                    ${formatDate(opt.start_time)}
                                    ${poll.metadata.optimal_option_ids.includes(opt.id) ? '<br><small>(Optimal)</small>' : ''}
                                </th>
                            `).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${poll.responses.length === 0 ? `
                            <tr>
                                <td colspan="${poll.options.length + 1}" style="text-align: center; color: var(--muted-color);">No responses yet. Be the first!</td>
                            </tr>
                        ` : poll.responses.map(res => `
                            <tr>
                                <td style="text-align: left;"><strong>${res.voter_name}</strong></td>
                                ${poll.options.map(opt => {
                                    const vote = res.votes.find(v => v.option_id === opt.id);
                                    const status = vote ? vote.status : null;
                                    return `
                                        <td class="vote-cell" data-status="${status}">
                                            ${status === 2 ? '✅' : (status === 1 ? '❓' : (status === 0 ? '❌' : '-'))}
                                        </td>
                                    `;
                                }).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td style="text-align: left;"><strong>Scores</strong></td>
                            ${poll.options.map(opt => {
                                const rank = poll.metadata.rankings.find(r => r.option_id === opt.id);
                                return `<td><strong>${rank ? rank.score : 0}</strong></td>`;
                            }).join('')}
                        </tr>
                    </tfoot>
                </table>
            </div>

            <!-- Voting Section -->
            <section style="margin-top: 3rem;">
                <article>
                    <header>
                        <h3>${userResponse ? 'Edit your response' : 'Submit your response'}</h3>
                    </header>
                    <form id="vote-form">
                        <label for="voter-name">Your Name
                            <input type="text" id="voter-name" name="voter_name" 
                                   value="${userResponse ? userResponse.voter_name : ''}" 
                                   required placeholder="e.g., Alice">
                        </label>
                        
                        <div style="overflow-x: auto;">
                            <table class="matrix-table" style="background: var(--bg-color);">
                                <thead>
                                    <tr>
                                        ${poll.options.map(opt => `<th>${formatDate(opt.start_time)}</th>`).join('')}
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        ${poll.options.map(opt => {
                                            const existingVote = userResponse ? userResponse.votes.find(v => v.option_id === opt.id) : null;
                                            const status = existingVote ? existingVote.status : 2; // Default to Yes
                                            return `
                                                <td>
                                                    <fieldset style="margin-bottom: 0; border: none; padding: 0;">
                                                        <select name="opt_${opt.id}" class="vote-select">
                                                            <option value="2" ${status === 2 ? 'selected' : ''}>Yes</option>
                                                            <option value="1" ${status === 1 ? 'selected' : ''}>Maybe</option>
                                                            <option value="0" ${status === 0 ? 'selected' : ''}>No</option>
                                                        </select>
                                                    </fieldset>
                                                </td>
                                            `;
                                        }).join('')}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        
                        <footer style="margin-top: 2rem;">
                            <button type="submit" id="submit-vote-btn" class="primary">
                                ${userResponse ? 'Update My Response' : 'Add My Response'}
                            </button>
                        </footer>
                    </form>
                </article>
            </section>
        </article>
    `;

    // 4. Interaction Logic
    const voteForm = container.querySelector('#vote-form');
    const shareBtn = container.querySelector('#share-poll-btn');

    shareBtn.onclick = () => {
        const url = window.location.origin + '?id=' + pollId;
        navigator.clipboard.writeText(url);
        shareBtn.innerText = 'Copied!';
        setTimeout(() => shareBtn.innerText = 'Share Link', 2000);
    };

    voteForm.onsubmit = async (e) => {
        e.preventDefault();
        const voterName = voteForm.querySelector('#voter-name').value.trim();
        const submitBtn = voteForm.querySelector('#submit-vote-btn');

        if (!voterName) {
            voteForm.querySelector('#voter-name').setAttribute('aria-invalid', 'true');
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
                // Store edit token
                pollsMap[pollId] = result.edit_token;
                localStorage.setItem('polls_map', JSON.stringify(pollsMap));
            }

            // Refresh view
            renderPollView(container, pollId);
        } catch (err) {
            console.error(err);
            alert('Failed to save response: ' + err.message);
            submitBtn.removeAttribute('aria-busy');
            submitBtn.disabled = false;
        }
    };
}
