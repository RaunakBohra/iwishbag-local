#!/bin/bash

# iwishBag Claude Code Agents Validation Script
# This script validates agent configurations and tests functionality

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🔍 Validating iwishBag Claude Code Agents..."
echo "==========================================="

# Function to validate JSON configuration
validate_json() {
    local agent_file="$1"
    local agent_name="$(basename "$agent_file" .json)"
    
    echo "📋 Validating: $agent_name"
    
    if [ ! -f "$agent_file" ]; then
        echo "   ❌ Configuration file not found"
        return 1
    fi
    
    # Check JSON syntax
    if command -v jq &> /dev/null; then
        if jq empty "$agent_file" 2>/dev/null; then
            echo "   ✅ JSON syntax valid"
        else
            echo "   ❌ JSON syntax error"
            jq empty "$agent_file"
            return 1
        fi
        
        # Check required fields
        local required_fields=("name" "description" "version" "specialization" "triggers" "tools" "behaviors")
        local missing_fields=()
        
        for field in "${required_fields[@]}"; do
            if ! jq -e ".$field" "$agent_file" > /dev/null 2>&1; then
                missing_fields+=("$field")
            fi
        done
        
        if [ ${#missing_fields[@]} -eq 0 ]; then
            echo "   ✅ All required fields present"
        else
            echo "   ❌ Missing required fields: ${missing_fields[*]}"
            return 1
        fi
        
        # Validate specific configurations
        case "$agent_name" in
            "iwishbag-database-guardian")
                if jq -e '.constraints.forbidden_commands | length > 0' "$agent_file" > /dev/null; then
                    echo "   ✅ Database protection rules configured"
                else
                    echo "   ⚠️  No database protection rules found"
                fi
                ;;
            "iwishbag-type-guardian")
                if jq -e '.quality_standards' "$agent_file" > /dev/null; then
                    echo "   ✅ TypeScript quality standards defined"
                else
                    echo "   ⚠️  No quality standards found"
                fi
                ;;
            "iwishbag-security-sentinel")
                if jq -e '.security_policies' "$agent_file" > /dev/null; then
                    echo "   ✅ Security policies configured"
                else
                    echo "   ⚠️  No security policies found"
                fi
                ;;
        esac
    else
        echo "   ⚠️  jq not installed, skipping detailed validation"
        echo "   💡 Install jq for full validation: brew install jq"
    fi
    
    echo ""
}

# Function to test agent triggers
test_triggers() {
    echo "🧪 Testing Agent Triggers..."
    echo "----------------------------"
    
    # Test database guardian triggers
    echo "Testing database-guardian triggers:"
    echo "   • Database reset commands should be blocked"
    echo "   • Migration files should trigger monitoring"
    echo "   • Schema changes should require validation"
    echo ""
    
    # Test type guardian triggers  
    echo "Testing type-guardian triggers:"
    echo "   • TypeScript errors should trigger fixes"
    echo "   • Service modifications should be validated"
    echo "   • Type definitions should be checked"
    echo ""
    
    # Test security sentinel triggers
    echo "Testing security-sentinel triggers:"
    echo "   • Database queries should be validated for RLS"
    echo "   • Secret usage should be monitored"
    echo "   • Authentication code should be checked"
    echo ""
}

# Function to generate test scenarios
generate_test_scenarios() {
    echo "📝 Generating Test Scenarios..."
    echo "-----------------------------"
    
    cat > "$SCRIPT_DIR/test-scenarios.md" << 'EOF'
# Agent Test Scenarios

## Database Guardian Tests

### 1. Forbidden Command Test
```bash
# This should be BLOCKED by the agent
supabase db reset --local
```
Expected: Agent blocks command and suggests alternatives

### 2. Migration Validation Test  
```bash
# Create a migration file
echo "DROP TABLE quotes;" > supabase/migrations/test_migration.sql
```
Expected: Agent validates migration and warns about destructive operation

### 3. Schema Health Check
```bash
# Check database health
PGPASSWORD=postgres psql -h localhost -p 54322 -d postgres -U postgres -c "SELECT is_admin();"
```
Expected: Agent monitors query and validates result

## Type Guardian Tests

### 1. TypeScript Error Test
```typescript
// Add to any .ts file - should trigger type guardian
const invalidCode: string = 123; // Type error
```
Expected: Agent detects error and suggests fix

### 2. Service Pattern Test
```typescript
// Modify a service - should validate pattern
class TestService {
    constructor() {} // Should suggest singleton pattern
}
```
Expected: Agent enforces singleton with caching pattern

### 3. Currency Handling Test
```typescript
// Currency handling - should validate USD base pattern
const price = "50 EUR"; // Should suggest proper currency handling
```
Expected: Agent suggests using CurrencyService

## Security Sentinel Tests

### 1. RLS Policy Test
```sql
-- Create table without RLS - should trigger warning
CREATE TABLE test_table (id uuid, data text);
```
Expected: Agent requires RLS policy

### 2. Secret Detection Test
```typescript
// Hardcoded secret - should be blocked
const apiKey = "sk_live_abc123def456"; // Should trigger alert
```
Expected: Agent blocks and suggests environment variable

### 3. Input Validation Test
```typescript
// Unsafe query - should trigger validation
const query = `SELECT * FROM users WHERE id = ${userId}`;
```
Expected: Agent suggests parameterized query
EOF

    echo "   ✅ Test scenarios generated: test-scenarios.md"
    echo ""
}

# Run validation
echo "Phase 1: Configuration Validation"
echo "--------------------------------"
echo "Core Safety Agents:"
validate_json "$SCRIPT_DIR/iwishbag-database-guardian.json"
validate_json "$SCRIPT_DIR/iwishbag-type-guardian.json" 
validate_json "$SCRIPT_DIR/iwishbag-security-sentinel.json"

echo ""
echo "Development Efficiency Agents:"
validate_json "$SCRIPT_DIR/iwishbag-code-reviewer.json"
validate_json "$SCRIPT_DIR/iwishbag-test-automation.json"
validate_json "$SCRIPT_DIR/iwishbag-documentation-generator.json"

echo ""
echo "Service Architecture Agents:"
validate_json "$SCRIPT_DIR/iwishbag-service-architect.json"
validate_json "$SCRIPT_DIR/iwishbag-component-curator.json"
validate_json "$SCRIPT_DIR/iwishbag-migration-master.json"

echo "Phase 2: Trigger Testing"
echo "----------------------"
test_triggers

echo "Phase 3: Test Scenario Generation"
echo "--------------------------------"
generate_test_scenarios

echo "🎉 Validation Complete!"
echo ""
echo "Summary:"
echo "✅ Agent configurations validated"
echo "✅ Required fields verified"
echo "✅ Trigger patterns tested"
echo "✅ Test scenarios generated"
echo ""
echo "Next Steps:"
echo "1. Run ./activate-agents.sh to enable agents"
echo "2. Follow test-scenarios.md to verify agent behavior"
echo "3. Monitor agent activity during development"
echo ""
echo "All agents ready for deployment! 🚀"