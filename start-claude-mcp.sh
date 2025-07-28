#!/bin/bash

# Claude Code MCP Launcher
# This script starts Claude Code with all MCP servers enabled

echo "🚀 Starting Claude Code with Enhanced MCP Servers..."

# Set working directory
cd "$(dirname "$0")"

# Load environment variables if .env.mcp exists
if [ -f .env.mcp ]; then
    echo "📋 Loading MCP environment variables..."
    export $(cat .env.mcp | grep -v '^#' | xargs)
fi

# Get Supabase service role key from local config if not set
if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "🔍 Looking for Supabase service role key..."
    SUPABASE_KEY=$(grep -A 1 "service_role_key" supabase/config.toml 2>/dev/null | tail -n 1 | cut -d '"' -f 2)
    if [ ! -z "$SUPABASE_KEY" ]; then
        export SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_KEY"
        echo "✅ Found Supabase service role key in config"
    fi
fi

# Check if Redis is running (for Redis MCP)
if ! pgrep -x "redis-server" > /dev/null; then
    echo "⚠️  Redis is not running. Starting Redis..."
    if command -v redis-server &> /dev/null; then
        redis-server --daemonize yes
        echo "✅ Redis started"
    else
        echo "❌ Redis not installed. Redis MCP will fail to connect."
    fi
fi

# Check if Supabase is running (for PostgreSQL and Supabase MCPs)
if ! supabase status 2>/dev/null | grep -q "RUNNING"; then
    echo "⚠️  Supabase is not running. Starting Supabase..."
    supabase start
    echo "✅ Supabase started"
fi

# Install required npm packages if not already installed
echo "📦 Checking MCP server packages..."
MCP_PACKAGES=(
    "@modelcontextprotocol/server-memory"
    "@modelcontextprotocol/server-sequential-thinking"
    "@modelcontextprotocol/server-postgres"
    "@modelcontextprotocol/server-github"
    "@modelcontextprotocol/server-filesystem"
    "@modelcontextprotocol/server-fetch"
    "@modelcontextprotocol/server-redis"
    "@modelcontextprotocol/server-stripe"
    "@modelcontextprotocol/server-supabase"
    "@cloudflare/mcp-server-cloudflare"
)

for package in "${MCP_PACKAGES[@]}"; do
    if ! npm list -g "$package" &>/dev/null; then
        echo "📥 Installing $package..."
        npm install -g "$package" || echo "⚠️  Failed to install $package"
    fi
done

# Start Claude Code with MCP configuration
echo "🎯 Launching Claude Code..."
echo "📍 Project: $(pwd)"
echo "🧠 MCP Servers: memory, sequential-thinking, postgres, github, filesystem, fetch, redis, stripe, supabase, cloudflare"
echo ""
echo "💡 Tips:"
echo "   - MCP servers will auto-connect when Claude Code starts"
echo "   - Check 'claude mcp list' to see server status"
echo "   - Servers marked with ✗ need API keys configured in .env.mcp"
echo ""

# Launch Claude Code
claude .