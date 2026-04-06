# Stateless Group Scheduling 🐝

**[Try it live at timeslot.ink](https://timeslot.ink)**

**timeslot.ink** is a stateless, serverless, and accountless group scheduling utility designed as a lightweight, open-source alternative to Doodle's core functionality. 

## The Subtractive Method

Traditional group scheduling breaks down when treating availability as a spectrum of preferences, creating a messy negotiation. Timeslot operates on **subtractive triage**:
1. A marked conflict is a hard block.
2. An unmarked slot defaults to viable. 

By surveying only the impossibilities, the overlapping viable times naturally emerge in the empty space. No weighting, no negotiation, just data.

## Visuals

<img width="690" height="600" alt="timeslot-screenshot-C" src="https://github.com/user-attachments/assets/cf00306e-8d0e-4432-a957-5d06531c1aa5" /><br/>
*Schedule by elimination. No accounts required.*

<br/>
<br/>

<img width="665" height="600" alt="timeslot-screenshot-A" src="https://github.com/user-attachments/assets/05eee982-b4cd-446e-b179-ee824182d151" /><br/>
*Participants only interact with times that conflict with their schedule.*

<br/>
<br/>


<img width="633" height="600" alt="timeslot-screenshot-B" src="https://github.com/user-attachments/assets/ae119bc4-1d9f-4257-8f28-303935d9899c" /><br/>
*The optimal time reveals itself in the empty space.*

<br/>
<br/>

---

## Core Philosophy

-   **No Accounts, Ever**: Identity is managed via unguessable URL tokens (NanoID). No logins and no passwords.
-   **Privacy First**: Security is achieved through obscure tokens, not authentication. We use GoatCounter for cookieless, privacy-preserving basic analytics. Absolutely no invasive data harvesting.
-   **UTC Truth**: All times are stored in UTC ISO 8601 string format. Rendering to local time is handled entirely by the browser's `Intl` API.
-   **Zero Build Steps (Frontend)**: The frontend uses vanilla ES6 modules, HTML5, and Pico.css via CDN. No Webpack, Vite, or transpilation required.
-   **Cloudflare Native**: Built to run on Cloudflare Pages (Frontend), Cloudflare Workers via Hono (Edge API), and Cloudflare D1 (SQL storage).

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
git clone [https://github.com/solderlocks/timeslot.git](https://github.com/solderlocks/timeslot.git)
cd timeslot
npm install
```

### 2. Database Initialization (Local)

Timeslot uses Cloudflare D1. You must initialize the local database schema before running for the first time. We use a dedicated `.data` directory for persistence to ensure consistency:

```bash
# Create the local schema in the .data directory
npx wrangler d1 execute DB --local --persist-to=.data --file=schema.sql

# (Optional) Seed the database with test data
npx wrangler d1 execute DB --local --persist-to=.data --file=seed.sql
```

### 3. Running Locally

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:8888` (or `8788` if configured). This command runs Wrangler in "Pages Dev" mode, simulating both the static frontend and the D1-backed API functions locally using the `.data` directory for storage.

---

## Troubleshooting D1 Locally

If you see `D1_ERROR: no such table: polls`, it usually means Wrangler is looking at a different persistence directory than where you initialized the schema.

1.  **Check Persistence**: Ensure both your `wrangler d1 execute` and `wrangler pages dev` commands use the same `--persist-to=.data` flag.
2.  **Clear State**: If things are hopelessly desynchronized, run:
    ```bash
    rm -rf .data
    npm run dev
    # In a separate terminal while dev is running:
    npx wrangler d1 execute DB --local --persist-to=.data --file=schema.sql
    ```
3.  **Port Busy**: If you see `Address already in use`, kill the process on port 8888:
    ```bash
    lsof -i :8888
    kill -9 <PID>
    ```

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

## Author

Created and maintained by Scott Kuehnert. 
More projects at [jscottk.net](https://jscottk.net).

## License

GNU GPL v3.0 - See [LICENSE](LICENSE) for details.
