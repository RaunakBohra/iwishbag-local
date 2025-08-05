#!/bin/bash

# Flipkart Dataset ID Update Script
# Updates the placeholder dataset ID with your real Bright Data dataset ID

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if dataset ID is provided
if [ $# -eq 0 ]; then
    print_error "Dataset ID is required!"
    echo ""
    echo "Usage: $0 <dataset_id>"
    echo "Example: $0 gd_abc123xyz789"
    echo ""
    echo "Steps to get your dataset ID:"
    echo "1. Login to Bright Data dashboard"
    echo "2. Go to Datasets section"
    echo "3. Find your Flipkart dataset"
    echo "4. Copy the dataset ID (starts with 'gd_')"
    echo ""
    echo "For setup instructions, see: FLIPKART_DATASET_SETUP.md"
    exit 1
fi

DATASET_ID="$1"

# Validate dataset ID format
if [[ ! $DATASET_ID =~ ^gd_[a-zA-Z0-9]+$ ]]; then
    print_error "Invalid dataset ID format!"
    echo "Dataset ID should start with 'gd_' followed by alphanumeric characters"
    echo "Example: gd_abc123xyz789"
    exit 1
fi

print_status "Updating Flipkart dataset ID to: $DATASET_ID"

# File to update
WORKER_FILE="workers/brightdata-mcp/src/index.ts"

# Check if worker file exists
if [ ! -f "$WORKER_FILE" ]; then
    print_error "Worker file not found: $WORKER_FILE"
    echo "Make sure you're running this script from the project root directory"
    exit 1
fi

# Backup original file
BACKUP_FILE="${WORKER_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
print_status "Creating backup: $BACKUP_FILE"
cp "$WORKER_FILE" "$BACKUP_FILE"

# Update dataset ID in both locations
print_status "Updating dataset IDs in $WORKER_FILE..."

# Update line 713 (callFlipkartProductAPI function)
sed -i.tmp "s/const datasetId = 'REPLACE_WITH_REAL_FLIPKART_DATASET_ID';/const datasetId = '$DATASET_ID';/g" "$WORKER_FILE"

# Update line 374 (getDatasetId function)
sed -i.tmp "s/'flipkart_product': 'REPLACE_WITH_REAL_FLIPKART_DATASET_ID',/'flipkart_product': '$DATASET_ID',/g" "$WORKER_FILE"

# Remove temporary files created by sed
rm -f "${WORKER_FILE}.tmp"

# Verify changes
CHANGES_COUNT=$(grep -c "$DATASET_ID" "$WORKER_FILE" 2>/dev/null || echo "0")

if [ "$CHANGES_COUNT" -eq "2" ]; then
    print_success "Dataset ID updated successfully in 2 locations!"
else
    print_warning "Expected 2 changes, but found $CHANGES_COUNT. Please verify manually."
fi

# Show the changes
print_status "Changes made:"
echo ""
grep -n "$DATASET_ID" "$WORKER_FILE" | while IFS= read -r line; do
    echo "  $line"
done

echo ""
print_status "Next steps:"
echo "1. Deploy the updated worker:"
echo "   cd workers/brightdata-mcp && npx wrangler deploy"
echo ""
echo "2. Test the integration:"
echo "   node test-flipkart-integration.cjs"
echo ""
echo "3. If tests fail, check:"
echo "   - Dataset is active in Bright Data dashboard"
echo "   - CSS selectors are correct"
echo "   - Test URLs are accessible"

echo ""
print_success "Update complete! 🎉"