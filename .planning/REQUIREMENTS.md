# Requirements: timeslot.ink

**Defined:** 2026-04-01
**Core Value:** Instant, frictionless group scheduling without account overhead.

## v1 Requirements

### Foundation (FUND)

- [ ] **FUND-01**: Initialize Cloudflare D1 with a 3-state schema: 0 (No), 1 (Maybe/If Need Be), 2 (Yes).
- [ ] **FUND-02**: Implement ID prefixing logic: `p_` for Poll IDs, `e_` for Voter Edit Tokens.
- [ ] **FUND-03**: Seed D1 with test data covering multiple voters and all possible vote states.
- [ ] **FUND-04**: Implement `db.batch()` helper for atomic multi-table mutations.

### Edge API (API)

- [ ] **API-01**: Implement `POST /api/polls` via **Pages Functions** with strict UTC normalization (ISO 8601).
- [ ] **API-02**: Implement `GET /api/polls/:id` aggregate handler excluding edit tokens.
- [ ] **API-03**: Implement `POST /api/polls/:id/vote` returning `e_[token]` for client-side storage.
- [ ] **API-04**: Implement `GET` and `PUT` for response editing via **Pages Functions** in `/functions`.
- [ ] **API-05**: Implement Server-Side Consensus Engine: Calculate optimal IDs via (Yes*2 + Maybe*1) and return as ranked metadata.

### Frontend UI (UI)

### Phase 3: Frontend - Layout & Create Poll
**Goal**: User can create a new poll and manage their links.
**Depends on**: Phase 2
**Requirements**: [UI-01, UI-02, UI-03, UI-04, UI-05]
**Success Criteria**:
  1. `api.js` correctly converts `datetime-local` input to UTC ISO 8601 while handling local offsets.
  2. Success view displays both Participant and Admin links (absolute URLs) with "Copied!" feedback.
  3. Dynamic slots can be added (with +1hr smart logic) and removed (Event Delegation verified).
  4. Validation uses `aria-invalid="true"` styles instead of JS alerts.
**Plans**: 2 plans

- [ ] **UI-01**: Build `api.js` with robust local->UTC normalization (handling local offset) and past-date `aria-invalid` validation.
- [ ] **UI-02**: Implement view router in `app.js` using `URLSearchParams` (?id=, ?success=). Supports absolute URL generation via `window.location.origin`.
- [ ] **UI-03**: Create View (A) with "Smart Slot" (+1hr default from previous) logic and Event Delegation for row management.
- [ ] **UI-04**: Implement Intermediate Success View (UI-06) with Participant and Admin link copy buttons.
- [ ] **UI-05**: Implement Clipboard API utility with visual "Copied!" feedback state (2s timeout).
- [ ] **UI-06**: Apply `.matrix-table` density layer and hardcoded Pico.css @2.0.6.

## Out of Scope

| Feature | Reason |
|---------|--------|
| User Accounts | Constraint: URL is the only identity primitive. |
| Email Notifications | PII storage and SMTP management overhead. |
| Poll Expiry | Simplified v1 state management. |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FUND-01 | Phase 1 | Pending |
| FUND-02 | Phase 1 | Pending |
| FUND-03 | Phase 1 | Pending |
| FUND-04 | Phase 2 | Pending |
| API-01  | Phase 2 | Pending |
| API-02  | Phase 2 | Pending |
| API-03  | Phase 2 | Pending |
| API-04  | Phase 2 | Pending |
| API-05  | Phase 2 | Pending |
| UI-01   | Phase 3 | Pending |
| UI-02   | Phase 3 | Pending |
| UI-03   | Phase 4 | Pending |
| UI-04   | Phase 4 | Pending |
| UI-05   | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 14 total
- Mapped to phases: 14
- Unmapped: 0 ✓

---
*Last updated: 2026-04-01 after project initialization*
