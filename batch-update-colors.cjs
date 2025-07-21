#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Color mappings for brand consistency
const colorMappings = [
  // Blue to Teal mappings
  { from: 'bg-blue-50', to: 'bg-teal-50' },
  { from: 'bg-blue-100', to: 'bg-teal-100' },
  { from: 'bg-blue-200', to: 'bg-teal-200' },
  { from: 'bg-blue-300', to: 'bg-teal-300' },
  { from: 'bg-blue-400', to: 'bg-teal-400' },
  { from: 'bg-blue-500', to: 'bg-teal-500' },
  { from: 'bg-blue-600', to: 'bg-teal-600' },
  { from: 'bg-blue-700', to: 'bg-teal-700' },
  { from: 'bg-blue-800', to: 'bg-teal-800' },
  { from: 'bg-blue-900', to: 'bg-teal-900' },

  { from: 'text-blue-50', to: 'text-teal-50' },
  { from: 'text-blue-100', to: 'text-teal-100' },
  { from: 'text-blue-200', to: 'text-teal-200' },
  { from: 'text-blue-300', to: 'text-teal-300' },
  { from: 'text-blue-400', to: 'text-teal-400' },
  { from: 'text-blue-500', to: 'text-teal-500' },
  { from: 'text-blue-600', to: 'text-teal-600' },
  { from: 'text-blue-700', to: 'text-teal-700' },
  { from: 'text-blue-800', to: 'text-teal-800' },
  { from: 'text-blue-900', to: 'text-teal-900' },

  { from: 'border-blue-50', to: 'border-teal-50' },
  { from: 'border-blue-100', to: 'border-teal-100' },
  { from: 'border-blue-200', to: 'border-teal-200' },
  { from: 'border-blue-300', to: 'border-teal-300' },
  { from: 'border-blue-400', to: 'border-teal-400' },
  { from: 'border-blue-500', to: 'border-teal-500' },
  { from: 'border-blue-600', to: 'border-teal-600' },
  { from: 'border-blue-700', to: 'border-teal-700' },
  { from: 'border-blue-800', to: 'border-teal-800' },
  { from: 'border-blue-900', to: 'border-teal-900' },

  { from: 'ring-blue-100', to: 'ring-teal-100' },
  { from: 'ring-blue-200', to: 'ring-teal-200' },
  { from: 'ring-blue-300', to: 'ring-teal-300' },
  { from: 'ring-blue-400', to: 'ring-teal-400' },
  { from: 'ring-blue-500', to: 'ring-teal-500' },
  { from: 'ring-blue-600', to: 'ring-teal-600' },
  { from: 'ring-blue-700', to: 'ring-teal-700' },

  { from: 'focus:border-blue-500', to: 'focus:border-teal-500' },
  { from: 'focus:ring-blue-500', to: 'focus:ring-teal-500' },
  { from: 'focus:bg-blue-50', to: 'focus:bg-teal-50' },
  { from: 'hover:bg-blue-50', to: 'hover:bg-teal-50' },
  { from: 'hover:bg-blue-100', to: 'hover:bg-teal-100' },
  { from: 'hover:text-blue-600', to: 'hover:text-teal-600' },
  { from: 'hover:text-blue-700', to: 'hover:text-teal-700' },
  { from: 'hover:border-blue-300', to: 'hover:border-teal-300' },

  // Purple to Orange mappings (secondary brand color)
  { from: 'bg-purple-50', to: 'bg-orange-50' },
  { from: 'bg-purple-100', to: 'bg-orange-100' },
  { from: 'bg-purple-200', to: 'bg-orange-200' },
  { from: 'bg-purple-300', to: 'bg-orange-300' },
  { from: 'bg-purple-400', to: 'bg-orange-400' },
  { from: 'bg-purple-500', to: 'bg-orange-500' },
  { from: 'bg-purple-600', to: 'bg-orange-600' },
  { from: 'bg-purple-700', to: 'bg-orange-700' },

  { from: 'text-purple-50', to: 'text-orange-50' },
  { from: 'text-purple-100', to: 'text-orange-100' },
  { from: 'text-purple-200', to: 'text-orange-200' },
  { from: 'text-purple-300', to: 'text-orange-300' },
  { from: 'text-purple-400', to: 'text-orange-400' },
  { from: 'text-purple-500', to: 'text-orange-500' },
  { from: 'text-purple-600', to: 'text-orange-600' },
  { from: 'text-purple-700', to: 'text-orange-700' },

  { from: 'border-purple-100', to: 'border-orange-100' },
  { from: 'border-purple-200', to: 'border-orange-200' },
  { from: 'border-purple-300', to: 'border-orange-300' },
  { from: 'border-purple-400', to: 'border-orange-400' },
  { from: 'border-purple-500', to: 'border-orange-500' },
  { from: 'border-purple-600', to: 'border-orange-600' },

  // Indigo to Teal/Orange mappings
  { from: 'bg-indigo-50', to: 'bg-teal-50' },
  { from: 'bg-indigo-100', to: 'bg-teal-100' },
  { from: 'bg-indigo-500', to: 'bg-teal-500' },
  { from: 'bg-indigo-600', to: 'bg-teal-600' },
  { from: 'text-indigo-600', to: 'text-teal-600' },
  { from: 'text-indigo-700', to: 'text-teal-700' },
  { from: 'border-indigo-200', to: 'border-teal-200' },
  { from: 'border-indigo-500', to: 'border-teal-500' },

  // Gradient mappings
  { from: 'from-blue-600 to-purple-600', to: 'from-teal-600 to-orange-600' },
  { from: 'from-blue-500 to-purple-500', to: 'from-teal-500 to-orange-500' },
  { from: 'from-blue-600 to-blue-700', to: 'from-teal-600 to-teal-700' },
  { from: 'from-blue-500 to-blue-600', to: 'from-teal-500 to-teal-600' },
  { from: 'from-purple-600 to-blue-600', to: 'from-orange-600 to-teal-600' },
  {
    from: 'hover:from-blue-700 hover:to-purple-700',
    to: 'hover:from-teal-700 hover:to-orange-700',
  },
  { from: 'hover:from-blue-700 hover:to-blue-800', to: 'hover:from-teal-700 hover:to-teal-800' },
];

function findTsxFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);

  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat && stat.isDirectory()) {
      // Skip node_modules, .git, etc.
      if (!file.startsWith('.') && file !== 'node_modules') {
        results = results.concat(findTsxFiles(filePath));
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(filePath);
    }
  });

  return results;
}

function updateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // Apply color mappings
    colorMappings.forEach((mapping) => {
      const regex = new RegExp(mapping.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      if (content.includes(mapping.from)) {
        content = content.replace(regex, mapping.to);
        changed = true;
      }
    });

    if (changed) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Updated: ${filePath}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🎨 Starting iwishBag brand color migration...\n');

  const srcDir = path.join(process.cwd(), 'src');
  const files = findTsxFiles(srcDir);

  console.log(`📁 Found ${files.length} TypeScript files to check\n`);

  let updatedCount = 0;

  files.forEach((file) => {
    if (updateFile(file)) {
      updatedCount++;
    }
  });

  console.log(`\n🎉 Brand color migration completed!`);
  console.log(`📊 Updated ${updatedCount} files`);
  console.log(`🎨 Applied teal-orange brand theme consistently`);

  if (updatedCount > 0) {
    console.log(`\n🔄 Run the following to commit changes:`);
    console.log(`git add src/`);
    console.log(`git commit -m "feat: Complete brand color migration to teal-orange theme"`);
  }
}

if (require.main === module) {
  main();
}

module.exports = { colorMappings, updateFile };
