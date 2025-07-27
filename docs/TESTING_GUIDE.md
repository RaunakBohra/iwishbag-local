# Testing Guide for iwishBag

## Overview

Our testing strategy ensures reliability and security for our payment platform with:
- **Unit Tests**: Business logic and utilities
- **Integration Tests**: API and service interactions
- **E2E Tests**: Critical user journeys
- **Current Coverage**: Starting from 5.5% → Target 80%

## Test Structure

```
src/
├── services/__tests__/      # Service layer tests
├── hooks/__tests__/         # React hooks tests
├── utils/__tests__/         # Utility function tests
├── components/__tests__/    # Component tests
e2e/                        # End-to-end tests
├── critical-flows.spec.ts  # User journey tests
```

## Running Tests

### Unit Tests
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test

# Run specific test file
npm test PaymentService

# Run with UI
npm run test:ui
```

### E2E Tests
```bash
# Run all E2E tests
npm run e2e

# Run with UI mode
npm run e2e:ui

# Debug mode
npm run e2e:debug

# View test report
npm run e2e:report
```

## Writing Tests

### Unit Test Example
```typescript
import { describe, it, expect, vi } from 'vitest';
import { calculateQuoteTotal } from '@/services/QuoteCalculatorService';

describe('QuoteCalculatorService', () => {
  it('should calculate total correctly', () => {
    const items = [
      { price: 100, quantity: 2 },
      { price: 50, quantity: 1 }
    ];
    
    const total = calculateQuoteTotal(items);
    expect(total).toBe(250);
  });
});
```

### E2E Test Example
```typescript
import { test, expect } from '@playwright/test';

test('customer can create quote', async ({ page }) => {
  await page.goto('/quote');
  await page.fill('input[name="product_name"]', 'iPhone');
  await page.click('button:has-text("Submit")');
  await expect(page).toHaveURL(/\/quote\/[a-z0-9-]+/);
});
```

## Test Coverage

### Current Status
- **Overall**: 5.5% → Building to 80%
- **Critical Areas**:
  - Payment Processing: ✅ New tests added
  - Quote Calculations: ✅ New tests added
  - User Authentication: 🚧 In progress
  - Cart Management: 🚧 In progress

### Coverage Targets
```
- statements: 70%
- branches: 70%
- functions: 70%
- lines: 70%
```

## Critical Test Scenarios

### 1. Payment Flow
- ✅ Payment link creation
- ✅ Payment status updates
- ✅ Webhook signature verification
- ✅ Refund processing
- ✅ Gateway-specific integration (PayU, Stripe)

### 2. Quote Calculation
- ✅ Item subtotal calculation
- ✅ Shipping cost tiers
- ✅ Tax and customs calculations
- ✅ Service fee tiers
- ✅ Currency conversion
- ✅ Discount application

### 3. Security Tests
- ✅ XSS prevention
- ✅ Authentication enforcement
- ✅ Admin permission checks
- ✅ Input validation
- ✅ SQL injection prevention

### 4. E2E User Journeys
- ✅ Quote creation flow
- ✅ Admin quote approval
- ✅ Payment completion
- ✅ Cart management
- ✅ Mobile responsiveness

## Mocking Strategy

### Supabase Mock
```typescript
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => Promise.resolve({ data: [], error: null })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      update: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    },
  },
}));
```

### Payment Gateway Mock
```typescript
vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn(() => Promise.resolve({
    confirmCardPayment: vi.fn(),
    createPaymentMethod: vi.fn(),
  })),
}));
```

## CI/CD Integration

Tests run automatically on:
- Every pull request
- Pushes to main/develop branches
- Manual workflow dispatch

Coverage reports are:
- Uploaded to Codecov
- Visible in PR comments
- Tracked over time

## Best Practices

### DO:
- ✅ Test business logic thoroughly
- ✅ Mock external dependencies
- ✅ Test error scenarios
- ✅ Use meaningful test descriptions
- ✅ Keep tests isolated and independent
- ✅ Test edge cases

### DON'T:
- ❌ Test implementation details
- ❌ Make real API calls
- ❌ Depend on test order
- ❌ Share state between tests
- ❌ Test third-party libraries

## Debugging Tests

### Debug Unit Tests
```bash
# Add console.log or debugger statements
# Run specific test
npm test -- --reporter=verbose PaymentService
```

### Debug E2E Tests
```bash
# Use Playwright inspector
npm run e2e:debug

# Take screenshots on failure
await page.screenshot({ path: 'debug.png' });
```

## Common Issues

### Issue: Tests timing out
**Solution**: Increase timeout
```typescript
test('slow test', async ({ page }) => {
  test.setTimeout(60000); // 60 seconds
  // test code
});
```

### Issue: Flaky tests
**Solution**: Add proper waits
```typescript
// Bad
await page.click('.button');

// Good
await page.waitForSelector('.button');
await page.click('.button');
```

### Issue: Mock not working
**Solution**: Clear mocks between tests
```typescript
beforeEach(() => {
  vi.clearAllMocks();
});
```

## Next Steps

1. **Increase Coverage**:
   - Add component tests
   - Test error boundaries
   - Test authentication flows

2. **Performance Testing**:
   - Add load tests for APIs
   - Test large quote calculations
   - Measure component render times

3. **Visual Regression**:
   - Add screenshot tests
   - Test responsive layouts
   - Verify UI consistency

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [Codecov Dashboard](https://codecov.io/)