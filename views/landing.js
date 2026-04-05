/**
 * views/landing.js: Clean, centered hero section for the root URL
 */

export function renderLandingView(container) {
    container.innerHTML = `
        <article class="fade-in landing-hero">
            <div class="hero-content">
                <h1 class="hero-headline animate-rise-in">Subtractive group scheduling. 🐝</h1>
                <p class="hero-subheadline animate-rise-in" style="animation-delay: 150ms;">
                    Open-source utility for group scheduling. Propose times, let participants eliminate conflicts, and see the remaining gaps. No accounts required.
                </p>
                
                <div class="hero-actions animate-rise-in" style="animation-delay: 300ms;">
                    <a href="/create" class="button primary hero-cta" data-link>Create a Poll</a>
                    <a href="#" id="open-philosophy-link" class="philosophy-link">
                        How it works
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
