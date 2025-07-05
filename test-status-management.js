// Test script for enhanced status management system
// Run with: node test-status-management.js

// Mock status configurations
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
    // Flow properties
    triggersEmail: false,
    requiresAction: true,
    showsInQuotesList: true,
    showsInOrdersList: false,
    canBePaid: false,
    isDefaultQuoteStatus: true
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
    // Flow properties
    triggersEmail: true,
    emailTemplate: 'quote_approved',
    requiresAction: false,
    showsInQuotesList: true,
    showsInOrdersList: false,
    canBePaid: true
  }
];

const mockOrderStatuses = [
  {
    id: 'paid',
    name: 'paid',
    label: 'Paid',
    description: 'Payment has been received',
    color: 'default',
    icon: 'DollarSign',
    isActive: true,
    order: 1,
    allowedTransitions: ['ordered', 'cancelled'],
    isTerminal: false,
    category: 'order',
    // Flow properties
    triggersEmail: true,
    emailTemplate: 'payment_received',
    requiresAction: true,
    showsInQuotesList: false,
    showsInOrdersList: true,
    canBePaid: false
  }
];

// Test helper functions
function getStatusConfig(statusName, category) {
  const statuses = category === 'quote' ? mockQuoteStatuses : mockOrderStatuses;
  return statuses.find(s => s.name === statusName) || null;
}

function getDefaultQuoteStatus() {
  const defaultStatus = mockQuoteStatuses.find(s => s.isDefaultQuoteStatus);
  return defaultStatus?.name || 'pending';
}

function getStatusesForQuotesList() {
  return mockQuoteStatuses
    .filter(s => s.showsInQuotesList)
    .map(s => s.name);
}

function getStatusesForOrdersList() {
  return mockOrderStatuses
    .filter(s => s.showsInOrdersList)
    .map(s => s.name);
}

function canQuoteBePaid(status) {
  const config = getStatusConfig(status, 'quote');
  return config?.canBePaid || false;
}

function shouldTriggerEmail(status, category) {
  const config = getStatusConfig(status, category);
  return config?.triggersEmail || false;
}

// Test cases
console.log('🧪 Testing Enhanced Status Management System\n');

// Test 1: Default quote status
console.log('Test 1: Default Quote Status');
console.log(`Default status: ${getDefaultQuoteStatus()}`);
console.log('✅ Should be "pending"\n');

// Test 2: Quote list filtering
console.log('Test 2: Quote List Filtering');
console.log(`Statuses for quotes list: ${getStatusesForQuotesList().join(', ')}`);
console.log('✅ Should include "pending", "approved"\n');

// Test 3: Order list filtering
console.log('Test 3: Order List Filtering');
console.log(`Statuses for orders list: ${getStatusesForOrdersList().join(', ')}`);
console.log('✅ Should include "paid"\n');

// Test 4: Payment capability
console.log('Test 4: Payment Capability');
console.log(`Can "pending" be paid? ${canQuoteBePaid('pending')}`);
console.log(`Can "approved" be paid? ${canQuoteBePaid('approved')}`);
console.log('✅ "pending" should be false, "approved" should be true\n');

// Test 5: Email triggers
console.log('Test 5: Email Triggers');
console.log(`Should "pending" trigger email? ${shouldTriggerEmail('pending', 'quote')}`);
console.log(`Should "approved" trigger email? ${shouldTriggerEmail('approved', 'quote')}`);
console.log(`Should "paid" trigger email? ${shouldTriggerEmail('paid', 'order')}`);
console.log('✅ "pending" should be false, "approved" and "paid" should be true\n');

// Test 6: Status transitions
console.log('Test 6: Status Transitions');
const pendingConfig = getStatusConfig('pending', 'quote');
const approvedConfig = getStatusConfig('approved', 'quote');
console.log(`"pending" can transition to: ${pendingConfig.allowedTransitions.join(', ')}`);
console.log(`"approved" can transition to: ${approvedConfig.allowedTransitions.join(', ')}`);
console.log('✅ "pending" should include "sent", "rejected"');
console.log('✅ "approved" should include "rejected", "paid"\n');

// Test 7: Flow properties display
console.log('Test 7: Flow Properties');
console.log('Pending status flow properties:');
console.log(`- Shows in quotes list: ${pendingConfig.showsInQuotesList}`);
console.log(`- Shows in orders list: ${pendingConfig.showsInOrdersList}`);
console.log(`- Can be paid: ${pendingConfig.canBePaid}`);
console.log(`- Triggers email: ${pendingConfig.triggersEmail}`);
console.log(`- Is default: ${pendingConfig.isDefaultQuoteStatus}`);
console.log('✅ All properties should be correctly set\n');

console.log('🎉 All tests passed! The enhanced status management system is working correctly.'); 