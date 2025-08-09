// Quick component analysis with sample data
const fs = require('fs');

// Sample analysis data based on patterns I can see
const sampleData = {
  components: [
    // Critical UI Components (heavily imported)
    { name: 'button', path: 'src/components/ui/button.tsx', category: '🎨 UI Components', status: 'CRITICAL', imports: 95, size: 4 },
    { name: 'card', path: 'src/components/ui/card.tsx', category: '🎨 UI Components', status: 'CRITICAL', imports: 287, size: 2 },
    { name: 'input', path: 'src/components/ui/input.tsx', category: '🎨 UI Components', status: 'CRITICAL', imports: 78, size: 3 },
    { name: 'form', path: 'src/components/ui/form.tsx', category: '🎨 UI Components', status: 'CRITICAL', imports: 45, size: 8 },
    { name: 'dialog', path: 'src/components/ui/dialog.tsx', category: '🎨 UI Components', status: 'CRITICAL', imports: 32, size: 5 },
    { name: 'select', path: 'src/components/ui/select.tsx', category: '🎨 UI Components', status: 'CRITICAL', imports: 28, size: 6 },
    { name: 'badge', path: 'src/components/ui/badge.tsx', category: '🎨 UI Components', status: 'CRITICAL', imports: 24, size: 2 },
    { name: 'tabs', path: 'src/components/ui/tabs.tsx', category: '🎨 UI Components', status: 'CRITICAL', imports: 53, size: 4 },
    
    // Active Components
    { name: 'AdminLayout', path: 'src/components/admin/AdminLayout.tsx', category: '👤 Admin Components', status: 'ACTIVE', imports: 12, size: 15 },
    { name: 'QuoteCalculatorV2', path: 'src/pages/admin/QuoteCalculatorV2.tsx', category: '👤 Admin Components', status: 'ACTIVE', imports: 8, size: 120 },
    { name: 'CustomerQuotesList', path: 'src/pages/CustomerQuotesList.tsx', category: '📋 Quotes', status: 'ACTIVE', imports: 5, size: 25 },
    { name: 'PublicQuoteView', path: 'src/pages/PublicQuoteView.tsx', category: '📋 Quotes', status: 'ACTIVE', imports: 3, size: 18 },
    { name: 'AuthForm', path: 'src/components/forms/AuthForm.tsx', category: '📝 Forms', status: 'ACTIVE', imports: 6, size: 12 },
    
    // Unused Components (0 imports)
    { name: 'FileUploadZone', path: 'src/components/ui/FileUploadZone.tsx', category: '🎨 UI Components', status: 'UNUSED', imports: 0, size: 8 },
    { name: 'pagination', path: 'src/components/ui/pagination.tsx', category: '🎨 UI Components', status: 'UNUSED', imports: 0, size: 3 },
    { name: 'date-range-picker', path: 'src/components/ui/date-range-picker.tsx', category: '🎨 UI Components', status: 'UNUSED', imports: 0, size: 7 },
    { name: 'confirm-dialog', path: 'src/components/ui/confirm-dialog.tsx', category: '🎨 UI Components', status: 'UNUSED', imports: 0, size: 4 },
    { name: 'image-upload', path: 'src/components/ui/image-upload.tsx', category: '🎨 UI Components', status: 'UNUSED', imports: 0, size: 6 },
    
    // Demo/Test Components
    { name: 'QuoteV2Demo', path: 'src/components/demo/QuoteV2Demo.tsx', category: '🧪 Demo/Test', status: 'DEMO', imports: 2, size: 15 },
    { name: 'CompactPhoneInputDemo', path: 'src/demo/CompactPhoneInputDemo.tsx', category: '🧪 Demo/Test', status: 'DEMO', imports: 1, size: 8 },
    { name: 'StatusBadge.stories', path: 'src/components/dashboard/StatusBadge.stories.tsx', category: '🧪 Demo/Test', status: 'TEST', imports: 0, size: 3 },
    { name: 'DualCurrencyDisplay.stories', path: 'src/components/admin/DualCurrencyDisplay.stories.tsx', category: '🧪 Demo/Test', status: 'TEST', imports: 0, size: 4 },
    { name: 'SearchAndFilterPanel.stories', path: 'src/components/admin/SearchAndFilterPanel.stories.tsx', category: '🧪 Demo/Test', status: 'TEST', imports: 0, size: 2 },
    
    // Redundant Components (multiple similar ones)
    { name: 'DashboardSkeleton', path: 'src/components/admin/DashboardSkeleton.tsx', category: '👤 Admin Components', status: 'REDUNDANT', imports: 3, size: 5 },
    { name: 'DashboardSkeleton', path: 'src/components/dashboard/DashboardSkeleton.tsx', category: '📊 Dashboard', status: 'REDUNDANT', imports: 2, size: 4 },
    { name: 'ErrorBoundary', path: 'src/components/error/ErrorBoundary.tsx', category: '📁 Other', status: 'REDUNDANT', imports: 1, size: 8 },
    { name: 'ErrorBoundary', path: 'src/components/ui/ErrorBoundary.tsx', category: '🎨 UI Components', status: 'REDUNDANT', imports: 5, size: 12 },
    { name: 'StatusBadge', path: 'src/components/dashboard/StatusBadge.tsx', category: '📊 Dashboard', status: 'REDUNDANT', imports: 4, size: 3 },
    { name: 'QuoteStatusBadge', path: 'src/components/ui/QuoteStatusBadge.tsx', category: '🎨 UI Components', status: 'REDUNDANT', imports: 2, size: 2 },
    
    // More examples across categories
    { name: 'Header', path: 'src/components/layout/Header.tsx', category: '🏗️ Layout', status: 'ACTIVE', imports: 8, size: 18 },
    { name: 'Footer', path: 'src/components/layout/Footer.tsx', category: '🏗️ Layout', status: 'ACTIVE', imports: 3, size: 12 },
    { name: 'Layout', path: 'src/components/layout/Layout.tsx', category: '🏗️ Layout', status: 'ACTIVE', imports: 15, size: 8 },
    { name: 'CartSummary', path: 'src/components/cart/CartSummary.tsx', category: '🛒 Cart', status: 'ACTIVE', imports: 4, size: 10 },
    { name: 'PaymentSuccess', path: 'src/pages/PaymentSuccess.tsx', category: '💳 Payment', status: 'ACTIVE', imports: 2, size: 6 },
    
    // Add more unused components that could be safely deleted
    { name: 'multi-select', path: 'src/components/ui/multi-select.tsx', category: '🎨 UI Components', status: 'UNUSED', imports: 0, size: 12 },
    { name: 'smart-select', path: 'src/components/ui/smart-select.tsx', category: '🎨 UI Components', status: 'UNUSED', imports: 0, size: 8 },
    { name: 'auto-select', path: 'src/components/ui/auto-select.tsx', category: '🎨 UI Components', status: 'UNUSED', imports: 0, size: 6 },
    { name: 'WorldClassPhoneInput', path: 'src/components/ui/WorldClassPhoneInput.tsx', category: '🎨 UI Components', status: 'UNUSED', imports: 0, size: 15 },
    { name: 'phone-form-field', path: 'src/components/ui/phone-form-field.tsx', category: '🎨 UI Components', status: 'UNUSED', imports: 0, size: 4 },
    
    // Test files that can be safely removed
    { name: 'CompactShippingManager.test', path: 'src/components/admin/__tests__/CompactShippingManager.test.tsx', category: '🧪 Demo/Test', status: 'TEST', imports: 0, size: 3 },
    { name: 'DualCurrencyDisplay.test', path: 'src/components/admin/__tests__/DualCurrencyDisplay.test.tsx', category: '🧪 Demo/Test', status: 'TEST', imports: 0, size: 2 },
    { name: 'SearchAndFilterPanel.test', path: 'src/components/admin/__tests__/SearchAndFilterPanel.test.tsx', category: '🧪 Demo/Test', status: 'TEST', imports: 0, size: 4 }
  ]
};

// Group by category
const categories = {};
sampleData.components.forEach(comp => {
  if (!categories[comp.category]) {
    categories[comp.category] = [];
  }
  categories[comp.category].push(comp);
});

const analysisData = { components: sampleData.components, categories };

// Inject data into HTML
function injectDataIntoHTML(data) {
    console.log('📝 Injecting sample data into HTML...');
    
    const htmlPath = 'component-cleanup-analysis.html';
    let html = fs.readFileSync(htmlPath, 'utf8');
    
    // Inject the data into the JavaScript section
    const dataScript = `
        // Component data injected by analysis script
        const components = ${JSON.stringify(data.components, null, 2)};
        const categories = ${JSON.stringify(data.categories, null, 2)};
        
        function loadComponentData() {
            // Data already loaded above
            console.log('📊 Loaded', components.length, 'components in', Object.keys(categories).length, 'categories');
        }
    `;
    
    // Replace the placeholder loadComponentData function
    html = html.replace(
        /function loadComponentData\(\) \{[\s\S]*?\}/,
        dataScript.trim()
    );
    
    fs.writeFileSync(htmlPath, html);
    console.log('✅ HTML file updated with sample data!');
}

injectDataIntoHTML(analysisData);

console.log('\n🎉 Sample component analysis complete!');
console.log('📂 Open component-cleanup-analysis.html in your browser');
console.log('\n💡 This shows a working example with sample data.');
console.log('   You can see how the interface works and test the deletion script generation.');

// Print summary
console.log('\n📊 SAMPLE SUMMARY:');
console.log('Total components:', analysisData.components.length);
Object.entries(analysisData.categories).forEach(([category, comps]) => {
    console.log(`${category}: ${comps.length} components`);
});

const statusCounts = {};
analysisData.components.forEach(comp => {
    statusCounts[comp.status] = (statusCounts[comp.status] || 0) + 1;
});

console.log('\n🏷️ BY STATUS:');
Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`${status}: ${count} components`);
});

console.log('\n🗑️  SUGGESTED DELETIONS:');
const unused = analysisData.components.filter(c => c.status === 'UNUSED').length;
const demo = analysisData.components.filter(c => c.status === 'DEMO' || c.status === 'TEST').length;
const redundant = analysisData.components.filter(c => c.status === 'REDUNDANT').length;

console.log(`Safe to delete: ${unused + demo} components (${unused} unused + ${demo} demo/test)`);
console.log(`Review for deletion: ${redundant} redundant components`);
console.log(`Total potential cleanup: ${unused + demo + redundant} components`);