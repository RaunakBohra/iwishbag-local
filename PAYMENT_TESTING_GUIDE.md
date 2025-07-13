# Unified Payment Management Testing Guide

## Prerequisites
1. Access to admin account
2. Test quotes in various payment states (unpaid, partial, paid, overpaid)
3. Access to payment gateway dashboards (PayU, Stripe)
4. Test payment proofs/receipts for upload

## Test Scenarios

### 1. Basic Modal Functionality
- [ ] Navigate to Admin > Quote Management
- [ ] Click on any quote to view details
- [ ] Verify "Manage Payments" button is visible in Payment Information card
- [ ] Click "Manage Payments" button
- [ ] Verify modal opens with correct title and tabs
- [ ] Verify modal can be closed with X button or clicking outside

### 2. Overview Tab Testing
- [ ] Verify payment summary displays correctly:
  - Order total amount
  - Total paid amount
  - Remaining/overpaid amount
  - Payment progress bar
- [ ] Verify payment status badge shows correct status:
  - Unpaid (red)
  - Partially Paid (orange)
  - Fully Paid (green)
  - Overpaid (blue)
- [ ] Verify payment method displays with correct icon:
  - Bank Transfer (banknote icon)
  - PayU/Stripe (credit card icon)
  - UPI/eSewa (smartphone icon)
  - Cash (dollar icon)
- [ ] Test quick action buttons:
  - "Record Payment" button (for unpaid/partial)
  - "Upload Proof" button (for bank transfer)

### 3. Record Payment Tab Testing

#### 3.1 Form Validation
- [ ] Test empty amount - should show error
- [ ] Test negative amount - should be prevented
- [ ] Test zero amount - should show error
- [ ] Test amount exceeding remaining - should show overpayment warning
- [ ] Test invalid date (future date) - should be prevented

#### 3.2 Payment Methods
Test recording payments with each method:
- [ ] Bank Transfer
- [ ] Cash
- [ ] UPI
- [ ] PayU (Manual)
- [ ] Stripe (Manual)
- [ ] eSewa
- [ ] Credit Note
- [ ] Check/Cheque
- [ ] Wire Transfer
- [ ] Other

#### 3.3 Recording Process
- [ ] Fill all fields correctly
- [ ] Add optional transaction ID
- [ ] Add optional notes
- [ ] Click "Record Payment"
- [ ] Verify loading state during submission
- [ ] Verify success toast message
- [ ] Verify form resets after success
- [ ] Verify automatic switch to History tab
- [ ] Check quote status updates correctly

### 4. Verify Tab Testing (Bank Transfer Only)

#### 4.1 Payment Proof Upload
- [ ] Switch to customer view
- [ ] Upload payment proof for bank transfer order
- [ ] Return to admin view

#### 4.2 Proof Verification
- [ ] Open Manage Payments modal
- [ ] Go to Verify tab
- [ ] Verify unverified proofs are listed
- [ ] Click on a proof to select it
- [ ] Verify preview button opens proof in new tab
- [ ] Enter verification amount
- [ ] Add verification notes
- [ ] Click "Verify & Record Payment"
- [ ] Verify success message
- [ ] Verify proof marked as verified
- [ ] Check payment recorded in history

### 5. History Tab Testing

#### 5.1 Timeline Display
- [ ] Verify timeline shows all transactions
- [ ] Check visual indicators:
  - Green dot + dollar icon for payments
  - Red dot + refresh icon for refunds
  - Gray dot for other transactions
- [ ] Verify chronological order (newest first)
- [ ] Check each entry shows:
  - Transaction type and method
  - Amount with +/- prefix
  - Running balance
  - Reference number
  - Date and time
  - Recorded by information

#### 5.2 Export Functionality
- [ ] Click "Export CSV" button
- [ ] Verify file downloads
- [ ] Open CSV file and check:
  - Header information (order ID, date, total)
  - Column headers are correct
  - All transactions are included
  - Data formatting is correct
  - Special characters handled properly

#### 5.3 Summary Statistics
- [ ] Verify summary shows:
  - Total Payments amount
  - Total Refunds amount
  - Transaction count
- [ ] Check calculations are accurate

### 6. Refund Tab Testing

#### 6.1 Refund Availability
- [ ] Tab only shows for quotes with payments
- [ ] Verify correct display for:
  - Paid orders (can refund full amount)
  - Overpaid orders (shows overpaid amount)
  - Partially paid (shows paid amount)

#### 6.2 Refund Process
- [ ] Click "Open Refund Manager"
- [ ] Verify RefundManagementModal opens
- [ ] Test refund functionality (covered in separate refund testing)

### 7. Edge Cases and Error Handling

#### 7.1 Network Errors
- [ ] Disconnect internet and try recording payment
- [ ] Verify error message displays
- [ ] Reconnect and retry - should work

#### 7.2 Permission Testing
- [ ] Test with moderator role - verify limited access
- [ ] Test with user role - verify no access to admin features

#### 7.3 Concurrent Updates
- [ ] Open same quote in two browser tabs
- [ ] Record payment in one tab
- [ ] Refresh other tab - should show updated data

#### 7.4 Large Data Sets
- [ ] Test with quote having 50+ payment transactions
- [ ] Verify performance remains good
- [ ] Check timeline scrolling works properly

### 8. Integration Testing

#### 8.1 Quote Status Updates
- [ ] Record payment for unpaid quote
- [ ] Verify status changes to "partial" or "paid"
- [ ] Check status reflects in quote list

#### 8.2 Email Notifications
- [ ] Record full payment
- [ ] Verify customer receives payment confirmation email
- [ ] Check email contains correct details

#### 8.3 Payment Gateway Verification
- [ ] For PayU/Stripe manual recording:
  - Verify in actual gateway dashboard
  - Cross-check transaction IDs
  - Ensure amounts match

### 9. Mobile Responsiveness
- [ ] Test on mobile device/responsive mode
- [ ] Verify modal is scrollable
- [ ] Check all tabs are accessible
- [ ] Test form inputs work on touch devices
- [ ] Verify timeline displays correctly

### 10. Browser Compatibility
Test on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

## Regression Testing

After unified modal testing, verify these still work:
- [ ] Transaction Details dialog (separate from unified modal)
- [ ] Payment status displays correctly in quote list
- [ ] Payment widgets in dashboard
- [ ] Customer-facing payment pages

## Performance Testing

- [ ] Measure modal open time (<1 second)
- [ ] Check query performance with React Query DevTools
- [ ] Verify no unnecessary re-renders
- [ ] Test with slow network (throttle to 3G)

## Test Data Setup

Create test quotes with these states:
1. **Unpaid Quote**: No payments recorded
2. **Partial Payment**: 50% paid via bank transfer
3. **Fully Paid**: 100% paid via PayU
4. **Overpaid**: 110% paid (customer error)
5. **Multiple Payments**: 3-4 small payments
6. **Mixed Methods**: Payments via different gateways
7. **With Refunds**: Paid then partially refunded

## Bug Report Template

If you find issues, document:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots/console errors
- Browser and OS information
- Quote ID and payment state

## Sign-off Checklist

- [ ] All test scenarios completed
- [ ] No critical bugs found
- [ ] Performance acceptable
- [ ] Mobile experience good
- [ ] Error handling works properly
- [ ] Data integrity maintained
- [ ] User experience intuitive

## Notes
- Always test in a staging environment first
- Keep payment gateway test credentials handy
- Document any peculiar behaviors
- Test with real-world data volumes