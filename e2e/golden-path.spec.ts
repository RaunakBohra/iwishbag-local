import { test, expect } from '@playwright/test';

/**
 * Golden Path E2E Test for iwishBag
 * 
 * This test validates the core user journey:
 * 1. User logs in
 * 2. Views an approved quote
 * 3. Adds quote to cart
 * 4. Proceeds through checkout
 * 5. Completes payment simulation
 * 6. Receives order confirmation
 * 
 * This is the most critical flow for iwishBag's business success.
 */
test.describe('Golden Path: Quote to Purchase', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the homepage
    await page.goto('/');
  });

  test('Complete quote-to-purchase journey', async ({ page }) => {
    // ============================================================================
    // STEP 1: User Authentication
    // ============================================================================
    
    // Navigate to login page
    await page.getByRole('link', { name: /sign in|login/i }).click();
    
    // Fill in login credentials
    // Note: We'll need test user credentials for this
    await page.getByLabel(/email/i).fill('test@iwishbag.com');
    await page.getByLabel(/password/i).fill('testpassword123');
    
    // Submit login form
    await page.getByRole('button', { name: /sign in|login/i }).click();
    
    // Verify successful login by checking for user dashboard or profile element
    await expect(page.getByText(/dashboard|my account|my quotes/i)).toBeVisible();

    // ============================================================================
    // STEP 2: Navigate to Approved Quote
    // ============================================================================
    
    // Go to quotes/dashboard page
    await page.getByRole('link', { name: /my quotes|dashboard/i }).click();
    
    // Look for an approved quote in the list
    // We'll target the first approved quote we find
    const approvedQuote = page.locator('[data-testid="quote-card"]')
      .filter({ hasText: /approved/i })
      .first();
    
    await expect(approvedQuote).toBeVisible();
    
    // Click on the approved quote to view details
    await approvedQuote.click();

    // ============================================================================
    // STEP 3: Add Quote to Cart
    // ============================================================================
    
    // Verify we're on the quote details page
    await expect(page.getByText(/quote details|quote breakdown/i)).toBeVisible();
    
    // Look for the "Add to Cart" button
    const addToCartButton = page.getByRole('button', { name: /add to cart/i });
    await expect(addToCartButton).toBeVisible();
    
    // Click add to cart
    await addToCartButton.click();
    
    // Verify success message or cart update
    await expect(page.getByText(/added to cart|item added/i)).toBeVisible();
    
    // Verify cart icon shows updated count
    const cartIcon = page.locator('[data-testid="cart-icon"]');
    await expect(cartIcon).toContainText('1');

    // ============================================================================
    // STEP 4: Proceed to Cart and Checkout
    // ============================================================================
    
    // Click on cart icon to view cart
    await cartIcon.click();
    
    // Verify cart contains our quote
    await expect(page.getByText(/shopping cart|cart items/i)).toBeVisible();
    await expect(page.locator('[data-testid="cart-item"]')).toHaveCount(1);
    
    // Proceed to checkout
    const checkoutButton = page.getByRole('button', { name: /checkout|proceed to checkout/i });
    await expect(checkoutButton).toBeVisible();
    await checkoutButton.click();

    // ============================================================================
    // STEP 5: Checkout Process
    // ============================================================================
    
    // Verify we're on checkout page
    await expect(page.getByText(/checkout|order summary/i)).toBeVisible();
    
    // Verify shipping address is populated (should be from user profile)
    await expect(page.getByText(/shipping address|delivery address/i)).toBeVisible();
    
    // Verify order total is displayed
    const orderTotal = page.locator('[data-testid="order-total"]');
    await expect(orderTotal).toBeVisible();
    
    // Select payment method
    const paymentMethod = page.locator('input[name="payment-method"]').first();
    await paymentMethod.check();

    // ============================================================================
    // STEP 6: Payment Simulation
    // ============================================================================
    
    // Click "Place Order" or "Pay Now" button
    const placeOrderButton = page.getByRole('button', { name: /place order|pay now|confirm payment/i });
    await expect(placeOrderButton).toBeVisible();
    await placeOrderButton.click();
    
    // For testing purposes, we'll simulate payment success
    // In a real scenario, this would redirect to PayU/Stripe and back
    // We'll check for either payment gateway redirect OR success page
    
    // Option 1: If redirected to payment gateway (mock or real)
    const isPaymentGateway = await page.locator('body').textContent().then(text => 
      text?.includes('PayU') || text?.includes('Stripe') || text?.includes('Payment Gateway')
    );
    
    if (isPaymentGateway) {
      // Handle payment gateway simulation
      // This would depend on your payment gateway test setup
      await page.getByRole('button', { name: /pay|confirm|complete payment/i }).click();
    }

    // ============================================================================
    // STEP 7: Order Confirmation
    // ============================================================================
    
    // Verify order success page
    await expect(page.getByText(/order confirmed|payment successful|thank you/i)).toBeVisible();
    
    // Verify order ID or tracking information is displayed
    await expect(page.locator('[data-testid="order-id"], [data-testid="tracking-id"]')).toBeVisible();
    
    // Verify order status is reflected in user account
    await page.getByRole('link', { name: /my orders|order history/i }).click();
    await expect(page.locator('[data-testid="order-item"]').first()).toBeVisible();
  });

  // ============================================================================
  // Additional Golden Path Variations
  // ============================================================================
  
  test('Guest user can view quotes but cannot add to cart', async ({ page }) => {
    // Navigate to a public quote link (if such functionality exists)
    // This tests that non-authenticated users are properly handled
    
    await page.goto('/'); // Start from homepage without logging in
    
    // Try to access quotes page
    await page.goto('/quotes'); // This should redirect to login or show empty state
    
    // Verify that user is either redirected to login or sees appropriate message
    const isLoginPage = await page.locator('input[type="email"]').isVisible();
    const isEmptyState = await page.getByText(/no quotes|please log in/i).isVisible();
    
    expect(isLoginPage || isEmptyState).toBeTruthy();
  });
  
  test('Cart persists across browser sessions', async ({ page, context }) => {
    // This test would verify that cart items are saved when user logs back in
    // Implementation depends on how cart persistence is handled in iwishBag
    
    // Login and add item to cart (shortened version of main test)
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('test@iwishbag.com');
    await page.getByLabel(/password/i).fill('testpassword123');
    await page.getByRole('button', { name: /sign in|login/i }).click();
    
    // Navigate to quote and add to cart
    await page.goto('/quotes');
    const approvedQuote = page.locator('[data-testid="quote-card"]').filter({ hasText: /approved/i }).first();
    await approvedQuote.click();
    await page.getByRole('button', { name: /add to cart/i }).click();
    
    // Verify cart has item
    const cartIcon = page.locator('[data-testid="cart-icon"]');
    await expect(cartIcon).toContainText('1');
    
    // Create new browser context (simulates closing and reopening browser)
    const newContext = await context.browser()?.newContext();
    const newPage = await newContext?.newPage();
    
    if (newPage) {
      // Login again in new session
      await newPage.goto('/login');
      await newPage.getByLabel(/email/i).fill('test@iwishbag.com');
      await newPage.getByLabel(/password/i).fill('testpassword123');
      await newPage.getByRole('button', { name: /sign in|login/i }).click();
      
      // Check if cart still has the item
      const newCartIcon = newPage.locator('[data-testid="cart-icon"]');
      await expect(newCartIcon).toContainText('1');
      
      await newContext?.close();
    }
  });
});