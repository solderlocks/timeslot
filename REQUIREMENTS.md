# REQUIREMENTS.md
## Project: timeslot.ink

**Mission:** Build a stateless, serverless, open-source group scheduling utility — a FOSS replacement for Doodle's core use case.

---

## Constraint Manifesto

1. **No user accounts, no logins. Ever.** The URL (UUID/NanoID) is the only identity primitive. Security is achieved through unguessable tokens, not authentication.
2. **Zero build steps.** Vanilla JS (ES6 modules), HTML5, and Pico.css via CDN. No Webpack, no npm install, no transpilation.
3. **Infrastructure is Cloudflare-native.** Cloudflare Pages for the static frontend, Cloudflare Workers (with **Hono** as the router) for the edge API, Cloudflare D1 for SQL storage.
4. **UTC is the only truth.** All times are stored and transmitted as UTC ISO 8601. All local rendering is the frontend's responsibility, using the browser's `Intl.DateTimeFormat().resolvedOptions().timeZone`.
5. **Inputs produce UTC before leaving the browser.** The `api.js` layer is responsible for converting `datetime-local` picker values to UTC ISO 8601 via `new Date(localString).toISOString()` before any `fetch` call. The backend must validate that received time strings are valid ISO 8601 and reject any that are not.

---

## v1 Scope

Everything in this document is v1. The following are explicitly **out of scope for v1**:

- Email notifications or reminders
- Poll expiry / auto-close
- "If need be" (maybe) vote status — votes are binary: Yes (1) or No (0)
- Admin password or poll deletion UI
- Mobile-native app

---

## 1. Data Layer (Cloudflare D1 Schema)

Use NanoID (21-character URL-safe strings) for all primary keys. Do not use UUID.

```sql
CREATE TABLE polls (
    id TEXT PRIMARY KEY,               -- NanoID
    title TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE poll_options (
    id TEXT PRIMARY KEY,               -- NanoID
    poll_id TEXT NOT NULL,
    start_time TEXT NOT NULL,          -- UTC ISO 8601
    end_time TEXT NOT NULL,            -- UTC ISO 8601
    FOREIGN KEY(poll_id) REFERENCES polls(id) ON DELETE CASCADE
);

CREATE TABLE responses (
    id TEXT PRIMARY KEY,               -- NanoID
    poll_id TEXT NOT NULL,
    voter_name TEXT NOT NULL,
    edit_token TEXT NOT NULL UNIQUE,   -- NanoID; issued at submission, enables edits without auth
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(poll_id) REFERENCES polls(id) ON DELETE CASCADE
);

CREATE TABLE votes (
    response_id TEXT NOT NULL,
    option_id TEXT NOT NULL,
    status INTEGER NOT NULL CHECK(status IN (0, 1)),  -- 1 = Yes, 0 = No
    PRIMARY KEY (response_id, option_id),
    FOREIGN KEY(response_id) REFERENCES responses(id) ON DELETE CASCADE,
    FOREIGN KEY(option_id) REFERENCES poll_options(id) ON DELETE CASCADE
);
```

---

## 2. Edge API (Cloudflare Worker via Hono)

Use **Hono** as the router. Do not use raw fetch event listeners or manual `if (pathname ===)` branching.

### CORS

All routes must include the following response headers to allow Cloudflare Pages (on a different subdomain) to call the Worker:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

Handle `OPTIONS` preflight requests on all routes with a `204` response.

### POST `/api/polls`

**Request body:**
```json
{
  "title": "String (required)",
  "description": "String (optional)",
  "options": [
    { "start_time": "ISO 8601 UTC", "end_time": "ISO 8601 UTC" }
  ]
}
```

**Validation:** Reject with `400` if `title` is missing or empty, if `options` is missing or empty, or if any `start_time`/`end_time` value fails `Date.parse()`.

**Action:** Atomic transactional insert into `polls` and `poll_options`.

**Response `201`:**
```json
{ "id": "<poll NanoID>" }
```

---

### GET `/api/polls/:id`

**Action:** Single query joining `polls`, `poll_options`, `responses`, and `votes`. Return a structured aggregate — do not make N+1 queries.

**Response `200`:**
```json
{
  "id": "string",
  "title": "string",
  "description": "string",
  "options": [
    { "id": "string", "start_time": "ISO 8601 UTC", "end_time": "ISO 8601 UTC" }
  ],
  "responses": [
    {
      "id": "string",
      "voter_name": "string",
      "votes": [
        { "option_id": "string", "status": 1 }
      ]
    }
  ]
}
```

Return `404` if poll ID does not exist.

---

### POST `/api/polls/:id/vote`

**Request body:**
```json
{
  "voter_name": "String (required)",
  "votes": [
    { "option_id": "string", "status": 0 }
  ]
}
```

**Validation:** Reject with `400` if `voter_name` is missing/empty, if `votes` is missing/empty, or if any `option_id` does not belong to the given poll. Reject with `404` if poll does not exist.

**Action:** Atomic insert. Generate a NanoID for `response.id` and a separate NanoID for `response.edit_token`. Insert the `responses` row, then insert all `votes` rows in a single transaction.

**Response `201`:**
```json
{
  "response_id": "string",
  "edit_token": "string"
}
```

The client must surface the `edit_token` to the user immediately (e.g., "Save this link to edit your response later: `/poll/:pollId?edit=<edit_token>`"). This is the only time the edit token is transmitted.

---

### GET `/api/polls/:pollId/response/:editToken`

**Action:** Look up the `responses` row matching both `poll_id` and `edit_token`. Return the existing vote selections so the frontend can pre-populate the grid.

**Response `200`:**
```json
{
  "response_id": "string",
  "voter_name": "string",
  "votes": [
    { "option_id": "string", "status": 1 }
  ]
}
```

Return `404` if the token does not match.

---

### PUT `/api/polls/:pollId/response/:editToken`

**Request body:** Same shape as `POST /api/polls/:id/vote` (voter_name + votes array).

**Action:** Atomic update. Verify the edit token matches a response on this poll. Delete existing votes for this `response_id`, re-insert the new set, and optionally update `voter_name`. All in a single transaction.

**Response `200`:**
```json
{ "response_id": "string" }
```

Return `404` if the token does not match.

---

## 3. Frontend Architecture (Vanilla JS, No Build Step)

Three files. No others.

### `index.html`

- Contains empty semantic containers only: `<main id="app">`.
- Loads Pico.css from CDN.
- Loads `app.js` as `type="module"`.
- Does not contain any inline logic.

### `api.js`

Pure async functions wrapping all fetch calls. No DOM interaction. Responsible for the local→UTC conversion contract: any value sourced from a `datetime-local` input must be passed through `new Date(localString).toISOString()` before inclusion in a request body.

```js
export async function createPoll(data) {}       // POST /api/polls
export async function fetchPoll(id) {}          // GET /api/polls/:id
export async function submitVote(pollId, data) {} // POST /api/polls/:id/vote
export async function fetchResponse(pollId, editToken) {} // GET /api/polls/:pollId/response/:editToken
export async function updateResponse(pollId, editToken, data) {} // PUT /api/polls/:pollId/response/:editToken
```

### `app.js`

The controller. Manages two views and routing between them. Uses **Event Delegation** throughout — attach one listener to `#app`, catch bubbled events by inspecting `event.target.dataset`. Do not attach individual listeners to grid cells or option rows.

**Routing logic (runs on load):**

```
if URL has ?edit=<token>  → load Edit View (pre-populate grid from GET response endpoint)
else if URL has ?id=<id>  → load Poll View (render grid from GET poll endpoint)
else                      → load Create View
```

**View A — Create Poll:**

- Fields: Title (required), Description (optional).
- Dynamic list of datetime range pickers. Each row has a `datetime-local` start and end input, plus an "Add another" button and a remove button per row.
- On submit: validate, convert all times to UTC via `api.js`, call `createPoll()`. On success, push `?id=<returned_id>` to `window.history` and swap to Poll View.

**View B — Poll / Matrix Grid:**

- Fetch poll data on load. Display title and description.
- Grid: X-axis = `poll_options` (rendered in local browser time via `Intl`). Y-axis = `responses` (voter names). Intersect = vote status (visually distinct Yes/No states).
- Bottom row: empty input row with a "Your Name" text field and toggleable Yes/No cells per option.
- On submit: call `submitVote()`. On success, display the `edit_token` prominently with copy-to-clipboard and a generated edit URL. Re-render the full grid.

**View C — Edit Response:**

- Activated when `?edit=<token>` is present in the URL (requires `?id=<pollId>` also present, or embed poll ID in the edit URL as `?id=<pollId>&edit=<token>`).
- Fetch existing response via `fetchResponse()`, pre-populate the grid row with voter name and prior votes.
- On submit: call `updateResponse()`. On success, re-render and confirm update.

---

## 4. Agentic Execution Phases

### Phase 1 — Foundation & Data

- Initialize Cloudflare D1 database.
- Execute schema creation SQL exactly as specified above.
- Write seed data to verify: one poll, three options, two responses with votes, covering both status values.
- Verify foreign key cascade: delete a poll and confirm all child rows are removed.

### Phase 2 — Edge API

- Scaffold Cloudflare Worker with **Hono**.
- Implement CORS headers and OPTIONS preflight handler globally.
- Implement `POST /api/polls` with UTC validation.
- Implement `GET /api/polls/:id` with a single aggregate JOIN query (no N+1).
- Implement `POST /api/polls/:id/vote` returning `edit_token`.
- Implement `GET /api/polls/:pollId/response/:editToken`.
- Implement `PUT /api/polls/:pollId/response/:editToken`.
- Test all endpoints with `curl` against the D1 seed data.

### Phase 3 — Frontend: Create View

- Build `index.html` with semantic containers and CDN links only.
- Build `api.js` with all five exported functions, including local→UTC conversion.
- Build `app.js` routing logic.
- Implement View A (Create Poll) with dynamic option rows and form validation.
- Wire to `createPoll()`. On success, push `?id=` to history and swap view.

### Phase 4 — Frontend: Poll Grid & Edit Flow

- Implement View B (Poll Grid) with Event Delegation.
- Render options in local browser time via `Intl.DateTimeFormat`.
- Implement the submission row and wire to `submitVote()`.
- On vote success: display edit URL prominently with copy-to-clipboard.
- Implement View C (Edit Response): detect `?edit=` on load, pre-populate, wire to `updateResponse()`.
- Re-render grid on all successful mutations.
