#!/usr/bin/env node

/**
 * Script to switch from mock PayPal refund to real Edge Function
 * Run this after deploying the PayPal refund Edge Function
 */

const fs = require('fs');
const path = require('path');

const componentPath = path.join(__dirname, '../src/components/admin/PayPalRefundManagement.tsx');

console.log('🔄 Switching from mock PayPal refund to real Edge Function...');

try {
  let content = fs.readFileSync(componentPath, 'utf8');

  // Replace the mock function with the real Edge Function call
  const mockFunctionStart =
    '      // TEMPORARY MOCK FUNCTION - Replace with real Edge Function when deployed';
  const mockFunctionEnd = '      };';

  const realFunction = `      const response = await fetch(\`\${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paypal-refund\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${(await supabase.auth.getSession()).data.session?.access_token}\`,
        },
        body: JSON.stringify(refundData),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to process refund');
      }

      return data;`;

  // Find and replace the mock function
  const mockStart = content.indexOf(mockFunctionStart);
  if (mockStart === -1) {
    console.log('❌ Mock function not found. Already using real function?');
    process.exit(1);
  }

  // Find the end of the mock function (look for the closing brace of mutationFn)
  let braceCount = 0;
  let mockEnd = mockStart;
  let inMutationFn = false;

  for (let i = mockStart; i < content.length; i++) {
    if (content.substring(i, i + 12) === 'mutationFn: ') {
      inMutationFn = true;
    }

    if (inMutationFn) {
      if (content[i] === '{') braceCount++;
      if (content[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
          mockEnd = i;
          break;
        }
      }
    }
  }

  // Replace the mock function with real function
  const beforeMock = content.substring(0, mockStart);
  const afterMock = content.substring(mockEnd + 1);

  const newContent = beforeMock + realFunction + afterMock;

  // Remove the mock mode warning
  const mockWarningStart = newContent.indexOf(
    '<div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">',
  );
  const mockWarningEnd = newContent.indexOf('</div>', mockWarningStart) + 6;

  const finalContent =
    newContent.substring(0, mockWarningStart) + newContent.substring(mockWarningEnd);

  // Update the success message
  const updatedContent = finalContent
    .replace(
      /title: data\.mock \? 'Mock Refund Processed' : 'Refund Processed'/g,
      "title: 'Refund Processed'",
    )
    .replace(
      /description: data\.mock[\s\S]*?: `Refund of \${formatCurrency\(data\.refund_amount, refundFormData\.currency\)} has been initiated\.`,/g,
      'description: `Refund of ${formatCurrency(data.refund_amount, refundFormData.currency)} has been initiated.`,',
    );

  fs.writeFileSync(componentPath, updatedContent);

  console.log('✅ Successfully switched to real PayPal refund Edge Function');
  console.log('📝 Changes made:');
  console.log('  - Replaced mock function with real Edge Function call');
  console.log('  - Removed mock mode warning banner');
  console.log('  - Updated success messages');
  console.log('');
  console.log('🧪 To test: Go to /admin/payment-management → PayPal Monitoring → Refunds');
} catch (error) {
  console.error('❌ Error switching to real function:', error.message);
  process.exit(1);
}
