/**
 * views/success.js: The "Poll Created" success view logic.
 */

export async function renderSuccessView(container, pollId) {
    const origin = window.location.origin;
    const participantUrl = `${origin}?id=${pollId}`;
    container.innerHTML = `
        <article class="fade-in">
            <header>
                <div class="poll-header-row">
                    <div>
                        <h2 class="poll-title poll-title-compact">Poll Created!</h2>
                        <p class="poll-description-muted">Your stateless poll is live. Shared with your group to start collecting responses.</p>
                    </div>
                </div>
            </header>
            
            <section>
                <h3>Participant Link</h3>
                <p class="instruction-text">Anyone with this link can view the poll and add their response.</p>
                <div class="success-link-row">
                    <div class="input-with-button success-link-display">
                        <input type="text" id="poll-url-display" value="${participantUrl}" readonly>
                        <button type="button" id="copy-poll-btn" class="embedded-icon-btn" data-tippy-content="Copy Link">📋</button>
                    </div>
                    <a href="${participantUrl}" class="button primary success-view-poll-btn">View Poll ></a>
                </div>
            </section>
        </article>
    `;

    /**
     * Clipboard API Utility with Visual Feedback.
     */
    const copyToClipboard = async (text, button) => {
        try {
            await navigator.clipboard.writeText(text);
            const originalText = button.innerText;
            button.innerText = 'Copied!';
            button.classList.add('copied');
            
            setTimeout(() => {
                button.innerText = originalText;
                button.classList.remove('copied');
            }, 2000);
        } catch (err) {
            console.error('Failed to copy', err);
            alert('Failed to copy to clipboard.');
        }
    };

    container.querySelector('#copy-poll-btn').onclick = (e) => {
        copyToClipboard(participantUrl, e.target);
    };
}
