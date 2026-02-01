#!/bin/bash

# Test Permissions API Endpoints
# Requires: User logged in with admin role

BASE_URL="http://localhost:3001"
TOKEN="$1"  # Pass JWT token as first argument
USER_ID="$2"  # Pass user ID as second argument

if [ -z "$TOKEN" ]; then
  echo "Usage: ./test-permissions.sh <JWT_TOKEN> <USER_ID>"
  echo ""
  echo "Example:"
  echo "./test-permissions.sh eyJhbGciOiJIUzI1NiIs... 550e8400-e29b-41d4-a716"
  exit 1
fi

echo "=== Testing Permissions API ==="
echo ""

# 1. Get user permissions
echo "1. GET /admin/users/:id/permissions"
curl -s -X GET "$BASE_URL/admin/users/$USER_ID/permissions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq . || echo "Error: Could not fetch permissions"

echo ""
echo "---"
echo ""

# 2. Update user permissions
echo "2. PATCH /admin/users/:id/permissions (disable budgets)"
curl -s -X PATCH "$BASE_URL/admin/users/$USER_ID/permissions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "budgets": false,
    "investments": true,
    "recurring": false
  }' | jq . || echo "Error: Could not update permissions"

echo ""
echo "---"
echo ""

# 3. Get all users with permissions
echo "3. GET /admin/permissions/all"
curl -s -X GET "$BASE_URL/admin/permissions/all" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq . || echo "Error: Could not fetch all permissions"

echo ""
echo "=== Tests Complete ==="
