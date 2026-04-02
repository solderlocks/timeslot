#!/bin/bash
# test_api.sh: Verify timeslot.ink API lifecycle

API_URL="http://localhost:8788/api"

echo "--- 1. Create Poll ---"
CREATE_RES=$(curl -s -X POST $API_URL/polls \
  -H "Content-Type: application/json" \
  -d '{
    "title": "API Test Party",
    "description": "Testing the backend",
    "options": [
      {"start_time": "2026-06-01T10:00:00Z", "end_time": "2026-06-01T12:00:00Z"},
      {"start_time": "2026-06-01T14:00:00Z", "end_time": "2026-06-01T16:00:00Z"}
    ]
  }')
echo $CREATE_RES
POLL_ID=$(echo $CREATE_RES | jq -r .id)
echo "Poll ID: $POLL_ID"

if [ "$POLL_ID" == "null" ]; then echo "Failed to create poll"; exit 1; fi

echo -e "\n--- 2. Get Poll (Initial) ---"
curl -s $API_URL/polls/$POLL_ID | jq .

# Get the first option ID for voting
POLL_DATA=$(curl -s $API_URL/polls/$POLL_ID)
OPT_ID=$(echo $POLL_DATA | jq -r '.options[0].id')
OPT_ID2=$(echo $POLL_DATA | jq -r '.options[1].id')

echo -e "\n--- 3. Vote (Alice - Yes to both) ---"
VOTE1_RES=$(curl -s -X POST $API_URL/polls/$POLL_ID/vote \
  -H "Content-Type: application/json" \
  -d "{
    \"voter_name\": \"Alice\",
    \"votes\": [
      {\"option_id\": \"$OPT_ID\", \"status\": 2},
      {\"option_id\": \"$OPT_ID2\", \"status\": 2}
    ]
  }")
echo $VOTE1_RES
TOKEN1=$(echo $VOTE1_RES | jq -r .edit_token)

echo -e "\n--- 4. Vote (Bob - Maybe to first) ---"
curl -s -X POST $API_URL/polls/$POLL_ID/vote \
  -H "Content-Type: application/json" \
  -d "{
    \"voter_name\": \"Bob\",
    \"votes\": [
      {\"option_id\": \"$OPT_ID\", \"status\": 1}
    ]
  }" | jq .

echo -e "\n--- 5. Get Poll (Aggregated) ---"
curl -s $API_URL/polls/$POLL_ID | jq .

echo -e "\n--- 6. Update Vote (Alice - Change to No) ---"
curl -s -X PUT $API_URL/polls/$POLL_ID/response/$TOKEN1 \
  -H "Content-Type: application/json" \
  -d "{
    \"voter_name\": \"Alice (Updated)\",
    \"votes\": [
      {\"option_id\": \"$OPT_ID\", \"status\": 0}
    ]
  }" | jq .

echo -e "\n--- 7. Final GET Poll (Consensus Check) ---"
curl -s $API_URL/polls/$POLL_ID | jq .
