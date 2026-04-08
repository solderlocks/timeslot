/**
 * views/success.js: The "Poll Created" success view logic.
 */

export async function renderSuccessView(container, pollId, editToken, isEdit = false) {
    const origin = window.location.origin;
    const participantUrl = `${origin}?id=${pollId}`;
    const editUrl = editToken ? `${origin}?id=${pollId}&admin=${editToken}` : null;

    container.innerHTML = `
        <article class="fade-in">
            <header>
                <div class="poll-header-row">
                    <div>
                        <h2 class="poll-title poll-title-compact">${isEdit ? 'Poll Edited' : 'Poll Created'}</h2>
                        <p class="poll-description-muted">${isEdit ? 'Your changes have been saved.' : 'Your poll is live. Share it with your group to start collecting responses.'}</p>
                    </div>
                </div>
            </header>
            
            <section class="success-link-section">
                <label class="success-link-label">Participant Link</label>
                <div class="success-link-row">
                    <div class="input-with-button success-link-display">
                        <input type="text" id="poll-url-display" value="${participantUrl}" readonly>
                        <button type="button" id="copy-poll-btn" class="embedded-icon-btn" title="Copy Participant Link">📋</button>
                    </div>
                    <a href="${participantUrl}" class="button primary success-view-poll-btn margin-0">
                        <span>View Poll</span>
                        <span class="chevron-right">›</span>
                    </a>
                </div>
                <p class="instruction-text hint-text">Anyone with this link can view the poll and add their response.</p>
            </section>

            ${editUrl ? `
            <section class="success-link-section" style="margin-top: 2rem;">
                <label class="success-link-label">Private Edit Link</label>
                <div class="success-link-row">
                    <div class="input-with-button success-link-display">
                        <input type="text" id="edit-url-display" value="${editUrl}" readonly>
                        <button type="button" id="copy-edit-btn" class="embedded-icon-btn" title="Copy Edit Link">📋</button>
                    </div>
                </div>
                <p class="instruction-text hint-text" style="color: #d97706;">⚠️ Keep this private! This link allows anyone to edit the poll options or delete it.</p>
            </section>
            ` : ''}
        </article>
    `;

    /**
     * Clipboard API Utility with Tippy Feedback on the Buttons.
     */
    const setupCopy = (btnId, textToCopy) => {
        const btn = container.querySelector(`#${btnId}`);
        if (!btn) return;

        if (window.tippy) {
            window.tippy(btn, {
                content: 'Copied!',
                trigger: 'manual',
                placement: 'top',
                appendTo: btn.parentNode,
                onShow(instance) {
                    setTimeout(() => instance.hide(), 2000);
                }
            });
        }

        btn.onclick = async () => {
            try {
                await navigator.clipboard.writeText(textToCopy);
                if (btn._tippy) btn._tippy.show();
            } catch (err) {
                console.error('Failed to copy', err);
            }
        };
    };

    setupCopy('copy-poll-btn', participantUrl);
    if (editUrl) setupCopy('copy-edit-btn', editUrl);
}
