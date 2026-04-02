-- seed.sql: Mock data for timeslot.ink

-- 1. Create a Poll (p_ prefix)
INSERT INTO polls (id, title, description) 
VALUES ('p_launch_party', 'Launch Party 2026', 'Scheduling the big reveal!');

-- 2. Create Poll Options (o_ prefix for consistency)
INSERT INTO poll_options (id, poll_id, start_time, end_time)
VALUES 
('o_fri_eve', 'p_launch_party', '2026-05-01T18:00:00Z', '2026-05-01T21:00:00Z'),
('o_sat_mat', 'p_launch_party', '2026-05-02T13:00:00Z', '2026-05-02T16:00:00Z'),
('o_sat_eve', 'p_launch_party', '2026-05-02T19:00:00Z', '2026-05-02T22:00:00Z');

-- 3. Create Responses (r_ prefix for response, e_ for tokens)
-- Voter 1: Alice (Yes to all)
INSERT INTO responses (id, poll_id, voter_name, edit_token)
VALUES ('r_alice', 'p_launch_party', 'Alice', 'e_alice_token');

INSERT INTO votes (response_id, option_id, status)
VALUES 
('r_alice', 'o_fri_eve', 2),
('r_alice', 'o_sat_mat', 2),
('r_alice', 'o_sat_eve', 2);

-- Voter 2: Bob (Maybe Fri, No Sat Mat, Yes Sat Eve)
INSERT INTO responses (id, poll_id, voter_name, edit_token)
VALUES ('r_bob', 'p_launch_party', 'Bob', 'e_bob_token');

INSERT INTO votes (response_id, option_id, status)
VALUES 
('r_bob', 'o_fri_eve', 1),
('r_bob', 'o_sat_mat', 0),
('r_bob', 'o_sat_eve', 2);

-- Voter 3: Charlie (No Fri, Yes Sat Mat, No Sat Eve)
INSERT INTO responses (id, poll_id, voter_name, edit_token)
VALUES ('r_charlie', 'p_launch_party', 'Charlie', 'e_charlie_token');

INSERT INTO votes (response_id, option_id, status)
VALUES 
('r_charlie', 'o_fri_eve', 0),
('r_charlie', 'o_sat_mat', 2),
('r_charlie', 'o_sat_eve', 0);
