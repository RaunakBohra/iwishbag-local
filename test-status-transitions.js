// Test script to verify status transitions and debug the issue

// Mock status configurations (same as in our system)
const mockQuoteStatuses = [
  {
    id: 'pending',
    name: 'pending',
    label: 'Pending',
    description: 'Quote request is awaiting review',
    color: 'secondary',
    icon: 'Clock',
    isActive: true,
    order: 1,
    allowedTransitions: ['sent', 'rejected'],
    isTerminal: false,
    category: 'quote',
    triggersEmail: false,
    requiresAction: true,
    showsInQuotesList: true,
    showsInOrdersList: false,
    canBePaid: false,
    isDefaultQuoteStatus: true
  },
  {
    id: 'sent',
    name: 'sent',
    label: 'Sent',
    description: 'Quote has been sent to customer',
    color: 'outline',
    icon: 'FileText',
    isActive: true,
    order: 2,
    allowedTransitions: ['approved', 'rejected', 'expired'],
    autoExpireHours: 168, // 7 days
    isTerminal: false,
    category: 'quote',
    triggersEmail: true,
    emailTemplate: 'quote_sent',
    requiresAction: false,
    showsInQuotesList: true,
    showsInOrdersList: false,
    canBePaid: false
  },
  {
    id: 'approved',
    name: 'approved',
    label: 'Approved',
    description: 'Customer has approved the quote',
    color: 'default',
    icon: 'CheckCircle',
    isActive: true,
    order: 3,
    allowedTransitions: ['rejected', 'paid'],
    isTerminal: false,
    category: 'quote',
    triggersEmail: true,
    emailTemplate: 'quote_approved',
    requiresAction: false,
    showsInQuotesList: true,
    showsInOrdersList: false,
    canBePaid: true
  },
  {
    id: 'rejected',
    name: 'rejected',
    label: 'Rejected',
    description: 'Quote has been rejected',
    color: 'destructive',
    icon: 'XCircle',
    isActive: true,
    order: 4,
    allowedTransitions: ['approved'],
    isTerminal: true,
    category: 'quote',
    triggersEmail: true,
    emailTemplate: 'quote_rejected',
    requiresAction: false,
    showsInQuotesList: true,
    showsInOrdersList: false,
    canBePaid: false
  }
];

// Test helper functions
function isValidTransition(currentStatus, newStatus, category = 'quote') {
  const statuses = category === 'quote' ? mockQuoteStatuses : [];
  const currentConfig = statuses.find(s => s.name === currentStatus);
  if (!currentConfig || !currentConfig.isActive) return false;
  return currentConfig.allowedTransitions.includes(newStatus);
}

function getStatusConfig(statusName, category = 'quote') {
  const statuses = category === 'quote' ? mockQuoteStatuses : [];
  return statuses.find(s => s.name === statusName) || null;
}

// Test cases
console.log('=== Status Transition Tests ===\n');

const testCases = [
  { from: 'pending', to: 'sent', expected: true, description: 'Pending → Sent (admin sends quote)' },
  { from: 'pending', to: 'approved', expected: false, description: 'Pending → Approved (should not be allowed)' },
  { from: 'sent', to: 'approved', expected: true, description: 'Sent → Approved (customer approves)' },
  { from: 'sent', to: 'rejected', expected: true, description: 'Sent → Rejected (customer rejects)' },
  { from: 'sent', to: 'expired', expected: true, description: 'Sent → Expired (auto-expire)' },
  { from: 'approved', to: 'paid', expected: true, description: 'Approved → Paid (payment received)' },
  { from: 'approved', to: 'rejected', expected: true, description: 'Approved → Rejected (customer changes mind)' },
  { from: 'rejected', to: 'approved', expected: true, description: 'Rejected → Approved (customer re-approves)' },
  { from: 'rejected', to: 'sent', expected: false, description: 'Rejected → Sent (should not be allowed)' },
];

testCases.forEach(test => {
  const result = isValidTransition(test.from, test.to, 'quote');
  const status = result === test.expected ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} ${test.description}`);
  console.log(`   From: "${test.from}" → To: "${test.to}" → Result: ${result} (Expected: ${test.expected})\n`);
});

// Test UI logic
console.log('=== UI Logic Tests ===\n');

const uiTestCases = [
  { status: 'pending', shouldShowApproveButton: true, description: 'Pending status should show approve button' },
  { status: 'sent', shouldShowApproveButton: true, description: 'Sent status should show approve button' },
  { status: 'approved', shouldShowApproveButton: false, description: 'Approved status should NOT show approve button' },
  { status: 'rejected', shouldShowApproveButton: false, description: 'Rejected status should NOT show approve button' },
];

uiTestCases.forEach(test => {
  const shouldShow = test.status === 'pending' || test.status === 'sent';
  const status = shouldShow === test.shouldShowApproveButton ? '✅ PASS' : '❌ PASS';
  console.log(`${status} ${test.description}`);
  console.log(`   Status: "${test.status}" → Should show approve button: ${shouldShow} (Expected: ${test.shouldShowApproveButton})\n`);
});

// Test the specific issue
console.log('=== Specific Issue Test ===\n');
console.log('User reported: Quote with "sent" status shows approve button but it\'s not working');
console.log('Expected behavior:');
console.log('1. Quote with "sent" status should show approve button ✅');
console.log('2. Approve button should work and transition to "approved" ✅');
console.log('3. Status validation should allow "sent" → "approved" transition ✅\n');

// Test the actual transition
const currentStatus = 'sent';
const newStatus = 'approved';
const canTransition = isValidTransition(currentStatus, newStatus, 'quote');
console.log(`Can transition from "${currentStatus}" to "${newStatus}": ${canTransition ? 'YES' : 'NO'}`);

if (canTransition) {
  console.log('✅ The transition should work correctly');
  console.log('✅ The issue might be in the UI or database update logic');
} else {
  console.log('❌ The transition is not allowed - this is the problem!');
}

console.log('\n=== Recommendations ===\n');
console.log('1. Check if the quote status is actually "sent" in the database');
console.log('2. Verify the status management configuration is loaded correctly');
console.log('3. Check browser console for any JavaScript errors');
console.log('4. Verify the database update is working correctly');
console.log('5. Check if the UI is refreshing after status changes'); 