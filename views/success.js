/**
 * views/success.js: The "Poll Created" success view logic.
 */

export async function renderSuccessView(container, pollId) {
    const origin = window.location.origin;
    const participantUrl = `${origin}?id=${pollId}`;
    container.innerHTML = `
        <article class="fade-in">
            <header>
                <h2 class="text-green-600">Poll Created!</h2>
                <p>Your stateless poll is live. Shared with your group to start collecting responses.</p>
            </header>
            
            <section>
                <h3>Participant Link</h3>
                <p>Anyone with this link can view the poll and add their response.</p>
                <form id="copy-poll-link-form">
                    <div style="display: flex; gap: 1rem;">
                        <input type="text" id="poll-url-display" value="${participantUrl}" readonly style="flex: 1;">
                        <button type="button" id="copy-poll-btn" class="primary" style="flex: 0 0 auto;">Copy Link</button>
                    </div>
                </form>                
            </section>
            
            <footer style="margin-top: 2rem;">
                <a href="${participantUrl}" class="button primary">View Poll Matrix</a>
            </footer>
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
