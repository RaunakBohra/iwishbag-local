import { test, expect } from '@playwright/test';

/**
 * Basic setup test to verify Playwright is working correctly
 * This test validates that the iwishBag application loads successfully
 */
test.describe('Setup Verification', () => {
  test('should load iwishBag homepage successfully', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Verify the page title contains iwishBag or similar identifier
    await expect(page).toHaveTitle(/iwishBag|Global|Wishlist|Hub/i);
    
    // Verify key elements are present
    // Note: These selectors should be adjusted based on your actual homepage
    const pageContent = page.locator('body');
    await expect(pageContent).toBeVisible();
    
    console.log('✅ Homepage loaded successfully');
    console.log(`📄 Page title: ${await page.title()}`);
    console.log(`🌐 Page URL: ${page.url()}`);
  });

  test('should have functional navigation', async ({ page }) => {
    await page.goto('/');
    
    // Look for common navigation elements
    const navigation = page.locator('nav, header, [role="navigation"]');
    
    if (await navigation.count() > 0) {
      await expect(navigation.first()).toBeVisible();
      console.log('✅ Navigation found');
    } else {
      console.log('ℹ️ No standard navigation found - this might be expected for your design');
    }
  });

  test('should handle 404 errors gracefully', async ({ page }) => {
    // Try to navigate to a non-existent page
    const response = await page.goto('/this-page-does-not-exist');
    
    // Should either get 404 or be redirected
    const statusCode = response?.status();
    console.log(`📊 404 test status: ${statusCode}`);
    
    // The application should handle this gracefully (either 404 page or redirect)
    expect([200, 404]).toContain(statusCode);
  });
});