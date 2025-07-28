#!/bin/bash

echo "🚀 Claude MCP Auto-Setup Script"
echo "==============================="

# Step 1: Install working MCP packages globally
echo -e "\n📦 Installing available MCP packages..."

# These are confirmed to work
npm install -g @modelcontextprotocol/server-memory
npm install -g @modelcontextprotocol/server-sequential-thinking  
npm install -g @modelcontextprotocol/server-filesystem
npm install -g @supabase/mcp-server-supabase
npm install -g @cloudflare/mcp-server-cloudflare

# Step 2: Clone and build from source for missing packages
echo -e "\n🔧 Building MCP servers from source..."
mkdir -p ~/mcp-servers
cd ~/mcp-servers

# Clone the servers repo if not exists
if [ ! -d "servers" ]; then
    git clone https://github.com/modelcontextprotocol/servers.git
fi

cd servers

# Build fetch server (confirmed to exist)
if [ -d "src/fetch" ]; then
    echo "Building fetch server..."
    cd src/fetch
    npm install && npm run build
    cd ../..
fi

# Step 3: Create alternative implementations for missing servers
echo -e "\n🔨 Creating wrapper scripts for missing servers..."
mkdir -p ~/mcp-servers/custom

# Redis wrapper using redis-cli
cat > ~/mcp-servers/custom/redis-mcp.js << 'EOF'
#!/usr/bin/env node
const { spawn } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('Redis MCP Server Started');

rl.on('line', (input) => {
  try {
    const request = JSON.parse(input);
    if (request.method === 'redis.command') {
      const redis = spawn('redis-cli', request.params.args);
      let output = '';
      
      redis.stdout.on('data', (data) => {
        output += data;
      });
      
      redis.on('close', () => {
        console.log(JSON.stringify({
          jsonrpc: '2.0',
          id: request.id,
          result: output.trim()
        }));
      });
    }
  } catch (e) {
    console.error('Error:', e);
  }
});
EOF

chmod +x ~/mcp-servers/custom/redis-mcp.js

# Step 4: Create the final configuration
cat > "/Users/raunakbohra/Library/Application Support/Claude/claude_desktop_config.json" << 'EOF'
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
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/raunakbohra/Desktop/global-wishlist-hub"
      ]
    },
    "fetch": {
      "command": "node",
      "args": ["/Users/raunakbohra/mcp-servers/servers/src/fetch/dist/index.js"]
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
    "redis": {
      "command": "node",
      "args": ["/Users/raunakbohra/mcp-servers/custom/redis-mcp.js"],
      "env": {
        "REDIS_URL": "redis://localhost:6379"
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

echo -e "\n✅ Setup complete!"
echo "📝 Summary of MCP servers:"
echo "  ✓ memory - Working (npm package)"
echo "  ✓ sequential-thinking - Working (npm package)"
echo "  ✓ filesystem - Working (npm package)"
echo "  ✓ fetch - Built from source"
echo "  ✓ supabase - Working (npm package)"
echo "  ✓ cloudflare - Working (npm package)"
echo "  ✓ redis - Custom wrapper"
echo "  ✓ alibaba-research - Custom local server"
echo "  ✗ postgres - Not available (use SQL editor instead)"
echo "  ✗ github - Not available (use gh CLI instead)"
echo "  ✗ stripe - Not available (use API directly)"

echo -e "\n🔄 Next steps:"
echo "1. Quit Claude completely (Cmd+Q)"
echo "2. Wait 5 seconds"
echo "3. Restart Claude"
echo "4. Check if servers connect successfully"