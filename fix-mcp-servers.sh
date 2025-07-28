#!/bin/bash

echo "🔧 Setting up MCP Servers..."
echo "============================"

# Create a directory for custom MCP servers
mkdir -p ~/mcp-servers
cd ~/mcp-servers

# 1. PostgreSQL MCP Server - Build from source
echo -e "\n📦 Setting up PostgreSQL MCP Server..."
if [ ! -d "mcp-server-postgres" ]; then
    git clone https://github.com/modelcontextprotocol/servers.git mcp-servers-repo
    cp -r mcp-servers-repo/src/postgres mcp-server-postgres
    cd mcp-server-postgres
    npm install
    cd ..
else
    echo "PostgreSQL MCP already exists"
fi

# 2. GitHub MCP Server - Build from source  
echo -e "\n📦 Setting up GitHub MCP Server..."
if [ ! -d "mcp-server-github" ]; then
    cp -r mcp-servers-repo/src/github mcp-server-github
    cd mcp-server-github
    npm install
    cd ..
else
    echo "GitHub MCP already exists"
fi

# 3. Fetch MCP Server - Build from source
echo -e "\n📦 Setting up Fetch MCP Server..."
if [ ! -d "mcp-server-fetch" ]; then
    cp -r mcp-servers-repo/src/fetch mcp-server-fetch
    cd mcp-server-fetch
    npm install
    cd ..
else
    echo "Fetch MCP already exists"
fi

# 4. Install available npm packages
echo -e "\n📦 Installing available MCP packages..."
npm install -g @supabase/mcp-server-supabase || echo "Supabase MCP install failed"
npm install -g @cloudflare/mcp-server-cloudflare || echo "Cloudflare MCP install failed"

# Create updated config
cat > ~/Desktop/global-wishlist-hub/mcp-config-updated.json << 'EOF'
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    },
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
    },
    "postgres": {
      "command": "node",
      "args": ["$HOME/mcp-servers/mcp-server-postgres/dist/index.js"],
      "env": {
        "POSTGRES_CONNECTION_STRING": "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
      }
    },
    "github": {
      "command": "node",
      "args": ["$HOME/mcp-servers/mcp-server-github/dist/index.js"],
      "env": {
        "GITHUB_TOKEN": "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"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/raunakbohra/Desktop/global-wishlist-hub"]
    },
    "fetch": {
      "command": "node",
      "args": ["$HOME/mcp-servers/mcp-server-fetch/dist/index.js"]
    },
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase"],
      "env": {
        "SUPABASE_URL": "http://127.0.0.1:54321",
        "SUPABASE_SERVICE_ROLE_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"
      }
    },
    "cloudflare": {
      "command": "npx",
      "args": ["-y", "@cloudflare/mcp-server-cloudflare"],
      "env": {
        "CLOUDFLARE_ACCOUNT_ID": "610762493d34333f1a6d72a037b345cf",
        "CLOUDFLARE_API_TOKEN": "4Y_WjuGIEtTpK85hmE6XrGwbi85d8zN5Me0T_45l"
      }
    },
    "alibaba-research": {
      "command": "node",
      "args": ["/Users/raunakbohra/Desktop/alibaba-research-tool/mcp-server/index.js"],
      "env": {}
    }
  }
}
EOF

echo -e "\n✅ Setup complete! Next steps:"
echo "1. Review the updated config at: ~/Desktop/global-wishlist-hub/mcp-config-updated.json"
echo "2. Copy it to Claude's config location"
echo "3. Restart Claude"

# For Redis and Stripe, we'll need custom implementations
echo -e "\n⚠️  Note: Redis and Stripe MCP servers need custom implementation"
echo "Consider using alternatives or building custom servers"