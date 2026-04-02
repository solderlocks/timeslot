# timeslot.ink

## What This Is

A stateless, serverless, open-source group scheduling utility. It serves as a FOSS (Free and Open Source Software) replacement for Doodle's core use case, prioritizing extreme simplicity, zero account overhead, and edge-native performance.

## Core Value

Instant, frictionless group scheduling without the friction of accounts, logins, or heavy client-side frameworks.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] **Create Poll**: Capture title, optional description, and dynamic datetime range options. Use `p_` prefix for Poll IDs.
- [ ] **Matrix Grid (The "Grid")**: Interactive voting interface with a dedicated `.matrix-table` density layer. Automatically detects returning voters via `localStorage` mapping (`p_ID -> e_ID`) to toggle "Edit" vs "New" response flows.
- [ ] **Server-Side Consensus**: API-driven "Optimal Time" calculation using weighted scores (Yes=2, Maybe=1). Implemented via **Cloudflare Pages Functions** for same-origin simplicity.
- [ ] **Automatic UTC Contract**: Frontend-only local-to-UTC conversion; backend treats UTC as the only truth.
- [ ] **Edit Identity**: Persistent access to individual responses via `e_` prefixed unguessable tokens. Tokens are strictly excluded from public GET responses.
- [ ] **Cloudflare Native Infrastructure**: Implementation using Cloudflare Pages, **Pages Functions** (`/functions`), and a single production D1 SQL storage instance.

### Out of Scope

- **User Accounts/Logins** — Security is achieved through unguessable tokens, not authentication.
- **Email Notifications/Reminders** — Avoids the complexity of SMTP and PII storage.
- **Poll Expiry/Auto-close** — Keeps the state management simple for v1.
- **"If Need Be" Votes** — Strictly binary (Yes/No) to ensure clear decision-making.
- **Mobile-Native Apps** — Strictly web-first responsive design.

## Context

- **Constraint Manifesto**: Zero build steps. Vanilla JS (ES6 modules), HTML5, and Pico.css via CDN. No Webpack or npm.
- **Architecture**: Separated into three clean files (`index.html`, `api.js`, `app.js`) to ensure extreme longevity and ease of maintenance.
- **State Management**: Stateless at the session level; persistent state resides entirely in Cloudflare D1.

## Constraints

- **Tech Stack**: Vanilla JS, HTML5, Pico.css `@2.0.6` (Hardcoded CDN), Cloudflare Pages Functions (Hono), Cloudflare D1 — Zero build steps.
- **Environment**: Single production D1 database. Local development/testing via `wrangler dev`. No staging/preview databases.
- **Design Language**: "Tight and clean" custom CSS with a specific `.matrix-table` density layer (0.25rem padding, 0.85rem font) for usability.
- **Identity Security**: Prefixed identifiers (`p_`, `e_`) to prevent token leakage and improve self-documentation.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| NanoID for IDs | Shorter, URL-safe, and unguessable identifiers | — Pending |
| Hono as API Router | Lightweight, performant, and Cloudflare-native | — Pending |
| Vanilla JS (No Build) | Maximum longevity and zero maintenance overhead | — Pending |
| Custom CSS on Pico | Premium aesthetics with minimal footprint | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-01 after project initialization*
