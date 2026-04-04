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
                        <h2 class="poll-title poll-title-compact">Poll Created</h2>
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
                        <button type="button" id="copy-poll-btn" class="embedded-icon-btn">📋</button>
                    </div>
                    <a href="${participantUrl}" class="button primary success-view-poll-btn">
                        <span>View Poll</span>
                        <span class="chevron-right">›</span>
                    </a>
                </div>
            </section>
        </article>
    `;

    /**
     * Clipboard API Utility with Tippy Feedback.
     */
    const copyBtn = container.querySelector('#copy-poll-btn');
    if (window.tippy) {
        window.tippy(copyBtn, {
            content: 'Copy Link',
            hideOnClick: false,
            onShow(instance) {
                if (instance.props.content === 'Copied!') {
                    setTimeout(() => {
                        instance.hide();
                        setTimeout(() => instance.setContent('Copy Link'), 500);
                    }, 2000);
                }
            }
        });
    }

    copyBtn.onclick = async () => {
        try {
            await navigator.clipboard.writeText(participantUrl);
            if (copyBtn._tippy) {
                copyBtn._tippy.setContent('Copied!');
                copyBtn._tippy.show();
            }
        } catch (err) {
            console.error('Failed to copy', err);
        }
    };
}
