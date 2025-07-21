# iwishBag E2E Testing with Playwright

This directory contains End-to-End (E2E) tests for the iwishBag application using Playwright.

## 🎯 **What We're Testing**

Our E2E tests validate the **complete user journey** from quote request to order completion, ensuring that all systems work together correctly:

- ✅ User authentication flow
- ✅ Quote viewing and management
- ✅ Shopping cart functionality  
- ✅ Checkout process
- ✅ Payment simulation
- ✅ Order confirmation and tracking

## 📁 **Test Structure**

```
e2e/
├── README.md                    # This file
├── golden-path.spec.ts         # Core user journey test
├── helpers/
│   ├── auth.ts                 # Authentication utilities
│   └── cart.ts                 # Shopping cart utilities
└── setup/
    └── test-data.ts            # Test data management
```

## 🚀 **Running E2E Tests**

### Prerequisites

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Ensure test data exists:**
   - Test user: `test.customer@iwishbag.com` / `TestPassword123!`
   - At least one approved quote in the database

### Running Tests

```bash
# Run all E2E tests (headless)
npm run e2e

# Run tests with UI (visual mode)
npm run e2e:ui

# Run tests with browser visible (headed mode)  
npm run e2e:headed

# Debug tests step-by-step
npm run e2e:debug

# View test report after running
npm run e2e:report
```

## 🧪 **Test Scenarios**

### Golden Path Test
**File:** `golden-path.spec.ts`

**Scenario:** Complete quote-to-purchase journey
1. User logs in with valid credentials
2. Navigates to approved quote
3. Adds quote to shopping cart
4. Proceeds through checkout
5. Completes payment simulation
6. Receives order confirmation

**Why this matters:** This validates iwishBag's core business value - that customers can actually purchase items through the platform.

### Additional Test Cases
- **Guest user restrictions** - Ensures unauthenticated users cannot add items to cart
- **Cart persistence** - Verifies cart items are saved across browser sessions
- **Mobile responsiveness** - Tests work on mobile devices

## 🔧 **Test Configuration**

### Browser Support
Tests run on multiple browsers for comprehensive coverage:
- ✅ Chromium (Chrome)
- ✅ Firefox  
- ✅ WebKit (Safari)
- ✅ Mobile Chrome (Pixel 5)
- ✅ Mobile Safari (iPhone 12)

### Test Environment
- **Base URL:** `http://localhost:5173`
- **Auto-start:** Development server starts automatically
- **Screenshots:** Captured on failure
- **Videos:** Recorded for failed tests
- **Traces:** Available for debugging

## 📊 **Test Data Management**

### Test Users
```typescript
// Customer account
email: 'test.customer@iwishbag.com'
password: 'TestPassword123!'

// Admin account  
email: 'test.admin@iwishbag.com'
password: 'AdminPassword123!'
```

### Creating Test Data
```typescript
import { setupGoldenPathTestData } from './setup/test-data';

// Creates test user and approved quote
const { userId, quoteId } = await setupGoldenPathTestData();
```

## 🔍 **Debugging Failed Tests**

### 1. View Test Report
```bash
npm run e2e:report
```

### 2. Run in Debug Mode
```bash
npm run e2e:debug
```

### 3. Check Screenshots/Videos
Failed tests automatically capture:
- Screenshots at failure point
- Screen recordings of the session
- Network request traces

### 4. Common Issues
- **Element not found:** Page might not have loaded completely
- **Timeout errors:** Increase timeout or check for loading states
- **Authentication issues:** Verify test user credentials exist
- **Database state:** Ensure test data is properly set up

## 🚀 **CI/CD Integration**

### GitHub Actions
E2E tests run automatically on:
- Pull requests to `main` branch
- Pushes to `main` branch  
- Manual workflow dispatch

### Test Environment Setup
```yaml
# .github/workflows/e2e.yml
- name: Run Playwright tests
  run: npm run e2e
  
- name: Upload test results
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## 🎯 **Best Practices**

### Writing New Tests
1. **Use descriptive test names** that explain the business scenario
2. **Follow the AAA pattern**: Arrange, Act, Assert
3. **Use helper functions** for common operations (login, add to cart, etc.)
4. **Wait for elements** properly using `expect().toBeVisible()`
5. **Clean up test data** after tests complete

### Test Reliability
1. **Use data attributes** (`data-testid`) for stable selectors
2. **Avoid timing-dependent assertions** - use `waitFor` instead of `setTimeout`
3. **Test the happy path first** before edge cases
4. **Keep tests independent** - each test should work alone

### Performance
1. **Run critical tests first** (Golden Path has highest priority)
2. **Use parallel execution** where possible
3. **Minimize test data setup** - reuse data when safe
4. **Clean up after tests** to prevent database bloat

## 📈 **Next Steps**

### Planned Enhancements
1. **Additional User Journeys**
   - Admin quote management workflow
   - Customer support chat flow
   - Multi-currency checkout

2. **Performance Testing**
   - Load testing with multiple concurrent users
   - Payment gateway stress testing

3. **Advanced Scenarios**  
   - Failed payment recovery
   - Inventory shortage handling
   - International shipping variations

### Integration Opportunities
1. **Visual Regression Testing** - Detect unintended UI changes
2. **API Testing** - Validate backend endpoints independently  
3. **Mobile App Testing** - When mobile app is developed
4. **Accessibility Testing** - Ensure compliance with WCAG guidelines

## 🤝 **Contributing**

When adding new E2E tests:
1. Place test files in appropriate subdirectories
2. Use existing helpers where possible
3. Update this README with new test scenarios
4. Ensure tests pass in CI/CD environment
5. Add appropriate test data cleanup

---

**🎉 The E2E test suite provides confidence that iwishBag delivers real value to users end-to-end!**