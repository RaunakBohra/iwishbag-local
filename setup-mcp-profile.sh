#!/bin/bash
# Add MCP configuration to shell profile

echo "📝 Setting up MCP in your shell profile..."

# Detect shell profile
if [ -f ~/.zshrc ]; then
    PROFILE=~/.zshrc
    echo "Found zsh profile"
elif [ -f ~/.bashrc ]; then
    PROFILE=~/.bashrc
    echo "Found bash profile"
else
    PROFILE=~/.profile
    echo "Using default profile"
fi

# Add MCP configuration
cat >> "$PROFILE" << 'EOF'

# Claude MCP Configuration
export CLAUDE_MCP_PROJECT="/Users/raunakbohra/Desktop/global-wishlist-hub"

# Load MCP aliases
if [ -f "$CLAUDE_MCP_PROJECT/mcp-aliases.sh" ]; then
    source "$CLAUDE_MCP_PROJECT/mcp-aliases.sh"
fi

# Auto-load MCP environment variables when entering project
claude_mcp_autoload() {
    if [ -f ".env.mcp" ]; then
        echo "🔐 Loading MCP environment variables..."
        export $(cat .env.mcp | grep -v '^#' | xargs)
    fi
}

# Add to cd command to auto-load MCP env
cd() {
    builtin cd "$@"
    if [ "$PWD" = "$CLAUDE_MCP_PROJECT" ]; then
        claude_mcp_autoload
    fi
}

# Quick Claude project launcher
claude-project() {
    cd "$CLAUDE_MCP_PROJECT" && ./start-claude-mcp.sh
}

EOF

echo "✅ MCP configuration added to $PROFILE"
echo ""
echo "🔄 To activate, run: source $PROFILE"
echo "🚀 Then use 'claude-project' to start Claude with all MCP servers"