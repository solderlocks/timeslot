# Architecture Research

**Domain:** Edge Scheduling Service
**Researched:** 2026-04-01

## Component Boundaries

### Frontend (Cloudflare Pages)
- **State:** React-less, Vanilla JS.
- **Views:** Three-view structure (Create, Poll, Edit).
- **Communication:** Pure JSON `fetch` to Worker API.
- **CSS:** Pico.css + Custom design system.

### API (Cloudflare Worker)
- **Router:** Hono.
- **Middleware:** CORS, Error handling, (Optional) Zod validation.
- **Logic:** Request parsing, NanoID generation, D1 interaction.

### Database (Cloudflare D1)
- **Engine:** SQLite at the Edge.
- **Transactions:** Handled via `.batch()` for atomicity.
- **Schema:** relational SQL (Polls, Options, Responses, Votes).

## Data Flow

1.  **Poll Creation**: User inputs title/dates -> `api.js` converts to UTC -> `POST /api/polls` -> Worker generates NanoID -> D1 `batch()` insert Poll and Options.
2.  **Voting**: User browser fetches poll info -> Renders Grid (local time) -> User votes -> `POST /api/polls/:id/vote` -> Worker generates edit token -> D1 `batch()` insert Response and Votes.
3.  **Optimal Slot Calculation**: Grid re-loads -> Single `JOIN` query pulls all response data -> Frontend reduces the set to find max(votes) per slot -> Highlight optimal column.

## Built-in Scalability

- **No Sessions**: Entirely stateless. Scalable horizontally by design.
- **Edge Deployment**: API and static assets are delivered from the nearest Cloudflare data center.

---
*Architecture research for: timeslot.ink*
