/**
 * views/landing.js: Clean, centered hero section for the root URL
 */

export function renderLandingView(container) {
    container.innerHTML = `
        <article class="fade-in landing-hero">
            <div class="hero-content">
                <h1 class="hero-headline">Scheduling without the survey.</h1>
                <p class="hero-subheadline">
                    Timeslot is a stateless, subtractive scheduling tool. No accounts, no preferred times, just finding the gaps.
                </p>
                
                <div class="hero-actions">
                    <a href="/create" class="button primary hero-cta" data-link>Get Started</a>
                    <a href="#" id="open-philosophy-link" class="philosophy-link">
                        Read the Philosophy
                    </a>
                </div>
            </div>
        </article>
    `;

    const philLink = document.getElementById('open-philosophy-link');
    if (philLink) {
        philLink.onclick = (e) => {
            e.preventDefault();
            if (window.openPhilosophyModal) window.openPhilosophyModal();
        };
    }
}
