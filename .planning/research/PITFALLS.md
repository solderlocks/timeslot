# Pitfalls Research

**Domain:** Edge Scheduling
**Researched:** 2026-04-01

## Known Pitfalls

### UTC vs Local Time
- **Pitfall:** `datetime-local` input string varies by browser. `new Date(string).toISOString()` is generally safe but needs careful validation.
- **Prevention:** Always normalize on the frontend in `api.js` before `fetch`. Backend MUST reject anything not ISO 8601 UTC.

### D1 Transaction Limitations
- **Pitfall:** Lack of `BEGIN/COMMIT` blocks.
- **Prevention:** Use `db.batch()` for multi-table inserts (e.g., Poll + Options). This ensures atomicity for the batch.

### NanoID Collisions
- **Pitfall:** Extremely low probability but possible if ID length is too short.
- **Prevention:** Use 21 characters (as specified in `REQUIREMENTS.md`). 21 chars at 20 IDs/sec gives a collision chance of 1% in 149 million years.

### CORS & Preflight
- **Pitfall:** Cloudflare Pages on `example.com` calling Worker on `api.example.com` will trigger preflight.
- **Prevention:** explicitly handle `OPTIONS /api/*` in Hono and ensure `Access-Control-Allow-Origin: *` (or specific origin) is set.

### Mobile Grid Layout
- **Pitfall:** Matrix grids (users x slots) are notoriously difficult on mobile.
- **Prevention:** Use CSS `sticky` for names (left) and dates (top). Keep the cells small and use visual "Yes/No" icons rather than text.

---
*Pitfalls research for: timeslot.ink*
