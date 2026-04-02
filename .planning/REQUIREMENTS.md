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

- [ ] **API-01**: Implement `POST /api/polls` with strict UTC normalization (ISO 8601).
- [ ] **API-02**: Implement `GET /api/polls/:id` aggregate handler. Ensure `e_` tokens are EXCLUDED.
- [ ] **API-03**: Implement `POST /api/polls/:id/vote` returning `e_[token]` for client-side storage.
- [ ] **API-04**: Implement `GET` and `PUT` for `/api/polls/:id/response/:editToken`.
- [ ] **API-05**: Implement Server-Side Consensus Engine: Calculate optimal IDs via (Yes*2 + Maybe*1) and return as ranked metadata.

### Frontend UI (UI)

- [ ] **UI-01**: Build `api.js` wrapper with atomic local->UTC conversion.
- [ ] **UI-02**: Implement three-view router in `app.js` using URL parameters (?id=, ?edit=).
- [ ] **UI-03**: Build Matrix Grid using **Event Delegation** on a single `#app` container.
- [ ] **UI-04**: Implement `.matrix-table` density layer (reduced padding/font) for complex scheduling grids.
- [ ] **UI-05**: Visually highlight optimal slots based on API-provided ranked metadata.

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
