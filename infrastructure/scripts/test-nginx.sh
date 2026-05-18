#!/usr/bin/env bash
# scripts/test-nginx.sh
# Tests the Nginx reverse proxy is correctly routing to the gateway.
# Run after pnpm dev is running in another terminal.
#
# Usage:
#   bash scripts/test-nginx.sh [host] [port]
#   bash scripts/test-nginx.sh localhost 80   # default

set -euo pipefail

HOST="${1:-localhost}"
PORT="${2:-80}"
BASE="http://${HOST}:${PORT}"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "${GREEN}✓${NC} $*"; }
fail() { echo -e "${RED}✗${NC} $*"; FAILED=$((FAILED + 1)); }
info() { echo -e "${YELLOW}→${NC} $*"; }

FAILED=0

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Nginx Reverse Proxy Test"
echo "  Target: ${BASE}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── Helper ────────────────────────────────────────────────────────────────
check() {
  local desc="$1"
  local url="$2"
  local expected_status="$3"
  local extra_args="${4:-}"

  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" $extra_args "${BASE}${url}" 2>/dev/null || echo "000")

  if [ "$status" = "$expected_status" ]; then
    pass "$desc → HTTP $status"
  else
    fail "$desc → expected $expected_status, got $status"
  fi
}

check_header() {
  local desc="$1"
  local url="$2"
  local header="$3"

  local value
  value=$(curl -si "${BASE}${url}" 2>/dev/null | grep -i "^${header}:" | head -1 | tr -d '\r')

  if [ -n "$value" ]; then
    pass "$desc → $value"
  else
    fail "$desc → header '${header}' not found"
  fi
}

# ── Tests ─────────────────────────────────────────────────────────────────

info "1. Nginx health check"
check "Nginx /nginx-health" "/nginx-health" "200"

info "2. Gateway health proxied through Nginx"
check "GET /health" "/health" "200"
check "GET /health/ready" "/health/ready" "200 or 503" "-w %{http_code}"

info "3. API routing"
check "GET /api/v1/users (no token → 401)" "/api/v1/users" "401"
check "POST /api/v1/auth/login (empty body → 422)" "/api/v1/auth/login" \
  "422" "-X POST -H 'Content-Type: application/json' -d '{}'"

info "4. Version rejection"
check "GET /api/v99/users (bad version → 400)" "/api/v99/users" "400"

info "5. Response headers"
check_header "X-Content-Type-Options header" "/health" "x-content-type-options"
check_header "X-Frame-Options header" "/health" "x-frame-options"
check_header "X-API-Version on API routes" "/api/v1/users" "x-api-version"
check_header "X-Request-ID propagated" "/health" "x-request-id"

info "6. Compression"
ENCODING=$(curl -si -H "Accept-Encoding: gzip" "${BASE}/health" 2>/dev/null \
  | grep -i "content-encoding" | head -1 | tr -d '\r')
if echo "$ENCODING" | grep -q "gzip"; then
  pass "Gzip compression active → $ENCODING"
else
  info "Gzip not active for this response (small responses may not compress)"
fi

# ── Summary ───────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$FAILED" -eq 0 ]; then
  echo -e "${GREEN}✅ All tests passed!${NC}"
else
  echo -e "${RED}❌ $FAILED test(s) failed${NC}"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

exit $FAILED