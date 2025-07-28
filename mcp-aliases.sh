#!/bin/bash
# MCP Aliases for Easy Management
# Add these to your ~/.zshrc or ~/.bashrc

# Quick MCP commands
alias mcp-list='claude mcp list'
alias mcp-start='./start-claude-mcp.sh'
alias mcp-health='claude mcp list | grep -E "(✓|✗)"'

# Individual MCP server checks
alias mcp-memory='claude mcp get memory'
alias mcp-thinking='claude mcp get sequential-thinking'
alias mcp-postgres='claude mcp get postgres'
alias mcp-github='claude mcp get github'

# Environment setup
alias mcp-env='export $(cat .env.mcp | grep -v "^#" | xargs)'

# Quick project launch with MCP
alias claude-project='cd /Users/raunakbohra/Desktop/global-wishlist-hub && ./start-claude-mcp.sh'

echo "✅ MCP aliases loaded! Available commands:"
echo "  mcp-list     - List all MCP servers and their status"
echo "  mcp-start    - Start Claude Code with all MCP servers"
echo "  mcp-health   - Quick health check of all servers"
echo "  mcp-env      - Load MCP environment variables"
echo "  claude-project - Jump to project and start Claude with MCP"