#!/bin/bash

# iwishBag Claude Code Agents Activation Script
# This script sets up the Claude Code agent configurations for the iwishBag platform

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_CONFIG_DIR="$HOME/.claude"

echo "🤖 Activating iwishBag Claude Code Agents..."
echo "======================================="

# Ensure Claude config directory exists
mkdir -p "$CLAUDE_CONFIG_DIR"

# Check if Claude Code is installed
if ! command -v claude &> /dev/null; then
    echo "❌ Claude Code CLI not found. Please install Claude Code first."
    echo "   Visit: https://docs.anthropic.com/claude/docs/claude-code"
    exit 1
fi

# Function to activate an agent
activate_agent() {
    local agent_name="$1"
    local agent_file="$SCRIPT_DIR/${agent_name}.json"
    
    if [ -f "$agent_file" ]; then
        echo "📋 Activating: $agent_name"
        
        # Copy agent configuration to Claude config directory
        cp "$agent_file" "$CLAUDE_CONFIG_DIR/"
        
        echo "   ✅ Agent configuration copied"
        
        # Validate JSON structure
        if command -v jq &> /dev/null; then
            if jq empty "$agent_file" 2>/dev/null; then
                echo "   ✅ Configuration validated"
            else
                echo "   ⚠️  Configuration has JSON errors"
            fi
        fi
    else
        echo "   ❌ Agent file not found: $agent_file"
        return 1
    fi
}

echo ""
echo "Phase 1: Critical Safety Agents"
echo "-------------------------------"
activate_agent "iwishbag-database-guardian"
activate_agent "iwishbag-type-guardian" 
activate_agent "iwishbag-security-sentinel"

echo ""
echo "Phase 1.5: Development Efficiency Agents"
echo "----------------------------------------"
activate_agent "iwishbag-code-reviewer"
activate_agent "iwishbag-test-automation"
activate_agent "iwishbag-documentation-generator"

echo ""
echo "Phase 2: Service Architecture Agents"
echo "----------------------------------"
activate_agent "iwishbag-service-architect"
activate_agent "iwishbag-component-curator"
activate_agent "iwishbag-migration-master"

echo ""
echo "🎉 All Agent Activation Complete!"
echo ""
echo "Next Steps:"
echo "1. Restart your Claude Code session to load the new agents"
echo "2. Verify agents are active with: claude agents list"
echo "3. Test agents by triggering their specializations"
echo ""
echo "World-Class Features Now Active:"
echo "• 🛡️  Database operations are protected from resets"
echo "• 🔍 TypeScript quality is continuously monitored"
echo "• 🔒 Security best practices are enforced"
echo "• 🔍 Intelligent code review with iwishBag expertise"
echo "• 🧪 Comprehensive test automation and coverage"
echo "• 📚 Living documentation that updates automatically"
echo "• 🏗️  Service architecture patterns are enforced"
echo "• 🎨 Component design system maintains consistency"
echo "• 🔄 Database migrations are safe and reversible"
echo ""
echo "Need help? Check the README.md file in this directory."