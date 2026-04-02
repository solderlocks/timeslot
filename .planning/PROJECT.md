# timeslot.ink

## What This Is

A stateless, serverless, open-source group scheduling utility. It serves as a FOSS (Free and Open Source Software) replacement for Doodle's core use case, prioritizing extreme simplicity, zero account overhead, and edge-native performance.

## Core Value

Instant, frictionless group scheduling without the friction of accounts, logins, or heavy client-side frameworks.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] **Create Poll**: Capture title, optional description, and dynamic datetime range options.
- [ ] **Matrix Grid (The "Grid")**: Interactive voting interface displaying all participants and their binary (Yes/No) status.
- [ ] **Automatic UTC Contract**: Frontend-only local-to-UTC conversion; backend treats UTC as the only truth.
- [ ] **Edit Identity**: Persistent access to individual responses via unguessable tokens (NanoID) instead of accounts.
- [ ] **Optimal Time Highlighting**: Visual indicators for time slots that work for the maximum number of participants.
- [ ] **Cloudflare Native Infrastructure**: Implementation using Cloudflare Pages, Workers (with Hono), and D1 SQL storage.

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

- **Tech Stack**: Vanilla JS, HTML5, Pico.css (CDN), Cloudflare Workers (Hono), Cloudflare D1 — Zero build steps required.
- **Data Integrity**: UTC ISO 8601 is the mandatory format for all storage and transmission.
- **Design Language**: "Tight and clean" custom CSS layered on top of Pico.css to provide a premium feel without heavy assets.
- **Identity**: NanoID (21-character strings) for all primary keys to ensure unguessable URLs.

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
