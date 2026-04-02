# timeslot.ink | Stateless Group Scheduling

**timeslot.ink** is a stateless, serverless, and accountless group scheduling utility designed as a lightweight, open-source alternative to Doodle's core functionality.

## Core Philosophy

1.  **No Accounts, Ever**: Identity is managed via unguessable URL tokens (NanoID). No logins, no tracking, no passwords.
2.  **Privacy First**: Security is achieved through obscure tokens, not authentication.
3.  **UTC Truth**: All times are stored in UTC ISO 8601 string format. Rendering to local time is handled entirely by the browser's `Intl` API.
4.  **Zero Build Steps (Frontend)**: The frontend uses vanilla ES6 modules, HTML5, and Pico.css via CDN. No Webpack, Vite, or transpilation required.
5.  **Cloudflare Native**: Built to run on Cloudflare Pages (Frontend), Cloudflare Workers via Hono (Edge API), and Cloudflare D1 (SQL storage).

---

## Technical Stack

-   **Frontend**: Vanilla JavaScript (ES6 Modules), HTML5, CSS3, [Pico.css](https://picocss.com/)
-   **Backend**: [Hono](https://hono.dev/) on Cloudflare Pages Functions
-   **Database**: [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite-compatible)
-   **ID Generation**: NanoID

---

## Getting Started

### Prerequisites

-   [Node.js](https://nodejs.org/) (Version 18+)
-   [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) (`npm install -g wrangler`)

### 1. Installation

Clone the repository and install the development dependencies:

```bash
git clone https://github.com/solderlocks/timeslot.git
cd timeslot
npm install
```

### 2. Database Initialization (Local)

Timeslot uses Cloudflare D1. You must initialize the local database schema before running for the first time:

```bash
# Create the local schema
npx wrangler d1 execute DB --local --file=schema.sql

# (Optional) Seed the database with test data
npx wrangler d1 execute DB --local --file=seed.sql
```

### 3. Running Locally

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:8788`. This command runs Wrangler in "Pages Dev" mode, simulating both the static frontend and the D1-backed API functions locally.

---

## Deployment

To deploy to your own Cloudflare Pages account:

1.  **Create a D1 Database**:
    ```bash
    npx wrangler d1 create timeslot_db
    ```
2.  **Update `wrangler.toml`**: Replace the `database_id` with the one returned from the previous command.
3.  **Initialize Remote Schema**:
    ```bash
    npx wrangler d1 execute timeslot_db --remote --file=schema.sql
    ```
4.  **Deploy**:
    ```bash
    npx wrangler pages deploy .
    ```

---

## Project Structure

-   `/index.html`: The single entry point for the frontend.
-   `/app.js`: Frontend controller managing state and views via event delegation.
-   `/app.css`: Custom design system and overrides for Pico.css.
-   `/api.js`: Pure JS wrapper for API calls and date/time normalization.
-   `/functions/[[path]].js`: Cloudflare Pages Functions entry point using Hono.
-   `/schema.sql`: The single source of truth for the D1 database structure.
-   `/seed.sql`: Sample data for testing and development.
-   `/wrangler.toml`: Cloudflare Pages configuration.

---

## License

MIT License - See [LICENSE](LICENSE) for details. (Note: Ensure a LICENSE file exists in the repository).
