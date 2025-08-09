const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function analyzeComponents() {
    console.log('🔍 Starting component analysis...');
    
    // Get all TSX components
    const componentFiles = execSync("find src/components -name '*.tsx'", { encoding: 'utf8' })
        .trim()
        .split('\n')
        .filter(file => file);
    
    console.log(`Found ${componentFiles.length} components to analyze`);
    
    const components = [];
    const categories = {};
    
    for (const filePath of componentFiles) {
        const componentName = path.basename(filePath, '.tsx');
        const category = getCategoryFromPath(filePath);
        
        // Count imports across codebase
        const importCount = countImports(componentName);
        
        // Determine status
        const status = determineStatus(filePath, componentName, importCount);
        
        const component = {
            name: componentName,
            path: filePath,
            category,
            status,
            imports: importCount,
            size: getFileSize(filePath)
        };
        
        components.push(component);
        
        if (!categories[category]) {
            categories[category] = [];
        }
        categories[category].push(component);
    }
    
    console.log('📊 Analysis complete!');
    console.log(`Categories: ${Object.keys(categories).length}`);
    
    return { components, categories };
}

function getCategoryFromPath(filePath) {
    const parts = filePath.split('/');
    
    if (parts.includes('ui')) return '🎨 UI Components';
    if (parts.includes('admin')) return '👤 Admin Components';
    if (parts.includes('forms')) return '📝 Forms';
    if (parts.includes('auth')) return '🔐 Authentication';
    if (parts.includes('quotes') || parts.includes('quotes-v2')) return '📋 Quotes';
    if (parts.includes('payment')) return '💳 Payment';
    if (parts.includes('cart')) return '🛒 Cart';
    if (parts.includes('checkout')) return '✅ Checkout';
    if (parts.includes('dashboard')) return '📊 Dashboard';
    if (parts.includes('layout')) return '🏗️ Layout';
    if (parts.includes('demo') || parts.includes('test')) return '🧪 Demo/Test';
    if (parts.includes('debug')) return '🐛 Debug';
    if (parts.includes('messaging')) return '💬 Messaging';
    if (parts.includes('orders')) return '📦 Orders';
    if (parts.includes('profile')) return '👤 Profile';
    if (parts.includes('support')) return '🎧 Support';
    
    return '📁 Other';
}

function countImports(componentName) {
    try {
        const result = execSync(
            `grep -r "from.*${componentName}\\|import.*${componentName}" src --include="*.tsx" --include="*.ts" 2>/dev/null | wc -l`,
            { encoding: 'utf8' }
        );
        return parseInt(result.trim()) || 0;
    } catch (error) {
        return 0;
    }
}

function determineStatus(filePath, componentName, importCount) {
    // Test files
    if (filePath.includes('.test.tsx') || filePath.includes('.stories.tsx')) {
        return 'TEST';
    }
    
    // Demo components
    if (filePath.includes('/demo/') || filePath.includes('/test/') || 
        componentName.toLowerCase().includes('demo') || 
        componentName.toLowerCase().includes('test')) {
        return 'DEMO';
    }
    
    // Critical UI components (essential for any React app)
    const criticalComponents = [
        'button', 'input', 'card', 'form', 'label', 'textarea', 'select',
        'dialog', 'alert', 'badge', 'table', 'tabs', 'tooltip', 'popover',
        'dropdown-menu', 'separator', 'skeleton', 'loading', 'error'
    ];
    
    if (criticalComponents.some(critical => 
        componentName.toLowerCase().includes(critical.toLowerCase()) && importCount > 10
    )) {
        return 'CRITICAL';
    }
    
    // Unused components
    if (importCount === 0) {
        return 'UNUSED';
    }
    
    // Check for redundancy (similar names)
    const similarComponents = [
        'DashboardSkeleton', 'ErrorBoundary', 'LoadingSpinner', 'StatusBadge'
    ];
    
    if (similarComponents.some(similar => componentName.includes(similar))) {
        return 'REDUNDANT';
    }
    
    // Active components (imported and used)
    if (importCount > 0) {
        return 'ACTIVE';
    }
    
    return 'UNKNOWN';
}

function getFileSize(filePath) {
    try {
        const stats = fs.statSync(filePath);
        return Math.round(stats.size / 1024); // Size in KB
    } catch (error) {
        return 0;
    }
}

function injectDataIntoHTML(data) {
    console.log('📝 Injecting data into HTML...');
    
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
        'function loadComponentData() {\n            // Component data will be loaded from analysis\n            // This is placeholder - real data will be injected\n        }',
        dataScript
    );
    
    fs.writeFileSync(htmlPath, html);
    console.log('✅ HTML file updated successfully!');
}

// Run the analysis
const analysisData = analyzeComponents();
injectDataIntoHTML(analysisData);

console.log('\n🎉 Component cleanup analysis complete!');
console.log('📂 Open component-cleanup-analysis.html in your browser');

// Print summary
console.log('\n📊 SUMMARY:');
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