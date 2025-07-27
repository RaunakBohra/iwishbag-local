import { test, expect } from '@playwright/test';

// Test configuration
test.describe.configure({ mode: 'serial' });

// Helper to login
async function loginAsCustomer(page: any, email: string, password: string) {
  await page.goto('/auth');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
}

// Helper to login as admin
async function loginAsAdmin(page: any) {
  await loginAsCustomer(page, 'admin@iwishbag.com', 'admin-password');
  await page.waitForURL('/admin');
}

test.describe('Customer Quote Flow', () => {
  test('should create a quote request successfully', async ({ page }) => {
    await page.goto('/quote');
    
    // Fill quote form
    await page.fill('input[name="product_name"]', 'iPhone 15 Pro');
    await page.fill('input[name="link"]', 'https://www.apple.com/iphone-15-pro/');
    await page.fill('input[name="quantity"]', '1');
    await page.fill('input[name="price"]', '999');
    
    // Select country
    await page.selectOption('select[name="country"]', 'US');
    
    // Add to quote
    await page.click('button:has-text("Add Item")');
    
    // Verify item added
    await expect(page.locator('.quote-item')).toContainText('iPhone 15 Pro');
    
    // Submit quote
    await page.fill('input[name="customer_name"]', 'John Doe');
    await page.fill('input[name="customer_email"]', 'john@example.com');
    await page.fill('input[name="customer_phone"]', '+1234567890');
    
    await page.click('button:has-text("Submit Quote")');
    
    // Verify success
    await expect(page.locator('.toast-success')).toBeVisible();
    await expect(page).toHaveURL(/\/quote\/[a-zA-Z0-9-]+/);
  });

  test('should track quote status', async ({ page }) => {
    // Use existing quote ID
    const quoteId = 'test-quote-123';
    await page.goto(`/quote/${quoteId}`);
    
    // Check quote details
    await expect(page.locator('h1')).toContainText('Quote Details');
    await expect(page.locator('.status-badge')).toBeVisible();
    
    // Verify timeline
    await expect(page.locator('.timeline')).toBeVisible();
    await expect(page.locator('.timeline-item').first()).toContainText('Quote Created');
  });
});

test.describe('Admin Quote Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should approve a quote', async ({ page }) => {
    await page.goto('/admin/quotes');
    
    // Find pending quote
    const quoteRow = page.locator('tr:has-text("pending")').first();
    await quoteRow.click();
    
    // Review quote details
    await expect(page.locator('h1')).toContainText('Quote Details');
    
    // Add admin notes
    await page.fill('textarea[name="admin_notes"]', 'Quote looks good, approving');
    
    // Approve quote
    await page.click('button:has-text("Approve Quote")');
    
    // Confirm dialog
    await page.click('button:has-text("Confirm")');
    
    // Verify status change
    await expect(page.locator('.status-badge')).toContainText('Approved');
    await expect(page.locator('.toast-success')).toContainText('Quote approved');
  });

  test('should send quote to customer', async ({ page }) => {
    await page.goto('/admin/quotes');
    
    // Find approved quote
    const quoteRow = page.locator('tr:has-text("approved")').first();
    await quoteRow.click();
    
    // Click send button
    await page.click('button:has-text("Send to Customer")');
    
    // Verify email preview
    await expect(page.locator('.email-preview')).toBeVisible();
    
    // Send email
    await page.click('button:has-text("Send Email")');
    
    // Verify success
    await expect(page.locator('.toast-success')).toContainText('Quote sent');
    await expect(page.locator('.status-badge')).toContainText('Sent');
  });
});

test.describe('Payment Flow', () => {
  test('should complete payment successfully', async ({ page }) => {
    // Navigate to approved quote
    const quoteId = 'approved-quote-123';
    await page.goto(`/quote/${quoteId}`);
    
    // Click pay now
    await page.click('button:has-text("Pay Now")');
    
    // Verify checkout page
    await expect(page).toHaveURL('/checkout');
    await expect(page.locator('.order-summary')).toBeVisible();
    
    // Fill payment details (for test gateway)
    await page.fill('input[name="card_number"]', '4111111111111111');
    await page.fill('input[name="card_expiry"]', '12/25');
    await page.fill('input[name="card_cvc"]', '123');
    
    // Complete payment
    await page.click('button:has-text("Complete Payment")');
    
    // Wait for redirect
    await page.waitForURL('/payment-success');
    
    // Verify success page
    await expect(page.locator('h1')).toContainText('Payment Successful');
    await expect(page.locator('.order-id')).toBeVisible();
  });

  test('should handle payment failure', async ({ page }) => {
    const quoteId = 'approved-quote-456';
    await page.goto(`/quote/${quoteId}`);
    
    await page.click('button:has-text("Pay Now")');
    
    // Use failing card number
    await page.fill('input[name="card_number"]', '4000000000000002');
    await page.fill('input[name="card_expiry"]', '12/25');
    await page.fill('input[name="card_cvc"]', '123');
    
    await page.click('button:has-text("Complete Payment")');
    
    // Verify error handling
    await expect(page.locator('.error-message')).toContainText('Payment failed');
    await expect(page).toHaveURL('/checkout'); // Stays on checkout
  });
});

test.describe('Cart Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCustomer(page, 'customer@example.com', 'password');
  });

  test('should add approved quotes to cart', async ({ page }) => {
    await page.goto('/dashboard/quotes');
    
    // Find approved quote
    const approvedQuote = page.locator('.quote-card:has-text("Approved")').first();
    await approvedQuote.locator('button:has-text("Add to Cart")').click();
    
    // Verify cart badge
    await expect(page.locator('.cart-badge')).toContainText('1');
    
    // Go to cart
    await page.click('button[aria-label="Cart"]');
    
    // Verify cart contents
    await expect(page.locator('.cart-item')).toHaveCount(1);
    await expect(page.locator('.cart-total')).toBeVisible();
  });

  test('should checkout multiple quotes', async ({ page }) => {
    // Add multiple quotes to cart
    await page.goto('/cart');
    
    // Verify multiple items
    const cartItems = page.locator('.cart-item');
    await expect(cartItems).toHaveCount(2);
    
    // Proceed to checkout
    await page.click('button:has-text("Proceed to Checkout")');
    
    // Verify combined checkout
    await expect(page.locator('.order-summary')).toBeVisible();
    await expect(page.locator('.order-item')).toHaveCount(2);
  });
});

test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should navigate mobile menu', async ({ page }) => {
    await page.goto('/');
    
    // Open mobile menu
    await page.click('button[aria-label="Menu"]');
    
    // Verify menu items
    await expect(page.locator('.mobile-menu')).toBeVisible();
    await expect(page.locator('a:has-text("Get Quote")')).toBeVisible();
    
    // Navigate to quote
    await page.click('a:has-text("Get Quote")');
    await expect(page).toHaveURL('/quote');
  });

  test('should complete quote on mobile', async ({ page }) => {
    await page.goto('/quote');
    
    // Verify mobile-optimized form
    await expect(page.locator('.quote-form')).toBeVisible();
    
    // Fill form on mobile
    await page.fill('input[name="product_name"]', 'Test Product');
    await page.fill('input[name="link"]', 'https://example.com');
    
    // Scroll to submit (mobile consideration)
    await page.locator('button:has-text("Submit")').scrollIntoViewIfNeeded();
    await page.click('button:has-text("Submit")');
  });
});

test.describe('Security Tests', () => {
  test('should prevent XSS attacks', async ({ page }) => {
    await page.goto('/quote');
    
    // Try XSS in product name
    const xssPayload = '<script>alert("XSS")</script>';
    await page.fill('input[name="product_name"]', xssPayload);
    await page.fill('input[name="link"]', 'https://example.com');
    
    // Submit and verify sanitization
    await page.click('button:has-text("Add Item")');
    
    // Check that script is not executed
    const itemText = await page.locator('.quote-item').textContent();
    expect(itemText).not.toContain('<script>');
    expect(itemText).toContain('&lt;script&gt;'); // Should be escaped
  });

  test('should enforce authentication', async ({ page }) => {
    // Try to access protected route
    await page.goto('/dashboard');
    
    // Should redirect to auth
    await expect(page).toHaveURL('/auth');
    await expect(page.locator('h1')).toContainText('Sign In');
  });

  test('should enforce admin permissions', async ({ page }) => {
    // Login as regular user
    await loginAsCustomer(page, 'user@example.com', 'password');
    
    // Try to access admin area
    await page.goto('/admin');
    
    // Should show forbidden or redirect
    await expect(page).not.toHaveURL('/admin');
  });
});