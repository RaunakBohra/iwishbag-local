#!/bin/bash

echo "🏥 MCP Health Check"
echo "==================="

# Check Redis
echo -n "Redis: "
if redis-cli ping 2>/dev/null | grep -q PONG; then
    echo "✅ Running"
else
    echo "❌ Not responding"
fi

# Check PostgreSQL (Supabase)
echo -n "PostgreSQL: "
if psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "SELECT 1" >/dev/null 2>&1; then
    echo "✅ Running"
else
    echo "❌ Not responding"
fi

# Check Supabase
echo -n "Supabase: "
if curl -s http://127.0.0.1:54321/rest/v1/ >/dev/null 2>&1; then
    echo "✅ Running"
else
    echo "❌ Not responding"
fi

# Check environment variables
echo -e "\nEnvironment Variables:"
[ ! -z "$GITHUB_TOKEN" ] && echo "✅ GITHUB_TOKEN set" || echo "❌ GITHUB_TOKEN not set"
[ ! -z "$STRIPE_SECRET_KEY" ] && echo "✅ STRIPE_SECRET_KEY set" || echo "❌ STRIPE_SECRET_KEY not set"
[ ! -z "$SUPABASE_SERVICE_ROLE_KEY" ] && echo "✅ SUPABASE_SERVICE_ROLE_KEY set" || echo "❌ SUPABASE_SERVICE_ROLE_KEY not set"
[ ! -z "$CLOUDFLARE_ACCOUNT_ID" ] && echo "⚠️  CLOUDFLARE_ACCOUNT_ID set" || echo "⚠️  CLOUDFLARE_ACCOUNT_ID not set (optional)"
[ ! -z "$BRAVE_API_KEY" ] && echo "⚠️  BRAVE_API_KEY set" || echo "⚠️  BRAVE_API_KEY not set (optional)"

echo -e "\nMCP Configuration:"
if [ -f .claude/mcp.json ]; then
    echo "✅ mcp.json exists"
    echo "Configured servers: $(cat .claude/mcp.json | grep -o '"[^"]*": {' | wc -l | xargs)"
else
    echo "❌ mcp.json not found"
fi
