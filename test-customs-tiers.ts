import { calculateCustomsTier } from './src/lib/customs-tier-calculator';

// Test the customs tier calculator
async function testCustomsTierCalculator() {
  console.log('🧪 Testing customs tier calculator...');
  
  // Test 1: Low value item (should match Electronics - Low Value tier)
  console.log('\n--- Test 1: Low value item ($50, 2kg) ---');
  const result1 = await calculateCustomsTier('JP', 'IN', 50, 2);
  console.log('Result:', result1);
  
  // Test 2: High value item (should match Electronics - High Value tier)
  console.log('\n--- Test 2: High value item ($200, 3kg) ---');
  const result2 = await calculateCustomsTier('JP', 'IN', 200, 3);
  console.log('Result:', result2);
  
  // Test 3: No matching route (should return fallback)
  console.log('\n--- Test 3: No matching route (US to IN) ---');
  const result3 = await calculateCustomsTier('US', 'IN', 100, 2);
  console.log('Result:', result3);
  
  // Test 4: Heavy item (should not match any tier due to weight constraint)
  console.log('\n--- Test 4: Heavy item ($50, 10kg) ---');
  const result4 = await calculateCustomsTier('JP', 'IN', 50, 10);
  console.log('Result:', result4);
}

// Run the test
testCustomsTierCalculator().catch(console.error);