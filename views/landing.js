/**
 * views/landing.js: Clean, centered hero section for the root URL
 */

export function renderLandingView(container) {
    container.innerHTML = `
        <article class="fade-in landing-hero">
            <div class="hero-content">
                <h1 class="hero-headline animate-rise-in">Subtractive group scheduling. 🐝</h1>
                <p class="hero-subheadline animate-rise-in delay-150">
                    Open-source utility for group scheduling. Propose times, let participants eliminate conflicts, and view the remaining gaps. No accounts required.
                </p>
                
                <div class="hero-actions animate-rise-in delay-300">
                    <a href="/create" class="button primary hero-cta" data-link>Get Started</a>
                    <a href="#" id="open-philosophy-link" class="philosophy-link philosophy-trigger">How it works</a>
                </div>
            </div>
        </article>
    `;
}
