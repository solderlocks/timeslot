# Stack Research

**Domain:** Group Scheduling (Stateless/Serverless)
**Researched:** 2026-04-01
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Hono** | ^4.0.0 | Edge API Router | Fast, lightweight, and specifically optimized for Cloudflare Workers. |
| **Cloudflare D1** | Beta/v1 | SQL Database | Serverless SQLite storage at the edge. Perfect for low-latency state. |
| **Vanilla JS** | ES2024+ | Frontend Logic | Zero build steps, maximum longevity, and standard compatibility. |
| **Pico.css** | ^2.0.0 | Styling Foundation | Classless, lightweight, and easy to customize via CSS variables. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **NanoID** | ^5.0.0 | ID Generation | 21-char URL-safe unique IDs for polls and edit tokens. |
| **Zod** | ^3.22.0 | Schema Validation | Use at the Edge to validate POST bodies before D1 hits. |
| **Temporal / Luxon** | Latest | Timezone Handling | Handling "UTC only" contract while rendering local user time accurately. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| **Wrangler** | Local Dev & Deployment | Essential for D1 migrations and Workers testing. |
| **Brave Search** | Real-time verification | Used to verify latest Hono/D1 API changes. |

## Installation

Since the constraint is "Zero build steps" for the frontend, we don't `npm install` for the client. The Worker however uses:

```bash
# Worker Dependencies
npm install hono zod nanoid
npm install -D wrangler
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| **Hono** | Itty Router | If Hono's 14kb footprint is somehow too large (rare). |
| **D1** | KV | If data is strictly key-value and needs 10ms read times globally. |
| **Pico.css** | Tailwind | Only if complex, highly custom interactive UI is required. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Manual `fetch` routing | Fragile and hard to maintain as API grows. | Hono |
| LocalStorage for state | Inconsistent across devices for group polls. | Cloudflare D1 |
| Redux / React | Massive overhead for a 3-view scheduling app. | Vanilla JS + Event Delegation |

## Sources

- [Hono Docs](https://hono.dev) — Performance benchmarks and Cloudflare D1 integration.
- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/) — Batching and transaction limitations.
- [Pico.css v2 Docs](https://picocss.com) — Variable mapping and SASS integration.

---
*Stack research for: timeslot.ink*
*Researched: 2026-04-01*
