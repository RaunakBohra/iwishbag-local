/**
 * Icon Migration Helper - Utilities to migrate from lucide-react to OptimizedIcon
 * 
 * This file provides utilities and examples for migrating existing components
 * to use the new OptimizedIcon system for better performance.
 */

// Migration examples for developers
export const MIGRATION_EXAMPLES = {
  // BEFORE: Multiple individual imports
  before: `
import { CheckCircle, Loader2, AlertCircle, Package } from 'lucide-react';

const MyComponent = () => (
  <div>
    <CheckCircle className="w-4 h-4 text-green-500" />
    <Loader2 className="w-4 h-4 animate-spin" />
    <AlertCircle className="w-4 h-4 text-red-500" />
    <Package className="w-4 h-4" />
  </div>
);`,

  // AFTER: Using OptimizedIcon (Method 1 - Component approach)
  after1: `
import { OptimizedIcon } from '@/components/ui/OptimizedIcon';

const MyComponent = () => (
  <div>
    <OptimizedIcon name="CheckCircle" className="w-4 h-4 text-green-500" />
    <OptimizedIcon name="Loader2" className="w-4 h-4 animate-spin" />
    <OptimizedIcon name="AlertCircle" className="w-4 h-4 text-red-500" />
    <OptimizedIcon name="Package" className="w-4 h-4" />
  </div>
);`,

  // AFTER: Using OptimizedIcon (Method 2 - Direct import for common icons)
  after2: `
import { CheckCircle, Loader2, AlertCircle, Package } from '@/components/ui/OptimizedIcon';

const MyComponent = () => (
  <div>
    <CheckCircle className="w-4 h-4 text-green-500" />
    <Loader2 className="w-4 h-4 animate-spin" />
    <AlertCircle className="w-4 h-4 text-red-500" />
    <Package className="w-4 h-4" />
  </div>
);`,

  // AFTER: Using OptimizedIcon (Method 3 - Hook approach)
  after3: `
import { useIcon } from '@/components/ui/OptimizedIcon';

const MyComponent = ({ iconName }: { iconName: string }) => {
  const IconComponent = useIcon(iconName);
  
  return IconComponent ? (
    <IconComponent className="w-4 h-4" />
  ) : (
    <div className="w-4 h-4 bg-gray-300 rounded" />
  );
};`
};

// List of icons that are pre-loaded (no lazy loading overhead)
export const PRELOADED_ICONS = [
  'CheckCircle',
  'Loader2',
  'Clock',
  'Package',
  'AlertCircle',
  'AlertTriangle',
  'Plus',
  'X',
  'ChevronDown',
  'Trash2',
  'RefreshCw',
  'MapPin',
  'Check',
  'Mail',
  'Info',
  'DollarSign',
  'Globe',
  'Truck',
  'Search',
  'Eye'
];

// List of icons that will be lazy-loaded
export const LAZY_LOADED_ICONS = [
  'ArrowLeft',
  'ArrowRight',
  'ChevronUp',
  'ChevronLeft',
  'ChevronRight',
  'MoreHorizontal',
  'Edit',
  'Save',
  'Copy',
  'Download',
  'Upload',
  'Share',
  'Share2',
  'CreditCard',
  'ShoppingCart',
  'ShoppingBag',
  'Phone',
  'MessageCircle',
  'Bell',
  'FileText',
  'Image',
  'Camera',
  'CheckCircle2',
  'XCircle',
  'Zap',
  'Shield',
  'Lock',
  'Settings',
  'Filter',
  'SortAsc',
  'SortDesc',
  'TrendingUp',
  'TrendingDown',
  'BarChart',
  'PieChart',
  'User',
  'Users',
  'UserPlus',
  'Map',
  'Navigation'
];

// Helper function to check if an icon is supported
export const isIconSupported = (iconName: string): boolean => {
  return PRELOADED_ICONS.includes(iconName) || LAZY_LOADED_ICONS.includes(iconName);
};

// Helper function to suggest migration strategy
export const getMigrationStrategy = (iconName: string): string => {
  if (PRELOADED_ICONS.includes(iconName)) {
    return `✅ PRELOADED - Use OptimizedIcon name="${iconName}" or direct import. No performance impact.`;
  }
  
  if (LAZY_LOADED_ICONS.includes(iconName)) {
    return `⚡ LAZY-LOADED - Use OptimizedIcon name="${iconName}". Will lazy load on first use.`;
  }
  
  return `❌ NOT SUPPORTED - Add "${iconName}" to LAZY_ICONS in OptimizedIcon.tsx first.`;
};

// Migration checker for a list of icons
export const checkIconsMigration = (iconNames: string[]): Record<string, string> => {
  const results: Record<string, string> = {};
  
  iconNames.forEach(iconName => {
    results[iconName] = getMigrationStrategy(iconName);
  });
  
  return results;
};

// Performance benefits calculator
export const calculatePerformanceBenefit = (iconCount: number): {
  originalSize: string;
  optimizedSize: string;
  savings: string;
  percentage: string;
} => {
  // Rough estimates based on lucide-react bundle sizes
  const avgIconSize = 2.1; // KB per icon
  const preloadedOverhead = 42; // KB for all preloaded common icons
  const lazyLoadOverhead = 0.5; // KB per lazy-loaded icon
  
  const originalSize = iconCount * avgIconSize;
  const optimizedSize = preloadedOverhead + (iconCount * lazyLoadOverhead);
  const savings = originalSize - optimizedSize;
  const percentage = ((savings / originalSize) * 100);
  
  return {
    originalSize: `${originalSize.toFixed(1)} KB`,
    optimizedSize: `${optimizedSize.toFixed(1)} KB`,
    savings: `${savings.toFixed(1)} KB`,
    percentage: `${percentage.toFixed(1)}%`
  };
};

// Development helper to find all icons in a file
export const extractIconsFromCode = (code: string): string[] => {
  const iconRegex = /import\s*{\s*([^}]+)\s*}\s*from\s*['"]lucide-react['"]/g;
  const icons: string[] = [];
  
  let match;
  while ((match = iconRegex.exec(code)) !== null) {
    const iconString = match[1];
    const iconNames = iconString
      .split(',')
      .map(name => name.trim())
      .filter(name => name.length > 0);
    
    icons.push(...iconNames);
  }
  
  return [...new Set(icons)]; // Remove duplicates
};

// Helper to generate migration code
export const generateMigrationCode = (
  originalImport: string, 
  componentName: string = 'MyComponent'
): { optimizedImport: string; example: string } => {
  const icons = extractIconsFromCode(originalImport);
  
  const optimizedImport = `import { OptimizedIcon } from '@/components/ui/OptimizedIcon';`;
  
  const example = `
// Before:
${originalImport}

// After (Method 1 - Recommended for mixed usage):
${optimizedImport}

const ${componentName} = () => (
  <div>
    ${icons.map(icon => `    <OptimizedIcon name="${icon}" className="w-4 h-4" />`).join('\n')}
  </div>
);

// After (Method 2 - For components using only common icons):
import { ${icons.join(', ')} } from '@/components/ui/OptimizedIcon';

const ${componentName} = () => (
  <div>
    ${icons.map(icon => `    <${icon} className="w-4 h-4" />`).join('\n')}
  </div>
);`;

  return { optimizedImport, example };
};

export default {
  MIGRATION_EXAMPLES,
  PRELOADED_ICONS,
  LAZY_LOADED_ICONS,
  isIconSupported,
  getMigrationStrategy,
  checkIconsMigration,
  calculatePerformanceBenefit,
  extractIconsFromCode,
  generateMigrationCode
};