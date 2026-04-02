# Roadmap: timeslot.ink

## Overview

A 4-phase execution plan to build a stateless group scheduling tool on the Cloudflare edge. Focuses on data integrity, server-side consensus, and a high-density matrix grid.

## Phases

- [ ] **Phase 1: Foundation & Data Layer** - Initialize Cloudflare D1 with a 3-state schema and prefixed NanoIDs.
- [ ] **Phase 2: Edge API (Worker)** - Develop the Hono API including the weighted consensus engine and `db.batch()` mutations.
- [ ] **Phase 3: Frontend - Layout & Create Poll** - Implement View A (Create Poll) with the `api.js` local->UTC contract.
- [ ] **Phase 4: Frontend - Matrix Grid & Edit Flows** - Build the high-density voting grid with server-side highlighting.

## Phase Details

### Phase 1: Foundation & Data Layer
**Goal**: Establish the "Source of Truth" in Cloudflare D1.
**Depends on**: Nothing (first phase)
**Requirements**: [FUND-01, FUND-02, FUND-03]
**Success Criteria**:
  1. Cloudflare D1 is initialized and schema is applied.
  2. ID generator prepends `p_` and `e_` prefixes as specified.
  3. Seed data is present and correctly reflects relational JOINs.
**Plans**: 2 plans

Plans:
- [ ] 01-01: Initialize D1 and execute schema SQL.
- [ ] 01-02: Write seed script and verify foreign key cascades.

### Phase 2: Edge API (Worker)
**Goal**: Functional API endpoints with server-side consensus.
**Depends on**: Phase 1
**Requirements**: [API-01, API-02, API-03, API-04, API-05, FUND-04]
**Success Criteria**:
  1. `db.batch()` helper ensures atomic voter registration.
  2. Weighted scores (Yes=2, Maybe=1) are returned in ranked metadata.
  3. `e_` tokens are strictly hidden in public poll GETs.
**Plans**: 3 plans

Plans:
- [ ] 02-01: Scaffold Hono app and implement Poll creation.
- [ ] 02-02: Implement voting logic with `db.batch()`.
- [ ] 02-03: Develop the server-side consensus engine.

### Phase 3: Frontend - Layout & Create Poll
**Goal**: User can create a new poll.
**Depends on**: Phase 2
**Requirements**: [UI-01, UI-02]
**Success Criteria**:
  1. `api.js` correctly converts `datetime-local` input to UTC ISO 8601.
  2. Router logic successfully toggles between "Create" and "Poll" views.
**Plans**: 2 plans

### Phase 4: Frontend - Matrix Grid & Edit Flows
**Goal**: High-density interactive scheduling grid.
**Depends on**: Phase 3
**Requirements**: [UI-03, UI-04, UI-05]
**Success Criteria**:
  1. Matrix grid uses **Event Delegation** on the `#app` container.
  2. Optimal slots are highlighted based on backend consensus metadata.
  3. `.matrix-table` density layer (reduced padding/font) is active for usability.
**Plans**: 2 plans

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/2 | Not started | - |
| 2. Edge API | 0/3 | Not started | - |
| 3. Frontend - Create | 0/2 | Not started | - |
| 4. Frontend - Grid | 0/2 | Not started | - |

---
*Roadmap defined: 2026-04-01*
