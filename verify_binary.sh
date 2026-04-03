#!/bin/bash
API_URL="http://localhost:8788/api"

echo "--- 1. Create Poll ---"
CREATE_RES=$(curl -s -X POST $API_URL/polls \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Binary Test Party",
    "description": "Testing the binary scoring",
    "options": [
      {"start_time": "2026-07-01T10:00:00Z"},
      {"start_time": "2026-07-01T14:00:00Z"}
    ]
  }')
POLL_ID=$(echo $CREATE_RES | jq -r .id)
echo "Poll ID: $POLL_ID"

POLL_DATA=$(curl -s $API_URL/polls/$POLL_ID)
OPT_ID1=$(echo $POLL_DATA | jq -r '.options[0].id')
OPT_ID2=$(echo $POLL_DATA | jq -r '.options[1].id')

echo -e "\n--- 2. Vote (User1 - OK to both) ---"
curl -s -X POST $API_URL/polls/$POLL_ID/vote \
  -H "Content-Type: application/json" \
  -d "{
    \"voter_name\": \"User1\",
    \"votes\": [
      {\"option_id\": \"$OPT_ID1\", \"status\": 1},
      {\"option_id\": \"$OPT_ID2\", \"status\": 1}
    ]
  }" | jq -r .response_id

echo -e "\n--- 3. Vote (User2 - Conflict to Slot 2) ---"
curl -s -X POST $API_URL/polls/$POLL_ID/vote \
  -H "Content-Type: application/json" \
  -d "{
    \"voter_name\": \"User2\",
    \"votes\": [
      {\"option_id\": \"$OPT_ID1\", \"status\": 1},
      {\"option_id\": \"$OPT_ID2\", \"status\": 0}
    ]
  }" | jq -r .response_id

echo -e "\n--- 4. Consenus Check ---"
FINAL_DATA=$(curl -s $API_URL/polls/$POLL_ID)
echo -e "\nScoring Results:"
echo $FINAL_DATA | jq '.metadata.rankings'
echo -e "\nOptimal Option IDs (Should only include OPT_ID1):"
echo $FINAL_DATA | jq '.metadata.optimal_option_ids'
