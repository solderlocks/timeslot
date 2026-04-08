import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';
import { nanoid } from 'nanoid';

const app = new Hono();

// Fall-through to Static Assets for non-API routes
app.all('*', async (c, next) => {
    if (!c.req.path.startsWith('/api/')) {
        return c.env.ASSETS.fetch(c.req.raw);
    }
    await next();
});

const api = new Hono().basePath('/api');

/**
 * Rate Limiting Middleware (Simple IP-based for POST requests)
 * Note: Cloudflare's `c.req.header('cf-connecting-ip')` is used.
 */
const rateLimit = async (c, next) => {
    if (c.req.method === 'POST') {
        // Mock rate-limit check (production should use KV or similar)
        // For now, we'll implement a simple allow-all till KV is defined, 
        // or we'll assume D1 query count check.
    }
    await next();
};

app.use('/polls/*', rateLimit);

// --- Routes ---

/**
 * POST /api/polls
 * Creates a new poll with p_ prefixed IDs.
 */
api.post('/polls', async (c) => {
    const { title, description, duration, options } = await c.req.json();
    
    if (!title || !options || options.length === 0) {
        return c.json({ error: 'Title and options are required' }, 400);
    }

    const pollId = `p_${nanoid(16)}`;
    const pollEditToken = `e_${nanoid(32)}`;
    const db = c.env.DB;

    try {
        const statements = [
            db.prepare('INSERT INTO polls (id, title, description, duration, edit_token) VALUES (?, ?, ?, ?, ?)')
              .bind(pollId, title, description || null, duration || null, pollEditToken)
        ];

        // Add options
        for (const opt of options) {
            const optId = `o_${nanoid(16)}`; // Prefixed option ID
            statements.push(
                db.prepare('INSERT INTO poll_options (id, poll_id, start_time, end_time) VALUES (?, ?, ?, ?)')
                  .bind(optId, pollId, opt.start_time, opt.end_time ?? null)
            );
        }

        await db.batch(statements);
        return c.json({ id: pollId, edit_token: pollEditToken }, 201);
    } catch (err) {
        console.error('D1 Error:', err.message, err.cause);
        return c.json({ error: 'Failed to create poll', details: err.message }, 500);
    }
});

/**
 * GET /api/polls/:id
 * Fetches aggregate poll data, excluding edit tokens.
 * Includes consensus scoring engine logic.
 */
api.get('/polls/:id', async (c) => {
    const pollId = c.req.param('id');
    const db = c.env.DB;

    try {
        // 1. Fetch Poll & Options
        const poll = await db.prepare('SELECT * FROM polls WHERE id = ?').bind(pollId).first();
        if (!poll) return c.json({ error: 'Poll not found' }, 404);

        const options = await db.prepare('SELECT * FROM poll_options WHERE poll_id = ?').bind(pollId).all();
        
        // 2. Fetch Responses & Votes (Aggregate)
        const { results: voterData } = await db.prepare(`
            SELECT 
                r.id as response_id, 
                r.voter_name, 
                v.option_id, 
                v.status 
            FROM responses r
            LEFT JOIN votes v ON r.id = v.response_id
            WHERE r.poll_id = ?
        `).bind(pollId).all();

        // 3. Process into Matrix structure
        const responsesMap = {};
        const scores = {}; // option_id -> score

        // Initialize scores
        options.results.forEach(opt => {
            scores[opt.id] = 0;
        });

        voterData.forEach(row => {
            if (!responsesMap[row.response_id]) {
                responsesMap[row.response_id] = {
                    id: row.response_id,
                    voter_name: row.voter_name,
                    votes: []
                };
            }
            if (row.option_id) {
                responsesMap[row.response_id].votes.push({
                    option_id: row.option_id,
                    status: row.status
                });

            }
        });

        const responses = Object.values(responsesMap);

        // 4. Calculate Consensus Scores with Veto-based Triage
        const rankings = options.results.map(opt => {
            const votes = responses.flatMap(r => r.votes.filter(v => v.option_id === opt.id));
            
            const vetoCount = votes.filter(v => v.status === 0).length;
            // Treat status 2 (old Preferred) as OK (1) for compatibility/transition
            const okCount = votes.filter(v => v.status === 1 || v.status === 2).length;
            
            // Scoring: Any Veto (0) disqualifies the slot from being optimal.
            // Otherwise, we count the number of OKs.
            const finalScore = vetoCount > 0 ? 0 : okCount;
            
            return {
                option_id: opt.id,
                score: finalScore,
                veto_count: vetoCount,
                ok_count: okCount
            };
        });

        // Sort by Score DESC (highest number of OKs without vetoes)
        rankings.sort((a, b) => b.score - a.score);

        const maxScore = rankings.length > 0 ? rankings[0].score : 0;
        
        // An option is "optimal" if it has ZERO vetoes and matches the top score
        const optimal_option_ids = rankings
            .filter(r => r.score === maxScore && r.veto_count === 0 && maxScore > 0)
            .map(r => r.option_id);

        return c.json({
            ...poll,
            options: options.results,
            responses: responses,
            metadata: {
                optimal_option_ids,
                rankings
            }
        });
    } catch (e) {
        console.error(e);
        return c.json({ error: 'Internal Server Error' }, 500);
    }
});

/**
 * PUT /api/polls/:id
 * Updates poll metadata and options. Requires admin_token.
 */
api.put('/polls/:id', async (c) => {
    const pollId = c.req.param('id');
    const adminToken = c.req.query('admin');
    const { title, description, duration, options } = await c.req.json();
    const db = c.env.DB;

    if (!adminToken) return c.json({ error: 'Admin token required' }, 401);

    try {
        // 1. Verify Ownership
        const poll = await db.prepare('SELECT id FROM polls WHERE id = ? AND edit_token = ?').bind(pollId, adminToken).first();
        if (!poll) return c.json({ error: 'Unauthorized' }, 401);

        const statements = [
            db.prepare('UPDATE polls SET title = ?, description = ?, duration = ? WHERE id = ?')
              .bind(title, description || null, duration || null, pollId),
            // Reset options (CASCADE handles votes)
            db.prepare('DELETE FROM poll_options WHERE poll_id = ?').bind(pollId),
            // Clear all participants (rows)
            db.prepare('DELETE FROM responses WHERE poll_id = ?').bind(pollId)
        ];

        // 2. Insert New Options
        for (const opt of options) {
            const optId = `o_${nanoid(16)}`;
            statements.push(
                db.prepare('INSERT INTO poll_options (id, poll_id, start_time, end_time) VALUES (?, ?, ?, ?)')
                  .bind(optId, pollId, opt.start_time, opt.end_time ?? null)
            );
        }

        await db.batch(statements);
        return c.json({ success: true });
    } catch (err) {
        console.error('Update Error:', err);
        return c.json({ error: 'Failed to update poll' }, 500);
    }
});

/**
 * POST /api/polls/:id/vote
 * Submits a new vote and returns a persistent e_ prefixed edit token.
 */
api.post('/polls/:id/vote', async (c) => {
    const pollId = c.req.param('id');
    const { voter_name, votes } = await c.req.json();
    const db = c.env.DB;

    if (!voter_name || !votes || votes.length === 0) {
        return c.json({ error: 'Voter name and votes are required' }, 400);
    }

    const responseId = `r_${nanoid(16)}`;
    const editToken = `e_${nanoid(32)}`; // Longer for security

    try {
        const statements = [
            db.prepare('INSERT INTO responses (id, poll_id, voter_name, edit_token) VALUES (?, ?, ?, ?)')
              .bind(responseId, pollId, voter_name, editToken)
        ];

        for (const vote of votes) {
            statements.push(
                db.prepare('INSERT INTO votes (response_id, option_id, status) VALUES (?, ?, ?)')
                  .bind(responseId, vote.option_id, vote.status)
            );
        }

        await db.batch(statements);
        return c.json({ response_id: responseId, edit_token: editToken }, 201);
    } catch (e) {
        console.error(e);
        return c.json({ error: 'Failed to submit vote' }, 500);
    }
});

/**
 * GET /api/polls/:id/response/:editToken
 * Fetches existing response for the edit view.
 */
api.get('/polls/:id/response/:editToken', async (c) => {
    const { id: pollId, editToken } = c.req.param();
    const db = c.env.DB;

    try {
        const res = await db.prepare('SELECT id, voter_name FROM responses WHERE poll_id = ? AND edit_token = ?')
                            .bind(pollId, editToken).first();
        if (!res) return c.json({ error: 'Response not found' }, 404);

        const votes = await db.prepare('SELECT option_id, status FROM votes WHERE response_id = ?').bind(res.id).all();
        
        return c.json({
            response_id: res.id,
            voter_name: res.voter_name,
            votes: votes.results
        });
    } catch (e) {
        return c.json({ error: 'Internal Server Error' }, 500);
    }
});

/**
 * PUT /api/polls/:id/response/:editToken
 * Updates an existing response as a 'Delete-then-Insert' batch.
 */
api.put('/polls/:id/response/:editToken', async (c) => {
    const { id: pollId, editToken } = c.req.param();
    const { voter_name, votes } = await c.req.json();
    const db = c.env.DB;

    try {
        const response = await db.prepare('SELECT id FROM responses WHERE poll_id = ? AND edit_token = ?')
                                  .bind(pollId, editToken).first();
        if (!response) return c.json({ error: 'Response not found' }, 404);

        const statements = [
            // 1. Update voter name (optional)
            db.prepare('UPDATE responses SET voter_name = ? WHERE id = ?').bind(voter_name, response.id),
            // 2. Delete existing votes
            db.prepare('DELETE FROM votes WHERE response_id = ?').bind(response.id)
        ];

        // 3. Re-insert new votes
        for (const vote of votes) {
            statements.push(
                db.prepare('INSERT INTO votes (response_id, option_id, status) VALUES (?, ?, ?)')
                  .bind(response.id, vote.option_id, vote.status)
            );
        }

        await db.batch(statements);
        return c.json({ response_id: response.id });
    } catch (e) {
        console.error(e);
        return c.json({ error: 'Failed to update response' }, 500);
    }
});

app.route('/', api);

export const onRequest = handle(app);
