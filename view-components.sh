#!/bin/bash

echo "🧹 Component Cleanup System - View Components"
echo "=============================================="

echo ""
echo "🌐 OPTION 1: Interactive HTML Interface (Recommended)"
echo "   Open this URL in your browser:"
echo "   file:///Users/raunakbohra/Desktop/global-wishlist-hub/component-cleanup-analysis.html"
echo ""
echo "   Or run: open component-cleanup-analysis.html"
echo ""

echo "👁️  COMPONENT PREVIEW FEATURES:"
echo "   • Click 👁️ Preview button next to any component"
echo "   • Click 📥 Load Content to see the actual code"
echo "   • Shows import usage and safety status"
echo ""

echo "🔍 OPTION 2: Quick File Inspection (Terminal)"
echo "   Here are some sample commands to inspect components:"
echo ""

# Show some example unused components
echo "📁 UNUSED COMPONENTS (0 imports - safe to delete):"
unused_components=(
    "src/components/ui/FileUploadZone.tsx"
    "src/components/ui/pagination.tsx"  
    "src/components/ui/multi-select.tsx"
    "src/components/ui/date-range-picker.tsx"
    "src/components/ui/WorldClassPhoneInput.tsx"
)

for comp in "${unused_components[@]}"; do
    if [[ -f "$comp" ]]; then
        lines=$(wc -l < "$comp" 2>/dev/null || echo "0")
        imports=$(grep -r "import.*$(basename "$comp" .tsx)" src --include="*.tsx" --include="*.ts" 2>/dev/null | wc -l | tr -d ' ')
        echo "   ❌ $comp ($lines lines, $imports imports)"
    fi
done

echo ""
echo "🧪 DEMO/TEST FILES (safe to delete):"
find src/components -name "*.test.tsx" -o -name "*.stories.tsx" | head -5 | while read file; do
    if [[ -f "$file" ]]; then
        echo "   🗑️  $file"
    fi
done

echo ""
echo "📋 QUICK COMMANDS:"
echo ""
echo "# View a specific component:"
echo "code src/components/ui/button.tsx"
echo ""
echo "# Count imports for a component:"
echo 'grep -r "import.*button" src --include="*.tsx" --include="*.ts" | wc -l'
echo ""
echo "# Find all test files:"
echo 'find src/components -name "*.test.tsx" -o -name "*.stories.tsx"'
echo ""
echo "# Check component size:"
echo "wc -l src/components/ui/card.tsx"
echo ""

echo "🎯 RECOMMENDED WORKFLOW:"
echo "1. Open the HTML interface in your browser"
echo "2. Browse categories and check component previews"
echo "3. Use 'Select All Unused + Demo' for bulk selection"
echo "4. Generate and review the deletion script"
echo "5. Test your app after deletions"
echo ""

# Try to open the HTML file automatically
if command -v open >/dev/null 2>&1; then
    echo "🚀 Opening HTML interface..."
    open component-cleanup-analysis.html
else
    echo "💡 Manually open component-cleanup-analysis.html in your browser"
fi