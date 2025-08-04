// Simple syntax check for the quote form
const fs = require('fs');

try {
  const formContent = fs.readFileSync('/Users/raunakbohra/Desktop/global-wishlist-hub/src/pages/QuoteRequestPage.tsx', 'utf8');
  
  // Check for common syntax issues
  const issues = [];
  
  // Check for unmatched brackets
  const openBraces = (formContent.match(/{/g) || []).length;
  const closeBraces = (formContent.match(/}/g) || []).length;
  const openParens = (formContent.match(/\(/g) || []).length;
  const closeParens = (formContent.match(/\)/g) || []).length;
  const openBrackets = (formContent.match(/\[/g) || []).length;
  const closeBrackets = (formContent.match(/\]/g) || []).length;
  
  if (openBraces !== closeBraces) {
    issues.push(`Unmatched braces: ${openBraces} open, ${closeBraces} close`);
  }
  
  if (openParens !== closeParens) {
    issues.push(`Unmatched parentheses: ${openParens} open, ${closeParens} close`);
  }
  
  if (openBrackets !== closeBrackets) {
    issues.push(`Unmatched brackets: ${openBrackets} open, ${closeBrackets} close`);
  }
  
  // Check for required imports
  const requiredImports = [
    'useForm',
    'useFieldArray',
    'zodResolver',
    'RadioGroup',
    'RadioGroupItem'
  ];
  
  requiredImports.forEach(imp => {
    if (!formContent.includes(imp)) {
      issues.push(`Missing import or usage: ${imp}`);
    }
  });
  
  // Check for export
  if (!formContent.includes('export default')) {
    issues.push('Missing default export');
  }
  
  if (issues.length === 0) {
    console.log('✅ Quote form syntax check passed!');
    console.log('📊 Stats:');
    console.log(`  Lines: ${formContent.split('\n').length}`);
    console.log(`  Size: ${(formContent.length / 1024).toFixed(1)}KB`);
    console.log(`  Components used: ${(formContent.match(/<[A-Z]\w+/g) || []).length}`);
  } else {
    console.log('❌ Syntax issues found:');
    issues.forEach(issue => console.log(`  - ${issue}`));
  }
  
} catch (error) {
  console.log('❌ Error reading file:', error.message);
}