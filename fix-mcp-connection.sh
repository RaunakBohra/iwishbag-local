#!/bin/bash

echo "🔍 Diagnosing MCP Server Connection Issues..."
echo "============================================"

# Check if Claude is running
echo -e "\n1. Checking Claude process..."
if pgrep -i "claude" > /dev/null; then
    echo "✅ Claude is running"
else
    echo "❌ Claude is not running - Please start Claude"
    exit 1
fi

# Test each MCP server individually
echo -e "\n2. Testing MCP servers..."

servers=(
    "memory:@modelcontextprotocol/server-memory"
    "sequential-thinking:@modelcontextprotocol/server-sequential-thinking"
    "postgres:@modelcontextprotocol/server-postgres"
    "github:@modelcontextprotocol/server-github"
    "filesystem:@modelcontextprotocol/server-filesystem"
    "fetch:@modelcontextprotocol/server-fetch"
    "redis:@modelcontextprotocol/server-redis"
    "stripe:@modelcontextprotocol/server-stripe"
    "supabase:@modelcontextprotocol/server-supabase"
    "cloudflare:@cloudflare/mcp-server-cloudflare"
)

failed_servers=()

for server in "${servers[@]}"; do
    IFS=":" read -r name package <<< "$server"
    echo -n "Testing $name... "
    
    if timeout 5s npx -y "$package" --version >/dev/null 2>&1; then
        echo "✅ OK"
    else
        echo "❌ Failed"
        failed_servers+=("$name")
    fi
done

# Check alibaba-research tool
echo -n "Testing alibaba-research... "
if [ -f "/Users/raunakbohra/Desktop/alibaba-research-tool/mcp-server/index.js" ]; then
    echo "✅ File exists"
else
    echo "❌ File not found"
    failed_servers+=("alibaba-research")
fi

# Summary
echo -e "\n3. Summary:"
echo "============"
if [ ${#failed_servers[@]} -eq 0 ]; then
    echo "✅ All MCP servers are accessible"
    echo -e "\n🔧 Recommended Actions:"
    echo "1. Fully quit Claude (Cmd+Q)"
    echo "2. Wait 5 seconds"
    echo "3. Restart Claude"
    echo "4. The MCP servers should connect automatically"
else
    echo "❌ Failed servers: ${failed_servers[*]}"
    echo -e "\n🔧 Fixing issues..."
    
    # Clear npm cache
    echo "Clearing npm cache..."
    npm cache clean --force
    
    # Pre-install failed packages
    for server in "${failed_servers[@]}"; do
        case $server in
            "memory") npm install -g @modelcontextprotocol/server-memory ;;
            "sequential-thinking") npm install -g @modelcontextprotocol/server-sequential-thinking ;;
            "postgres") npm install -g @modelcontextprotocol/server-postgres ;;
            "github") npm install -g @modelcontextprotocol/server-github ;;
            "filesystem") npm install -g @modelcontextprotocol/server-filesystem ;;
            "fetch") npm install -g @modelcontextprotocol/server-fetch ;;
            "redis") npm install -g @modelcontextprotocol/server-redis ;;
            "stripe") npm install -g @modelcontextprotocol/server-stripe ;;
            "supabase") npm install -g @modelcontextprotocol/server-supabase ;;
            "cloudflare") npm install -g @cloudflare/mcp-server-cloudflare ;;
        esac
    done
    
    echo -e "\n✅ Packages installed. Now:"
    echo "1. Fully quit Claude (Cmd+Q)"
    echo "2. Wait 5 seconds"
    echo "3. Restart Claude"
fi

# Check for common issues
echo -e "\n4. Additional Checks:"
echo "===================="

# Check if services are running
echo -n "PostgreSQL (54322): "
nc -zv 127.0.0.1 54322 2>&1 | grep -q succeeded && echo "✅ Running" || echo "❌ Not running"

echo -n "Redis (6379): "
nc -zv 127.0.0.1 6379 2>&1 | grep -q succeeded && echo "✅ Running" || echo "❌ Not running"

echo -n "Supabase (54321): "
nc -zv 127.0.0.1 54321 2>&1 | grep -q succeeded && echo "✅ Running" || echo "❌ Not running"

echo -e "\n✨ Done! If issues persist, check Claude's logs at:"
echo "~/Library/Logs/Claude/"