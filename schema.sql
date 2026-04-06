-- schema.sql: timeslot.ink Data Layer

-- Polls Table: The root of the hierarchy.
CREATE TABLE polls (
    id TEXT PRIMARY KEY,               -- Prefixed p_[nanoid]
    title TEXT NOT NULL,
    description TEXT,
    duration TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Poll Options: Specific datetime slots for the poll.
CREATE TABLE poll_options (
    id TEXT PRIMARY KEY,               -- Prefixed p_o_[nanoid] or similar (using NanoID)
    poll_id TEXT NOT NULL,
    start_time TEXT NOT NULL,          -- UTC ISO 8601
    end_time TEXT,                     -- UTC ISO 8601
    FOREIGN KEY(poll_id) REFERENCES polls(id) ON DELETE CASCADE
);

-- Responses Table: Individual participant entries.
CREATE TABLE responses (
    id TEXT PRIMARY KEY,               -- Prefixed r_[nanoid]
    poll_id TEXT NOT NULL,
    voter_name TEXT NOT NULL,
    edit_token TEXT NOT NULL UNIQUE,   -- Prefixed e_[nanoid]
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(poll_id) REFERENCES polls(id) ON DELETE CASCADE
);

-- Votes Table: Mapping of responses to options with a 3-state score.
CREATE TABLE votes (
    response_id TEXT NOT NULL,
    option_id TEXT NOT NULL,
    status INTEGER NOT NULL CHECK(status IN (0, 1, 2)), -- 0=No, 1=Maybe, 2=Yes
    PRIMARY KEY (response_id, option_id),
    FOREIGN KEY(response_id) REFERENCES responses(id) ON DELETE CASCADE,
    FOREIGN KEY(option_id) REFERENCES poll_options(id) ON DELETE CASCADE
);
