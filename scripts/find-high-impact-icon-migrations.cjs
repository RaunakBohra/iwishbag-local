#!/usr/bin/env node

/**
 * Find High-Impact Icon Migration Candidates
 * 
 * This script analyzes your codebase to find components with the highest
 * icon usage that would benefit most from OptimizedIcon migration.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const SRC_DIR = path.join(__dirname, '../src');
const EXCLUDE_DIRS = ['node_modules', 'dist', '.git', '__tests__', 'test'];
const INCLUDE_EXTENSIONS = ['.tsx', '.ts'];

// Results storage
const results = [];

// Recursively find all TypeScript/React files
function findFiles(dir, files = []) {
  const entries = fs.readdirSync(dir);
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !EXCLUDE_DIRS.includes(entry)) {
      findFiles(fullPath, files);
    } else if (stat.isFile() && INCLUDE_EXTENSIONS.includes(path.extname(entry))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Extract icons from a file
function extractIcons(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const iconRegex = /import\s*{\s*([^}]+)\s*}\s*from\s*['"]lucide-react['"]/g;
    const icons = [];
    
    let match;
    while ((match = iconRegex.exec(content)) !== null) {
      const iconString = match[1];
      const iconNames = iconString
        .split(',')
        .map(name => name.trim())
        .filter(name => name.length > 0);
      
      icons.push(...iconNames);
    }
    
    return [...new Set(icons)]; // Remove duplicates
  } catch (error) {
    console.warn(`Warning: Could not read ${filePath}`);
    return [];
  }
}

// Analyze all files
function analyzeFiles() {
  const files = findFiles(SRC_DIR);
  console.log(`🔍 Analyzing ${files.length} files for icon usage...\n`);
  
  for (const filePath of files) {
    const icons = extractIcons(filePath);
    
    if (icons.length > 0) {
      const relativePath = path.relative(process.cwd(), filePath);
      const fileSize = fs.statSync(filePath).size;
      
      results.push({
        path: relativePath,
        iconCount: icons.length,
        icons: icons,
        fileSize: fileSize,
        impactScore: icons.length * Math.log(fileSize / 1000) // Weighted by file size
      });
    }
  }
  
  // Sort by impact score (highest first)
  results.sort((a, b) => b.impactScore - a.impactScore);
}

// Calculate performance benefits
function calculateBenefits(iconCount) {
  const avgIconSize = 2.1; // KB per icon
  const preloadedOverhead = 42; // KB for all preloaded common icons (one-time)
  const lazyLoadOverhead = 0.5; // KB per lazy-loaded icon
  
  const originalSize = iconCount * avgIconSize;
  const optimizedSize = preloadedOverhead + (iconCount * lazyLoadOverhead);
  const savings = Math.max(0, originalSize - optimizedSize);
  const percentage = originalSize > 0 ? ((savings / originalSize) * 100) : 0;
  
  return {
    originalSize: `${originalSize.toFixed(1)} KB`,
    optimizedSize: `${optimizedSize.toFixed(1)} KB`, 
    savings: `${savings.toFixed(1)} KB`,
    percentage: `${percentage.toFixed(1)}%`
  };
}

// Display results
function displayResults() {
  console.log('🎯 HIGH-IMPACT MIGRATION CANDIDATES\n');
  console.log('📊 Top 15 components by optimization impact:\n');
  
  // Header
  console.log('Rank | Impact | Icons | File Size | Savings | Path');
  console.log('-----|--------|-------|-----------|---------|------------------');
  
  // Top 15 results
  const top15 = results.slice(0, 15);
  
  top15.forEach((result, index) => {
    const benefits = calculateBenefits(result.iconCount);
    const rank = `${index + 1}`.padStart(4);
    const impact = `${result.impactScore.toFixed(1)}`.padStart(6);
    const icons = `${result.iconCount}`.padStart(5);
    const fileSize = `${(result.fileSize / 1024).toFixed(1)} KB`.padStart(9);
    const savings = benefits.savings.padStart(7);
    const filePath = result.path.length > 50 ? '...' + result.path.slice(-47) : result.path;
    
    console.log(`${rank} | ${impact} | ${icons} | ${fileSize} | ${savings} | ${filePath}`);
  });
  
  console.log('\n📈 MIGRATION IMPACT SUMMARY\n');
  
  // Calculate total impact
  const totalIcons = results.reduce((sum, r) => sum + r.iconCount, 0);
  const totalBenefits = calculateBenefits(totalIcons);
  
  console.log(`Total icons found: ${totalIcons}`);
  console.log(`Current bundle size: ${totalBenefits.originalSize}`);
  console.log(`Optimized bundle size: ${totalBenefits.optimizedSize}`);
  console.log(`Total savings: ${totalBenefits.savings} (${totalBenefits.percentage})`);
  
  console.log('\n🚀 RECOMMENDED MIGRATION ORDER\n');
  
  // Phase recommendations
  const phase1 = results.filter(r => r.iconCount >= 5);
  const phase2 = results.filter(r => r.iconCount >= 3 && r.iconCount < 5);
  const phase3 = results.filter(r => r.iconCount >= 1 && r.iconCount < 3);
  
  console.log(`Phase 1 (High Impact): ${phase1.length} files with 5+ icons`);
  phase1.slice(0, 5).forEach(r => {
    console.log(`  • ${r.path} (${r.iconCount} icons)`);
  });
  
  console.log(`\nPhase 2 (Medium Impact): ${phase2.length} files with 3-4 icons`);
  phase2.slice(0, 3).forEach(r => {
    console.log(`  • ${r.path} (${r.iconCount} icons)`);
  });
  
  console.log(`\nPhase 3 (Low Impact): ${phase3.length} files with 1-2 icons`);
  
  console.log('\n💡 NEXT STEPS\n');
  console.log('1. Start with Phase 1 files (highest impact)');
  console.log('2. Use OptimizedIcon component approach for easy migration');
  console.log('3. Run `npm run build -- --analyze` to measure bundle size reduction');
  console.log('4. See docs/ICON_OPTIMIZATION.md for detailed migration guide');
  
  if (top15.length > 0) {
    console.log(`\n🎯 Start with: ${top15[0].path}`);
    console.log(`   Icons: ${top15[0].icons.join(', ')}`);
    console.log(`   Potential savings: ${calculateBenefits(top15[0].iconCount).savings}`);
  }
}

// Main execution
console.log('🔍 Icon Migration Impact Analysis\n');

try {
  analyzeFiles();
  
  if (results.length === 0) {
    console.log('✅ No lucide-react imports found. Migration may already be complete!');
  } else {
    displayResults();
  }
} catch (error) {
  console.error('❌ Error analyzing files:', error.message);
  process.exit(1);
}